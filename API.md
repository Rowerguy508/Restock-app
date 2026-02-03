# Poniente API Documentation

## Base URL

```
https://api-gilt-xi-28.vercel.app
```

## Endpoints

### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-03T20:00:00.000Z",
  "service": "restocka-api",
  "supabase_configured": false,
  "stripe_configured": false
}
```

### Plans

```http
GET /api/plans
```

Response:
```json
{
  "success": true,
  "plans": [
    {
      "id": "FREE",
      "name": "Free",
      "price_monthly": 0,
      "max_locations": 1,
      "max_products": 5,
      "price_id": null
    },
    {
      "id": "PRO",
      "name": "Pro",
      "price_monthly": 2900,
      "max_locations": 3,
      "max_products": 50,
      "price_id": "price_pro_xxx"
    },
    {
      "id": "BUSINESS",
      "name": "Business",
      "price_monthly": 7900,
      "max_locations": -1,
      "max_products": -1,
      "price_id": "price_business_xxx"
    }
  ]
}
```

### Signup

```http
POST /api/signup
Content-Type: application/json

{
  "email": "restaurant@example.com",
  "organizationName": "My Restaurant",
  "plan": "PRO"
}
```

Response:
```json
{
  "success": true,
  "organization": {
    "id": "org_xxx",
    "name": "My Restaurant",
    "plan": "PRO",
    "trial_ends_at": "2026-02-10T20:00:00.000Z"
  },
  "message": "Demo mode - configure Supabase"
}
```

### Features

```http
GET /api/features/:orgId/:feature
```

Examples:
```
GET /api/features/org_123/locations
GET /api/features/org_123/products
GET /api/features/org_123/analytics
GET /api/features/org_123/api
```

Response:
```json
{
  "success": true,
  "feature": {
    "name": "locations",
    "has_access": true,
    "current": 1,
    "max": 3,
    "tier": "PRO"
  }
}
```

### Subscription

```http
GET /api/subscription/:orgId
```

Response:
```json
{
  "success": true,
  "subscription": {
    "status": "ACTIVE",
    "tier": "PRO",
    "current_period_end": "2026-03-03T20:00:00.000Z"
  }
}
```

### Create Checkout

```http
POST /api/create-checkout
Content-Type: application/json

{
  "orgId": "org_xxx",
  "planId": "PRO",
  "email": "restaurant@example.com"
}
```

Response:
```json
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_xxx"
}
```

### Cancel Subscription

```http
POST /api/cancel-subscription
Content-Type: application/json

{
  "subscriptionId": "sub_xxx"
}
```

Response:
```json
{
  "success": true,
  "message": "Subscription will cancel at period end"
}
```

### Webhook

```http
POST /api/webhook
Stripe-Signature: sig_xxx
Content-Type: application/json

{
  "type": "checkout.session.completed",
  "data": { ... }
}
```

### Analytics

```http
POST /api/analytics
Content-Type: application/json

{
  "event": "pageview",
  "data": {
    "page": "pricing",
    "referrer": "google"
  }
}
```

Response:
```json
{
  "success": true
}
```

### Debug

```http
GET /api/debug
```

Shows which integrations are configured.

## Error Responses

```json
{
  "error": "Error message here"
}
```

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 500 | Server Error |

---

*Generated 2026-02-03*
