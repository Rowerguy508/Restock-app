// Vercel Serverless Entry Point
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'restocka-api'
  });
});

app.get('/api/plans', (req, res) => {
  res.json({
    success: true,
    plans: [
      { id: 'FREE', name: 'Free', price_monthly: 0, max_locations: 1, max_products: 5 },
      { id: 'PRO', name: 'Pro', price_monthly: 2900, max_locations: 3, max_products: 50 },
      { id: 'BUSINESS', name: 'Business', price_monthly: 7900, max_locations: -1, max_products: -1 }
    ]
  });
});

app.post('/api/signup', (req, res) => {
  const { email, organizationName, plan } = req.body;
  res.json({
    success: true,
    organization: {
      id: 'org_' + Date.now(),
      name: organizationName,
      plan: plan || 'PRO',
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    message: 'Demo mode - configure Supabase for production'
  });
});

app.get('/api/features/:orgId/:feature', (req, res) => {
  res.json({ success: true, feature: { name: req.params.feature, has_access: true, tier: 'PRO' } });
});

app.post('/api/create-checkout', (req, res) => {
  res.json({ success: true, checkoutUrl: 'https://checkout.stripe.com/c/pay/demo' });
});

app.post('/api/analytics', (req, res) => {
  console.log('Analytics:', req.body);
  res.json({ success: true });
});

module.exports = app;
