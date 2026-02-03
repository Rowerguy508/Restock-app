// Vercel Serverless Entry Point
const express = require('express');
const cors = require('cors');

// Initialize Stripe conditionally (only if keys exist)
let stripe = null;
try {
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_live')) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
} catch (e) {
  console.log('Stripe not configured - running in demo mode');
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
    stripe_configured: !!stripe
  });
});

app.get('/api/plans', (req, res) => {
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
  const { email, organizationName, plan } = req.body;
  
  // Demo mode response
  res.json({
    success: true,
    organization: {
      id: 'org_' + Date.now(),
      name: organizationName,
      plan: plan || 'PRO',
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    message: stripe ? 'Production mode' : 'Demo mode - configure Stripe for payments'
  });
});

app.get('/api/features/:orgId/:feature', (req, res) => {
  res.json({ 
    success: true, 
    feature: { 
      name: req.params.feature, 
      has_access: true, 
      tier: 'PRO',
      configured: !!stripe 
    } 
  });
});

app.post('/api/create-checkout', async (req, res) => {
  const { orgId, planId, email, successUrl, cancelUrl } = req.body;
  
  if (!stripe) {
    // Demo mode
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
    
    // Handle events
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Checkout completed:', session.id);
        // Update organization subscription in database
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id);
        // Update subscription status
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
    return res.json({ success: true, demo: true, message: 'Configure Stripe for real cancellations' });
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

app.get('/api/subscription/:orgId', async (req, res) => {
  // Would fetch from database in production
  res.json({
    success: true,
    subscription: {
      status: 'ACTIVE',
      tier: 'PRO',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  });
});

app.post('/api/analytics', (req, res) => {
  console.log('Analytics:', req.body);
  res.json({ success: true });
});

module.exports = app;
