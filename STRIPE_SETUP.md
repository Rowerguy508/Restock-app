# Restocka Stripe Integration Setup

## Get Stripe API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy **Publishable Key** (pk_live_...) and **Secret Key** (sk_live_...)
3. Add to Vercel environment variables:
   ```
   STRIPE_PUBLISHABLE_KEY=pk_live_xxx
   STRIPE_SECRET_KEY=sk_live_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

## Create Products & Prices (via Stripe Dashboard)

### Product 1: PRO
- Name: "Restocka Pro"
- Price: $29.00/month
- Interval: Monthly
- Get `price_PRO_ID` from the price URL

### Product 2: BUSINESS  
- Name: "Restocka Business"
- Price: $79.00/month
- Interval: Monthly
- Get `price_BUSINESS_ID` from the price URL

## Set Up Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://api-gilt-xi-28.vercel.app/api/webhook`
3. Listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy signing secret (whsec_xxx) to environment

## Environment Variables Needed

```bash
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_BUSINESS_PRICE_ID=price_xxx
STRIPE_SUCCESS_URL=https://login.restocka.app/success
STRIPE_CANCEL_URL=https://login.restocka.app/pricing
```

## Vercel Setup

```bash
vercel env add STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add STRIPE_PRO_PRICE_ID production
vercel env add STRIPE_BUSINESS_PRICE_ID production
vercel env add STRIPE_SUCCESS_URL production
vercel env add STRIPE_CANCEL_URL production
```

## Test Mode (Optional)

For testing, use test keys (sk_test_xxx) and set up test prices in Stripe's test mode.

## Verify Setup

After adding keys, update the API to use real Stripe SDK:

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create checkout session
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{
    price: priceId,
    quantity: 1,
  }],
  success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: cancelUrl,
  customer_email: email,
  metadata: { organizationId: orgId }
});
```
