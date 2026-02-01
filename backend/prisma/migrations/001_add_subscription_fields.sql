-- ============================================
// RESTOCKA SUBSCRIPTION MIGRATION
-- ============================================
// Run this SQL to add subscription fields to the organization table
-- After running, regenerate the Prisma client: npx prisma generate
-- ============================================

-- Add subscription columns to organization table
ALTER TABLE organization ADD COLUMN subscriptionStatus TEXT DEFAULT 'TRIAL';
ALTER TABLE organization ADD COLUMN subscriptionTier TEXT DEFAULT 'PRO';
ALTER TABLE organization ADD COLUMN trialStartDate DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE organization ADD COLUMN trialEndDate DATETIME;
ALTER TABLE organization ADD COLUMN subscriptionStartDate DATETIME;
ALTER TABLE organization ADD COLUMN subscriptionEndDate DATETIME;
ALTER TABLE organization ADD COLUMN stripeCustomerId TEXT;
ALTER TABLE organization ADD COLUMN stripeSubscriptionId TEXT;
ALTER TABLE organization ADD COLUMN ordersThisMonth INTEGER DEFAULT 0;
ALTER TABLE organization ADD COLUMN locationsCount INTEGER DEFAULT 1;
ALTER TABLE organization ADD COLUMN productsCount INTEGER DEFAULT 0;

-- Update existing organizations to have trial dates
UPDATE organization 
SET trialEndDate = datetime('now', '+7 days')
WHERE trialEndDate IS NULL;

-- Set all existing organizations to PRO tier with TRIAL status
UPDATE organization 
SET subscriptionStatus = 'TRIAL',
    subscriptionTier = 'PRO',
    trialStartDate = CURRENT_TIMESTAMP,
    trialEndDate = datetime('now', '+7 days')
WHERE subscriptionStatus IS NULL OR subscriptionStatus = '';

-- ============================================
// ROLLBACK (if needed)
// ============================================
// ALTER TABLE organization DROP COLUMN subscriptionStatus;
// ALTER TABLE organization DROP COLUMN subscriptionTier;
// ALTER TABLE organization DROP COLUMN trialStartDate;
// ALTER TABLE organization DROP COLUMN trialEndDate;
// ALTER TABLE organization DROP COLUMN subscriptionStartDate;
// ALTER TABLE organization DROP COLUMN subscriptionEndDate;
// ALTER TABLE organization DROP COLUMN stripeCustomerId;
// ALTER TABLE organization DROP COLUMN stripeSubscriptionId;
// ALTER TABLE organization DROP COLUMN ordersThisMonth;
// ALTER TABLE organization DROP COLUMN locationsCount;
// ALTER TABLE organization DROP COLUMN productsCount;
