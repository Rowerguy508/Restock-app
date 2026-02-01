# Deployment Checklist - Restocka with Stripe

## Changes Deployed (Feb 1, 2026)
- ✅ Added Stripe integration (`backend/src/stripe.ts`)
- ✅ Added checkout/portal endpoints to subscription routes
- ✅ Removed RevenueCat packages
- ✅ Created `.env.example` with Stripe keys
- ✅ Added AI features (forecasting, waste insights, cost optimization)
- ✅ Added mobile hamburger menu to landing page
- ✅ All 4 subdomains live (landing/signup/app/login)

## Pending (Feb 1, 2026)
- ⏳ Vibecode server SSH unreachable (port 2222 timeout)
- ⏳ Backend deployment pending: `git pull && npm install stripe`
- ⏳ Frontend needs deployment to restocka.app

## To Deploy to Vibecode

### Option 1: Git Pull (Recommended)
```bash
ssh -p 2222 vibecode@20.112.80.80
cd workspace
git pull origin main
cd backend
npm install stripe
# Restart the server
```

### Option 2: Manual File Copy
Copy these files to Vibecode:
- `backend/src/stripe.ts`
- `backend/src/routes/subscription.ts`
- `backend/.env.example` → `.env` (with your Stripe keys)

## Stripe Setup (Required)

### 1. Get Stripe Keys
1. Go to https://dashboard.stripe.com
2. Get your **Secret Key** (starts with `sk_test_`)
3. Get your **Webhook Secret** (after creating webhook)

### 2. Create Products/Prices
```bash
# Using Stripe CLI or Dashboard:
# Create PRO product → $29/month price
# Create BUSINESS product → $79/month price
# Get the price IDs and add to .env:
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_BUSINESS_PRICE_ID=price_xxx
```

### 3. Set Up Webhook
```
URL: https://your-domain.com/api/subscription/webhook
Events:
- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted
- invoice.paid
- invoice.payment_failed
```

### 4. Add Keys to .env on Vibecode
```
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_PRICE_ID=price_pro_monthly
STRIPE_BUSINESS_PRICE_ID=price_business_monthly
```

## Test Flow
1. User clicks "Upgrade" in app
2. → POST /api/subscription/checkout (tier: "PRO")
3. → Redirects to Stripe Checkout
4. User pays
5. → Stripe sends webhook
6. → Subscription activated

## If SSH is Slow
Try: `ssh -p 2222 vibecode@20.112.80.80 -o "ServerAliveInterval 60"`
