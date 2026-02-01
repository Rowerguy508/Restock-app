# Restocka Monetization Update

## Overview
This update adds subscription/monetization features to Restocka:
- 7-day free trial for all new organizations
- Three subscription tiers: FREE, PRO, BUSINESS
- Feature gating based on subscription tier
- Stripe integration placeholder

## Files Changed

### Backend
1. `backend/prisma/schema.prisma` - Added subscription fields to Organization model
2. `backend/src/subscription.ts` - Subscription configuration and helper functions
3. `backend/src/routes/subscription.ts` - API routes for subscription management
4. `backend/src/index.ts` - Mounted subscription routes
5. `backend/prisma/migrations/001_add_subscription_fields.sql` - Database migration

## Subscription Tiers

| Feature | FREE | PRO | BUSINESS |
|---------|------|-----|----------|
| Price | $0/forever | $29/month | $79/month |
| Locations | 1 | 3 | Unlimited |
| Products | 5 | 50 | Unlimited |
| Orders/month | 10 | 100 | Unlimited |
| Auto-reorder | Manual | Assisted | Full |
| Analytics | ❌ | Basic | Advanced |
| API Access | ❌ | ❌ | ✅ |
| Support | Email | Priority | 24/7 |

## Installation

### 1. Apply Database Migration
```bash
cd backend/prisma
sqlite3 dev.db < migrations/001_add_subscription_fields.sql
```

Or run the migration in Prisma:
```bash
cd backend
npx prisma migrate dev --name add_subscription_fields
```

### 2. Regenerate Prisma Client
```bash
cd backend
npx prisma generate
```

### 3. Restart the Server
```bash
bun run dev
```

## API Endpoints

### GET /api/subscription/status?orgId=xxx
Get subscription status for an organization.

Response:
```json
{
  "status": "TRIAL",
  "tier": "PRO",
  "daysRemaining": 5,
  "isActive": true
}
```

### GET /api/subscription/plans
Get available subscription plans.

### POST /api/subscription/upgrade
Upgrade to PRO or BUSINESS.
```json
{
  "organizationId": "xxx",
  "tier": "PRO"
}
```

### POST /api/subscription/cancel
Cancel active subscription.

### POST /api/subscription/check-feature
Check if a feature is accessible.
```json
{
  "organizationId": "xxx",
  "feature": "locations"
}
```

### GET /api/subscription/pricing
Get pricing page HTML.

## Frontend Integration

### Add Subscription Screen
Use the pricing page or create a subscription screen in the app:
- Link to `restocka://signup?plan=pro` for Pro
- Link to `restocka://signup?plan=business` for Business

### Check Feature Access
```typescript
import { useQuery } from '@tanstack/react-query';

function useSubscription(organizationId: string) {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', organizationId],
    queryFn: () => 
      fetch(`/api/subscription/status?orgId=${organizationId}`)
        .then(r => r.json()),
  });

  return { subscription, isLoading };
}
```

## Stripe Integration (Future)

To enable Stripe payments:

1. Create Stripe account and get API keys
2. Add keys to `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```
3. Implement checkout session creation in `/api/subscription/upgrade`
4. Handle webhooks in `/api/subscription/webhook`

## Testing

### Test with Free Tier
Create a new organization - automatically gets PRO trial.

### Test with Expired Trial
Manually set `trialEndDate` to a past date in the database.

### Test Feature Gating
Try to exceed limits (create more than 5 products on FREE tier) - should show upgrade prompt.

## Rollback

If you need to remove subscription features:

1. Run the rollback SQL in `migrations/001_add_subscription_fields.sql`
2. Remove subscription routes from `index.ts`
3. Delete `subscription.ts` and `routes/subscription.ts`
4. Regenerate Prisma client
