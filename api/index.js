// Vercel Serverless Entry Point - With Supabase Integration
const express = require('express');
const cors = require('cors');

// Initialize Supabase (only if keys exist)
let supabase = null;
let supabaseAdmin = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );
    supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('Supabase connected');
  } else {
    console.log('Supabase not configured - running in demo mode');
  }
} catch (e) {
  console.log('Supabase init error:', e.message);
}

// Initialize Stripe (only if keys exist)
let stripe = null;
try {
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_live')) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    console.log('Stripe connected');
  } else {
    console.log('Stripe not configured - running in demo mode');
  }
} catch (e) {
  console.log('Stripe init error:', e.message);
}

const app = express();
app.use(cors());
app.use(express.json());

// RAW body for webhook
app.use('/api/webhook', express.raw({ type: 'application/json' }));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'restocka-api',
    supabase_configured: !!supabase,
    stripe_configured: !!stripe
  });
});

app.get('/api/plans', async (req, res) => {
  if (supabase) {
    try {
      const { data: plans, error } = await supabase
        .from('plans')
        .select('*')
        .order('price_monthly');
      
      if (!error && plans) {
        return res.json({ success: true, plans });
      }
    } catch (e) {
      console.log('Plans fetch error:', e.message);
    }
  }
  
  // Fallback to hardcoded plans
  res.json({
    success: true,
    plans: [
      { id: 'FREE', name: 'Free', price_monthly: 0, max_locations: 1, max_products: 5, price_id: null },
      { id: 'PRO', name: 'Pro', price_monthly: 2900, max_locations: 3, max_products: 50, price_id: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_demo' },
      { id: 'BUSINESS', name: 'Business', price_monthly: 7900, max_locations: -1, max_products: -1, price_id: process.env.STRIPE_BUSINESS_PRICE_ID || 'price_business_demo' }
    ]
  });
});

app.post('/api/signup', async (req, res) => {
  const { email, organizationName, plan = 'PRO' } = req.body;
  
  if (!email || !organizationName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (supabase && supabaseAdmin) {
    try {
      // Create organization
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organization')
        .insert({
          name: organizationName,
          subscription_status: 'TRIAL',
          subscription_tier: plan,
          trial_start_date: new Date().toISOString(),
          trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          locations_count: 1,
          products_count: 0,
          orders_this_month: 0
        })
        .select()
        .single();
      
      if (orgError) throw orgError;
      
      // Create default location
      await supabaseAdmin.from('location').insert({
        organization_id: org.id,
        name: 'Main Branch',
        address: ''
      });
      
      // Log signup
      await supabaseAdmin.from('usage_logs').insert({
        organization_id: org.id,
        action_type: 'SIGNUP',
        resource_type: 'organization',
        metadata: { email, plan }
      });
      
      return res.json({
        success: true,
        organization: {
          id: org.id,
          name: org.name,
          plan: org.subscription_tier,
          trial_ends_at: org.trial_end_date
        },
        message: 'Organization created successfully!'
      });
    } catch (e) {
      console.log('Supabase signup error:', e.message);
      // Fallback to demo mode
    }
  }
  
  // Demo mode response
  res.json({
    success: true,
    organization: {
      id: 'org_' + Date.now(),
      name: organizationName,
      plan: plan,
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    message: supabase ? 'Production mode' : 'Demo mode - configure Supabase'
  });
});

app.get('/api/features/:orgId/:feature', async (req, res) => {
  const { orgId, feature } = req.params;
  
  if (supabase) {
    try {
      const { data: org, error } = await supabase
        .from('organization')
        .select('*')
        .eq('id', orgId)
        .single();
      
      if (!error && org) {
        const { data: plan } = await supabase
          .from('plans')
          .select('*')
          .eq('id', org.subscription_tier)
          .single();
        
        if (plan) {
          let hasAccess = false;
          if (feature === 'analytics') hasAccess = plan.has_analytics;
          else if (feature === 'api') hasAccess = plan.has_api;
          else if (feature === 'locations') hasAccess = org.locations_count < plan.max_locations || plan.max_locations === -1;
          else if (feature === 'products') hasAccess = org.products_count < plan.max_products || plan.max_products === -1;
          
          return res.json({
            success: true,
            feature: {
              name: feature,
              has_access: hasAccess,
              current: feature === 'locations' ? org.locations_count : org.products_count,
              max: feature === 'locations' ? plan.max_locations : plan.max_products,
              tier: plan.name
            }
          });
        }
      }
    } catch (e) {
      console.log('Feature check error:', e.message);
    }
  }
  
  // Demo mode
  res.json({
    success: true,
    feature: {
      name: feature,
      has_access: true,
      tier: 'PRO',
      demo: true
    }
  });
});

app.get('/api/subscription/:orgId', async (req, res) => {
  const { orgId } = req.params;
  
  if (supabase) {
    try {
      const { data: org, error } = await supabase
        .from('organization')
        .select('*, plans!inner(*)')
        .eq('id', orgId)
        .single();
      
      if (!error && org) {
        return res.json({
          success: true,
          subscription: {
            status: org.subscription_status,
            tier: org.subscription_tier,
            trial_ends_at: org.trial_end_date,
            current_period_end: org.subscription_end_date
          }
        });
      }
    } catch (e) {
      console.log('Subscription fetch error:', e.message);
    }
  }
  
  // Demo mode
  res.json({
    success: true,
    subscription: {
      status: 'ACTIVE',
      tier: 'PRO',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      demo: true
    }
  });
});

app.post('/api/create-checkout', async (req, res) => {
  const { orgId, planId, email, successUrl, cancelUrl } = req.body;
  
  if (!stripe) {
    return res.json({
      success: true,
      checkoutUrl: 'https://checkout.stripe.com/c/pay/demo',
      demo: true,
      message: 'Configure STRIPE_SECRET_KEY for real payments'
    });
  }
  
  try {
    const priceMap = {
      'PRO': process.env.STRIPE_PRO_PRICE_ID,
      'BUSINESS': process.env.STRIPE_BUSINESS_PRICE_ID
    };
    
    const priceId = priceMap[planId];
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      success_url: successUrl || process.env.STRIPE_SUCCESS_URL + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl || process.env.STRIPE_CANCEL_URL,
      customer_email: email,
      metadata: { organizationId: orgId }
    });
    
    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/webhook', async (req, res) => {
  if (!stripe) {
    return res.json({ received: true, demo: true });
  }
  
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Checkout completed:', session.id);
        if (supabase && session.metadata.organizationId) {
          await supabaseAdmin
            .from('organization')
            .update({
              subscription_status: 'ACTIVE',
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription
            })
            .eq('id', session.metadata.organizationId);
        }
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id);
        break;
    }
    
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.post('/api/cancel-subscription', async (req, res) => {
  const { subscriptionId } = req.body;
  
  if (!stripe) {
    return res.json({ success: true, demo: true });
  }
  
  try {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });
    res.json({ success: true, message: 'Subscription will cancel at period end' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/analytics', async (req, res) => {
  const { event, data } = req.body;
  console.log('Analytics:', event, data);
  
  if (supabase) {
    try {
      await supabase.from('analytics_events').insert({
        event_type: event,
        event_data: data,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.log('Analytics error:', e.message);
    }
  }
  
  res.json({ success: true });
});

// Debug endpoint - shows what's configured
app.get('/api/debug', (req, res) => {
  res.json({
    supabase: !!supabase,
    stripe: !!stripe,
    env: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_PRO_PRICE_ID: !!process.env.STRIPE_PRO_PRICE_ID,
      STRIPE_BUSINESS_PRICE_ID: !!process.env.STRIPE_BUSINESS_PRICE_ID
    }
  });
});

module.exports = app;
