-- Restocka Subscription Migration
-- Run this in Supabase SQL Editor to enable monetization

-- Add subscription fields to organization table
ALTER TABLE public.organization 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'TRIAL',
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'PRO',
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS orders_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locations_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS products_count INTEGER DEFAULT 0;

-- Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL,
  max_locations INTEGER NOT NULL,
  max_products INTEGER NOT NULL,
  orders_per_month INTEGER NOT NULL,
  automation_mode TEXT DEFAULT 'MANUAL',
  has_analytics BOOLEAN DEFAULT FALSE,
  has_api BOOLEAN DEFAULT FALSE,
  priority_support BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans
INSERT INTO public.plans (id, name, price_monthly, max_locations, max_products, orders_per_month, automation_mode, has_analytics, has_api, priority_support) VALUES
('FREE', 'Free', 0, 1, 5, 10, 'MANUAL', FALSE, FALSE, FALSE),
('PRO', 'Pro', 2900, 3, 50, 100, 'ASSISTED', TRUE, FALSE, TRUE),
('BUSINESS', 'Business', 7900, -1, -1, -1, 'AUTO', TRUE, TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  max_locations = EXCLUDED.max_locations,
  max_products = EXCLUDED.max_products,
  orders_per_month = EXCLUDED.orders_per_month,
  automation_mode = EXCLUDED.automation_mode,
  has_analytics = EXCLUDED.has_analytics,
  has_api = EXCLUDED.has_api,
  priority_support = EXCLUDED.priority_support;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organization(id),
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_logs table for tracking
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organization(id),
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to check feature access
CREATE OR REPLACE FUNCTION check_feature_access(
  org_id TEXT,
  feature_name TEXT
) RETURNS JSON AS $$
DECLARE
  org RECORD;
  plan RECORD;
  has_access BOOLEAN DEFAULT FALSE;
BEGIN
  SELECT * INTO org FROM public.organization WHERE id = org_id;
  SELECT * INTO plan FROM public.plans WHERE id = org.subscription_tier;
  
  -- Check based on feature
  IF feature_name = 'locations' THEN
    has_access := (org.locations_count < plan.max_locations) OR (plan.max_locations = -1);
  ELSIF feature_name = 'products' THEN
    has_access := (org.products_count < plan.max_products) OR (plan.max_products = -1);
  ELSIF feature_name = 'analytics' THEN
    has_access := plan.has_analytics;
  ELSIF feature_name = 'api' THEN
    has_access := plan.has_api;
  ELSIF feature_name = 'auto_reorder' THEN
    has_access := plan.automation_mode IN ('AUTO', 'ASSISTED');
  END IF;
  
  RETURN json_build_object(
    'has_access', has_access,
    'current_count', org.locations_count,
    'max_count', plan.max_locations,
    'tier', plan.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly orders
CREATE OR REPLACE FUNCTION reset_monthly_orders()
RETURNS VOID AS $$
BEGIN
  UPDATE public.organization SET orders_this_month = 0 
  WHERE EXTRACT(MONTH FROM NOW()) > EXTRACT(MONTH FROM updated_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE public.organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust as needed for your auth setup)
CREATE POLICY "Organizations are viewable by members" ON public.organization
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own organization" ON public.organization
  FOR UPDATE USING (auth.uid() IN (
    SELECT user_id FROM public.membership WHERE organization_id = public.organization.id
  ));

CREATE POLICY "Plans are publicly readable" ON public.plans
  FOR SELECT USING (true);

COMMENT ON COLUMN public.organization.subscription_status IS 'TRIAL, ACTIVE, EXPIRED, CANCELED';
COMMENT ON COLUMN public.organization.subscription_tier IS 'FREE, PRO, BUSINESS';
COMMENT ON COLUMN public.organization.stripe_customer_id IS 'Stripe customer ID for payments';
COMMENT ON COLUMN public.organization.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN public.organization.trial_end_date IS 'When the trial ends (7 days from signup by default)';
