// ============================================
// STRIPE INTEGRATION
// ============================================

import Stripe from "stripe";
import { db } from "./db";

// Initialize Stripe - requires STRIPE_SECRET_KEY in .env
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-01-27.acacia",
    })
  : null;

export const STRIPE_ENABLED = !!stripe;

export const STRIPE_PRICE_IDS = {
  PRO: process.env.STRIPE_PRO_PRICE_ID || "price_pro_monthly",
  BUSINESS: process.env.STRIPE_BUSINESS_PRICE_ID || "price_business_monthly",
};

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// ============================================
// CREATE CHECKOUT SESSION
// ============================================

export async function createCheckoutSession(
  organizationId: string,
  tier: "PRO" | "BUSINESS",
  successUrl: string,
  cancelUrl: string
) {
  if (!stripe) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to .env");
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { 
      id: true, 
      name: true,
      stripeCustomerId: true,
    },
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  // Get or create Stripe customer
  let customerId = org.stripeCustomerId;
  
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: `${org.id}@restocka.local`, // In production, use actual user email
      name: org.name,
      metadata: {
        organizationId: org.id,
      },
    });
    customerId = customer.id;
    
    // Save customer ID to organization
    await db.organization.update({
      where: { id: organizationId },
      data: { stripeCustomerId: customerId },
    });
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: STRIPE_PRICE_IDS[tier],
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organizationId: org.id,
      tier: tier,
    },
    subscription_data: {
      metadata: {
        organizationId: org.id,
        tier: tier,
      },
    },
    allow_promotion_codes: true,
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}

// ============================================
// CREATE CUSTOMER PORTAL SESSION
// ============================================

export async function createPortalSession(organizationId: string, returnUrl: string) {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { stripeCustomerId: true },
  });

  if (!org?.stripeCustomerId) {
    throw new Error("No Stripe customer found for this organization");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: returnUrl,
  });

  return {
    url: session.url,
  };
}

// ============================================
// HANDLE WEBHOOK
// ============================================

export async function handleStripeWebhook(
  payload: string,
  signature: string
): Promise<{ success: boolean; message: string }> {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return { success: false, message: "Stripe not configured" };
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return { success: false, message: "Invalid signature" };
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = session.metadata?.organizationId;
        const tier = session.metadata?.tier as "PRO" | "BUSINESS";
        
        if (organizationId && tier) {
          const tierConfig = await import("./subscription").then(m => m.SUBSCRIPTION_TIERS[tier]);
          
          await db.organization.update({
            where: { id: organizationId },
            data: {
              subscriptionStatus: "ACTIVE",
              subscriptionTier: tier,
              subscriptionStartDate: new Date(),
              subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              stripeSubscriptionId: session.subscription as string,
              trialEndDate: null,
            },
          });
          console.log(`✅ Activated ${tier} subscription for org ${organizationId}`);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const organizationId = subscription.metadata?.organizationId;
        
        if (organizationId) {
          if (event.type === "customer.subscription.deleted") {
            await db.organization.update({
              where: { id: organizationId },
              data: {
                subscriptionStatus: "CANCELLED",
                stripeSubscriptionId: null,
              },
            });
            console.log(`❌ Cancelled subscription for org ${organizationId}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { success: true, message: "Webhook processed" };
  } catch (err) {
    console.error("Error processing webhook:", err);
    return { success: false, message: "Webhook processing failed" };
  }
}

// ============================================
// CANCEL SUBSCRIPTION
// ============================================

export async function cancelStripeSubscription(organizationId: string) {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { stripeSubscriptionId: true },
  });

  if (!org?.stripeSubscriptionId) {
    throw new Error("No active subscription found");
  }

  await stripe.subscriptions.cancel(org.stripeSubscriptionId);

  await db.organization.update({
    where: { id: organizationId },
    data: {
      subscriptionStatus: "CANCELLED",
      stripeSubscriptionId: null,
    },
  });

  return { success: true };
}

// ============================================
// GET SUBSCRIPTION STATUS FROM STRIPE
// ============================================

export async function syncSubscriptionFromStripe(organizationId: string) {
  if (!stripe) {
    return null;
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { stripeSubscriptionId: true },
  });

  if (!org?.stripeSubscriptionId) {
    return null;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
    
    return {
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  } catch (err) {
    console.error("Error fetching subscription from Stripe:", err);
    return null;
  }
}

console.log(`✅ [Stripe] ${STRIPE_ENABLED ? "Enabled" : "Disabled (missing STRIPE_SECRET_KEY)"}`);
