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
import { type AppType } from "../types";
import { db } from "../db";

const app = new Hono<AppType>();

// ============================================
// MIDDLEWARE: Require authentication
// ============================================
const requireAuth = async (c: Context<AppType>, next: () => Promise<void>) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Authentication required" }, 401);
  }
  await next();
};

// ============================================
// HELPER: Get organization from user
// ============================================
const getOrgFromUser = async (c: Context<AppType>) => {
  const user = c.get("user");
  if (!user) return null;

  const membership = await db.membership.findUnique({
    where: { userId: user.id },
  });

  if (!membership) return null;
  return membership.organizationId;
};

// ============================================
// GET /api/subscription/status
// Get subscription status for current user
// ============================================
app.get("/status", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  const subscription = await getOrganizationSubscription(organizationId);
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
// GET /api/subscription/usage
// Get current usage stats
// ============================================
app.get("/usage", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  const subscription = await getOrganizationSubscription(organizationId);
  if (!subscription) {
    return c.json({ error: "Subscription not found" }, 404);
  }

  // Get actual counts from database
  const [locationCount, productCount, orderCount] = await Promise.all([
    db.location.count({ where: { organizationId } }),
    db.product.count({ where: { organizationId } }),
    db.purchaseOrder.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  return c.json({
    usage: {
      locations: locationCount,
      products: productCount,
      ordersThisMonth: orderCount,
    },
    limits: SUBSCRIPTION_TIERS[subscription.tier as keyof typeof SUBSCRIPTION_TIERS]?.limits,
    subscription,
  });
});

// ============================================
// POST /api/subscription/upgrade
// Upgrade subscription to PRO or BUSINESS
// ============================================
app.post("/upgrade", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  const body = await c.req.json();
  const { tier, stripePaymentIntentId } = body;

  if (!tier) {
    return c.json({ error: "tier is required" }, 400);
  }

  if (tier !== "PRO" && tier !== "BUSINESS") {
    return c.json({ error: "tier must be PRO or BUSINESS" }, 400);
  }

  // TODO: Process payment with Stripe here
  // For now, just upgrade directly (stripePaymentIntentId would be verified)

  try {
    const result = await upgradeSubscription(
      organizationId,
      tier,
      undefined, // stripeCustomerId - would come from Stripe
      undefined  // stripeSubscriptionId - would come from Stripe
    );
    
    // Log audit
    await db.auditLog.create({
      data: {
        organizationId,
        action: "SUBSCRIPTION_UPGRADE",
        details: { tier, previousTier: "TRIAL" },
        userId: c.get("user")?.id,
      },
    });

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
app.post("/cancel", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  try {
    const result = await cancelSubscription(organizationId);
    
    // Log audit
    await db.auditLog.create({
      data: {
        organizationId,
        action: "SUBSCRIPTION_CANCEL",
        userId: c.get("user")?.id,
      },
    });

    return c.json(result);
  } catch (error) {
    console.error("Cancel error:", error);
    return c.json({ error: "Failed to cancel subscription" }, 500);
  }
});

// ============================================
// POST /api/subscription/check-feature
// Check if a feature is accessible (for client-side UI)
// ============================================
app.post("/check-feature", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  const body = await c.req.json();
  const { feature } = body;

  if (!feature) {
    return c.json({ error: "feature is required" }, 400);
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
// Handle Stripe webhooks
// ============================================
app.post("/webhook", async (c) => {
  // In production, verify webhook signature:
  // const signature = c.req.header("stripe-signature");
  // const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

  const body = await c.req.json();
  
  console.log("📨 [Subscription Webhook]:", body.type);

  try {
    switch (body.type) {
      case "invoice.paid": {
        // Payment successful, extend subscription
        const { customer, subscription } = body.data.object;
        await db.organization.updateMany({
          where: { stripeCustomerId: customer },
          data: {
            subscriptionStatus: "ACTIVE",
            subscriptionEndDate: new Date(subscription.current_period_end * 1000),
            stripeSubscriptionId: subscription.id,
          },
        });
        console.log("✅ Payment successful, subscription active");
        break;
      }
      
      case "invoice.payment_failed": {
        // Payment failed, notify user
        const { customer } = body.data.object;
        console.log("❌ Payment failed for customer:", customer);
        // TODO: Send notification email
        break;
      }
      
      case "customer.subscription.deleted": {
        // Subscription cancelled
        const { customer } = body.data.object;
        await db.organization.updateMany({
          where: { stripeCustomerId: customer },
          data: {
            subscriptionStatus: "CANCELLED",
            stripeSubscriptionId: null,
          },
        });
        console.log("🔴 Subscription cancelled");
        break;
      }

      case "customer.subscription.updated": {
        // Subscription updated (e.g., tier change)
        const { customer, subscription } = body.data.object;
        const tier = subscription.metadata?.tier || "FREE";
        await db.organization.updateMany({
          where: { stripeCustomerId: customer },
          data: {
            subscriptionTier: tier,
            subscriptionEndDate: new Date(subscription.current_period_end * 1000),
          },
        });
        console.log("🔄 Subscription updated to:", tier);
        break;
      }
      
      default:
        console.log("Unhandled webhook event:", body.type);
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return c.json({ error: "Webhook processing failed" }, 400);
  }

  return c.json({ received: true });
});

// ============================================
// POST /api/subscription/initialize-trial
// Initialize trial for existing organization (admin only)
// ============================================
app.post("/initialize-trial", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  // Verify user is owner
  const membership = await db.membership.findUnique({
    where: { userId: c.get("user")?.id },
  });

  if (!membership || membership.role !== "OWNER") {
    return c.json({ error: "Owner access required" }, 403);
  }

  try {
    const result = await createOrganizationWithTrial(organizationId);
    return c.json(result);
  } catch (error) {
    console.error("Initialize trial error:", error);
    return c.json({ error: "Failed to initialize trial" }, 500);
  }
});

// ============================================
// POST /api/subscription/checkout
// Create Stripe checkout session
// ============================================
app.post("/checkout", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  const body = await c.req.json();
  const { tier } = body;

  if (!tier || (tier !== "PRO" && tier !== "BUSINESS")) {
    return c.json({ error: "tier must be PRO or BUSINESS" }, 400);
  }

  try {
    const { createCheckoutSession, STRIPE_ENABLED } = await import("../stripe");
    
    if (!STRIPE_ENABLED) {
      // Fallback: upgrade directly without Stripe (for testing)
      const result = await upgradeSubscription(organizationId, tier);
      return c.json({ 
        success: true,
        mode: "direct",
        message: "Upgraded directly (Stripe not configured)",
        subscription: result,
      });
    }

    const baseUrl = c.req.url.split("/api")[0];
    const result = await createCheckoutSession(
      organizationId,
      tier,
      `${baseUrl}/subscription/success`,
      `${baseUrl}/subscription/cancel`
    );

    return c.json({
      success: true,
      mode: "stripe",
      ...result,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return c.json({ error: "Failed to create checkout session" }, 500);
  }
});

// ============================================
// POST /api/subscription/portal
// Create Stripe billing portal session
// ============================================
app.post("/portal", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  const baseUrl = c.req.url.split("/api")[0];

  try {
    const { createPortalSession, STRIPE_ENABLED } = await import("../stripe");
    
    if (!STRIPE_ENABLED) {
      return c.json({ error: "Stripe not configured" }, 400);
    }

    const result = await createPortalSession(
      organizationId,
      `${baseUrl}/settings`
    );

    return c.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Portal error:", error);
    return c.json({ error: "Failed to create portal session" }, 500);
  }
});

export default app;
