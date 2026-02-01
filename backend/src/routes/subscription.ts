// ============================================
// RESTOCKA SUBSCRIPTION API ROUTES
// ============================================
// These routes handle subscription management
// ============================================

import { Hono } from "hono";
import {
  createOrganizationWithTrial,
  getOrganizationSubscription,
  upgradeSubscription,
  cancelSubscription,
  checkFeatureAccess,
  SUBSCRIPTION_TIERS,
  getPricingHTML,
} from "../subscription";

const app = new Hono();

// ============================================
// GET /api/subscription/status
// Get subscription status for an organization
// ============================================
app.get("/status", async (c) => {
  const organizationId = c.req.query("orgId");

  if (!organizationId) {
    return c.json({ error: "orgId is required" }, 400);
  }

  const subscription = await getOrganizationSubscription(organizationId);

  if (!subscription) {
    return c.json({ error: "Organization not found" }, 404);
  }

  return c.json(subscription);
});

// ============================================
// GET /api/subscription/plans
// Get available subscription plans
// ============================================
app.get("/plans", async (c) => {
  return c.json({
    trial: {
      days: 7,
      tier: "PRO",
    },
    plans: SUBSCRIPTION_TIERS,
  });
});

// ============================================
// POST /api/subscription/upgrade
// Upgrade subscription to PRO or BUSINESS
// ============================================
app.post("/upgrade", async (c) => {
  const body = await c.req.json();
  const { organizationId, tier, stripeCustomerId, stripeSubscriptionId } = body;

  if (!organizationId || !tier) {
    return c.json({ error: "organizationId and tier are required" }, 400);
  }

  if (tier !== "PRO" && tier !== "BUSINESS") {
    return c.json({ error: "tier must be PRO or BUSINESS" }, 400);
  }

  try {
    const result = await upgradeSubscription(
      organizationId,
      tier,
      stripeCustomerId,
      stripeSubscriptionId
    );
    return c.json(result);
  } catch (error) {
    console.error("Upgrade error:", error);
    return c.json({ error: "Failed to upgrade subscription" }, 500);
  }
});

// ============================================
// POST /api/subscription/cancel
// Cancel active subscription
// ============================================
app.post("/cancel", async (c) => {
  const body = await c.req.json();
  const { organizationId } = body;

  if (!organizationId) {
    return c.json({ error: "organizationId is required" }, 400);
  }

  try {
    const result = await cancelSubscription(organizationId);
    return c.json(result);
  } catch (error) {
    console.error("Cancel error:", error);
    return c.json({ error: "Failed to cancel subscription" }, 500);
  }
});

// ============================================
// POST /api/subscription/check-feature
// Check if a feature is accessible
// ============================================
app.post("/check-feature", async (c) => {
  const body = await c.req.json();
  const { organizationId, feature } = body;

  if (!organizationId || !feature) {
    return c.json({ error: "organizationId and feature are required" }, 400);
  }

  try {
    const result = await checkFeatureAccess(organizationId, feature);
    return c.json(result);
  } catch (error) {
    console.error("Check feature error:", error);
    return c.json({ error: "Failed to check feature access" }, 500);
  }
});

// ============================================
// GET /api/subscription/pricing
// Get pricing page HTML
// ============================================
app.get("/pricing", async (c) => {
  const html = getPricingHTML();
  return c.html(html);
});

// ============================================
// POST /api/subscription/webhook
// Handle Stripe webhooks (placeholder)
// ============================================
app.post("/webhook", async (c) => {
  // In production, verify webhook signature
  const body = await c.req.json();
  
  console.log("📨 [Subscription Webhook]:", body.type);

  // Handle different event types
  switch (body.type) {
    case "invoice.paid":
      // Payment successful, extend subscription
      console.log("✅ Payment successful");
      break;
      
    case "invoice.payment_failed":
      // Payment failed, notify user
      console.log("❌ Payment failed");
      break;
      
    case "customer.subscription.deleted":
      // Subscription cancelled
      console.log("🔴 Subscription cancelled");
      break;
      
    default:
      console.log("Unhandled webhook event:", body.type);
  }

  return c.json({ received: true });
});

// ============================================
// POST /api/subscription/initialize-trial
// Initialize trial for existing organization (admin only)
// ============================================
app.post("/initialize-trial", async (c) => {
  const body = await c.req.json();
  const { organizationId } = body;

  if (!organizationId) {
    return c.json({ error: "organizationId is required" }, 400);
  }

  try {
    const result = await createOrganizationWithTrial(organizationId);
    return c.json(result);
  } catch (error) {
    console.error("Initialize trial error:", error);
    return c.json({ error: "Failed to initialize trial" }, 500);
  }
});

export default app;
