// ============================================
// RESTOCKA SUBSCRIPTION CONFIGURATION
// ============================================
// This file contains all subscription-related logic
// ============================================

import { db } from "./db";

// ============================================
// SUBSCRIPTION TIERS
// ============================================

export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: "Free",
    price: 0,
    interval: "forever",
    features: [
      "1 ubicación",
      "5 productos",
      "Inventario básico",
      "Solo pedidos manuales",
      "Soporte por email",
    ],
    limits: {
      locations: 1,
      products: 5,
      ordersPerMonth: 10,
      users: 1,
      locationsText: "1 ubicación",
      productsText: "5 productos",
      ordersText: "10 pedidos/mes",
    },
  },
  PRO: {
    name: "Pro",
    price: 29,
    interval: "month",
    features: [
      "3 ubicaciones",
      "50 productos",
      "Auto-reorden asistido",
      "Analytics básicos",
      "App móvil completa",
      "Soporte prioritario",
    ],
    limits: {
      locations: 3,
      products: 50,
      ordersPerMonth: 100,
      users: 3,
      locationsText: "3 ubicaciones",
      productsText: "50 productos",
      ordersText: "100 pedidos/mes",
    },
  },
  BUSINESS: {
    name: "Business",
    price: 79,
    interval: "month",
    features: [
      "Ubicaciones ilimitadas",
      "Productos ilimitados",
      "Auto-reorden completo",
      "Analytics avanzados",
      "API access completo",
      "Soporte 24/7",
    ],
    limits: {
      locations: -1, // unlimited
      products: -1,
      ordersPerMonth: -1,
      users: -1,
      locationsText: "Ilimitadas",
      productsText: "Ilimitados",
      ordersText: "Ilimitados",
    },
  },
};

export const TRIAL_DAYS = 7;

// ============================================
// DATABASE HELPERS
// ============================================

export async function createOrganizationWithTrial(organizationId: string) {
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);

  await db.organization.update({
    where: { id: organizationId },
    data: {
      subscriptionStatus: "TRIAL",
      subscriptionTier: "PRO",
      trialStartDate: new Date(),
      trialEndDate: trialEndDate,
    },
  });

  return {
    status: "TRIAL",
    tier: "PRO",
    trialEndDate: trialEndDate,
    daysRemaining: TRIAL_DAYS,
  };
}

export async function getOrganizationSubscription(organizationId: string) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      subscriptionStatus: true,
      subscriptionTier: true,
      trialStartDate: true,
      trialEndDate: true,
      subscriptionStartDate: true,
      subscriptionEndDate: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      ordersThisMonth: true,
      locationsCount: true,
      productsCount: true,
    },
  });

  if (!org) return null;

  const now = new Date();
  
  // Check if trial expired
  const isTrialExpired =
    org.subscriptionStatus === "TRIAL" &&
    org.trialEndDate &&
    now > org.trialEndDate;

  // Check if subscription expired
  const isSubscriptionExpired =
    org.subscriptionStatus === "ACTIVE" &&
    org.subscriptionEndDate &&
    now > org.subscriptionEndDate;

  const tierConfig = SUBSCRIPTION_TIERS[org.subscriptionTier as keyof typeof SUBSCRIPTION_TIERS];

  return {
    status: isTrialExpired || isSubscriptionExpired ? "EXPIRED" : org.subscriptionStatus,
    tier: org.subscriptionTier,
    tierName: tierConfig?.name || "Unknown",
    price: tierConfig?.price || 0,
    trialStartDate: org.trialStartDate,
    trialEndDate: org.trialEndDate,
    subscriptionStartDate: org.subscriptionStartDate,
    subscriptionEndDate: org.subscriptionEndDate,
    daysRemaining: org.trialEndDate
      ? Math.max(0, Math.ceil((org.trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0,
    isActive: !isTrialExpired && !isSubscriptionExpired,
    stripeCustomerId: org.stripeCustomerId,
    stripeSubscriptionId: org.stripeSubscriptionId,
    usage: {
      ordersThisMonth: org.ordersThisMonth,
      locationsCount: org.locationsCount,
      productsCount: org.productsCount,
    },
  };
}

export async function checkFeatureAccess(
  organizationId: string,
  feature: "locations" | "products" | "ordersPerMonth" | "users"
) {
  const subscription = await getOrganizationSubscription(organizationId);
  
  if (!subscription || !subscription.isActive) {
    return {
      hasAccess: false,
      reason: "subscription_inactive",
      message: "Tu suscripción no está activa. Por favor, actualiza tu plan.",
      upgradeUrl: "/subscription",
    };
  }

  const tierLimits = SUBSCRIPTION_TIERS[subscription.tier as keyof typeof SUBSCRIPTION_TIERS]?.limits;
  const featureLimit = tierLimits?.[feature];

  if (featureLimit === undefined) {
    return { hasAccess: true };
  }

  if (featureLimit === -1) {
    return { hasAccess: true, message: "Ilimitado" };
  }

  // For usage-based limits, check current usage
  if (feature === "ordersPerMonth") {
    const remaining = featureLimit - (subscription.usage.ordersThisMonth || 0);
    if (remaining <= 0) {
      return {
        hasAccess: false,
        reason: "limit_exceeded",
        message: `Has alcanzado el límite de ${featureLimit} pedidos este mes. Actualiza tu plan para más.`,
        upgradeUrl: "/subscription",
      };
    }
    return { hasAccess: true, message: `${remaining} pedidos restantes este mes` };
  }

  return { hasAccess: true };
}

export async function incrementOrderCount(organizationId: string) {
  await db.organization.update({
    where: { id: organizationId },
    data: {
      ordersThisMonth: { increment: 1 },
    },
  });
}

export async function resetMonthlyOrders() {
  // This would be called by a cron job at the start of each month
  await db.organization.updateMany({
    data: {
      ordersThisMonth: 0,
    },
  });
}

export async function upgradeSubscription(
  organizationId: string,
  tier: "PRO" | "BUSINESS",
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
) {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  
  const subscriptionEndDate = new Date();
  subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

  await db.organization.update({
    where: { id: organizationId },
    data: {
      subscriptionStatus: "ACTIVE",
      subscriptionTier: tier,
      subscriptionStartDate: new Date(),
      subscriptionEndDate: subscriptionEndDate,
      stripeCustomerId: stripeCustomerId || null,
      stripeSubscriptionId: stripeSubscriptionId || null,
      trialEndDate: null, // Trial is over
    },
  });

  return {
    status: "ACTIVE",
    tier: tier,
    price: tierConfig.price,
    nextBillingDate: subscriptionEndDate,
  };
}

export async function cancelSubscription(organizationId: string) {
  await db.organization.update({
    where: { id: organizationId },
    data: {
      subscriptionStatus: "CANCELLED",
      stripeSubscriptionId: null,
    },
  });

  return { status: "CANCELLED" };
}

export async function checkAndUpdateTrialStatus(organizationId: string) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      subscriptionStatus: true,
      trialEndDate: true,
    },
  });

  if (!org) return null;

  if (org.subscriptionStatus === "TRIAL" && org.trialEndDate) {
    const now = new Date();
    if (now > org.trialEndDate) {
      // Trial expired - downgrade to FREE but keep data
      await db.organization.update({
        where: { id: organizationId },
        data: {
          subscriptionStatus: "EXPIRED",
          subscriptionTier: "FREE",
        },
      });
      return { status: "EXPIRED", tier: "FREE" };
    }
  }

  return { status: org.subscriptionStatus, tier: org.subscriptionTier };
}

// ============================================
// EXPORTS
// ============================================

export function getPricingHTML() {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ReStocka - Planes de Precios</title>
  <meta name="description" content="Control de inventario inteligente para restaurantes. 7 días de prueba gratis.">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); min-height: 100vh; padding: 40px 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 50px; color: white; }
    .header h1 { font-size: 48px; margin-bottom: 10px; color: #0D9488; }
    .header p { font-size: 20px; opacity: 0.8; }
    .badge { background: #0D9488; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; display: inline-block; margin-bottom: 15px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; max-width: 1200px; margin: 0 auto; }
    .card { background: white; border-radius: 20px; padding: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); position: relative; overflow: hidden; }
    .card.popular { border: 3px solid #0D9488; transform: scale(1.05); }
    .popular-badge { position: absolute; top: 20px; right: 20px; background: #0D9488; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .card h2 { font-size: 28px; margin: 0 0 10px 0; color: #0F172A; }
    .price { font-size: 48px; font-weight: bold; color: #0D9488; margin-bottom: 5px; }
    .price span { font-size: 16px; color: #64748B; font-weight: normal; }
    .description { color: #64748B; margin-bottom: 25px; font-size: 14px; }
    .features { list-style: none; padding: 0; margin: 25px 0; }
    .features li { padding: 12px 0; border-top: 1px solid #E2E8F0; display: flex; align-items: center; gap: 12px; color: #334155; font-size: 14px; }
    .features li::before { content: "✓"; color: #10B981; font-weight: bold; font-size: 18px; }
    .btn { display: block; width: 100%; padding: 18px; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; text-align: center; text-decoration: none; transition: all 0.2s; }
    .btn-primary { background: #0D9488; color: white; }
    .btn-primary:hover { background: #0F766E; transform: translateY(-2px); }
    .btn-secondary { background: #F1F5F9; color: #0F172A; }
    .btn-secondary:hover { background: #E2E8F0; }
    .trial-note { text-align: center; margin-top: 40px; color: white; opacity: 0.7; font-size: 14px; max-width: 600px; margin-left: auto; margin-right: auto; }
    @media (max-width: 768px) { .card.popular { transform: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ReStocka</h1>
      <p>Control de inventario inteligente para restaurantes</p>
      <div class="badge">🎉 7 días de prueba gratis en todos los planes</div>
    </div>
    
    <div class="grid">
      <!-- Free Plan -->
      <div class="card">
        <h2>Free</h2>
        <div class="price">$0<span>/para siempre</span></div>
        <p class="description">Para restaurants que están comenzando</p>
        <ul class="features">
          <li>1 ubicación</li>
          <li>5 productos</li>
          <li>Inventario básico</li>
          <li>Solo pedidos manuales</li>
          <li>Soporte por email</li>
        </ul>
        <a href="restocka://signup?plan=free" class="btn btn-secondary">Empezar Gratis</a>
      </div>
      
      <!-- Pro Plan -->
      <div class="card popular">
        <div class="popular-badge">MÁS POPULAR</div>
        <h2>Pro</h2>
        <div class="price">$29<span>/mes</span></div>
        <p class="description">Para restaurants en crecimiento</p>
        <ul class="features">
          <li>3 ubicaciones</li>
          <li>50 productos</li>
          <li>Auto-reorden asistido</li>
          <li>Analytics básicos</li>
          <li>App móvil completa</li>
          <li>Soporte prioritario</li>
        </ul>
        <a href="restocka://signup?plan=pro" class="btn btn-primary">Empezar Prueba Gratis</a>
      </div>
      
      <!-- Business Plan -->
      <div class="card">
        <h2>Business</h2>
        <div class="price">$79<span>/mes</span></div>
        <p class="description">Para cadenas y operaciones grandes</p>
        <ul class="features">
          <li>Ubicaciones ilimitadas</li>
          <li>Productos ilimitados</li>
          <li>Auto-reorden completo</li>
          <li>Analytics avanzados</li>
          <li>API access completo</li>
          <li>Soporte 24/7</li>
        </ul>
        <a href="restocka://signup?plan=business" class="btn btn-primary">Empezar Prueba Gratis</a>
      </div>
    </div>
    
    <p class="trial-note">
      🔒 Pago seguro con Stripe. Cancela tu suscripción en cualquier momento.<br>
      Tu datos se mantienen seguros incluso si cancelas.
    </p>
  </div>
</body>
</html>
`;
}

console.log("✅ [Restocka Subscription] Configuration loaded");
console.log("📋 Plans:");
console.log("   - FREE: $0/forever");
console.log("   - PRO: $29/month (7-day trial)");
console.log("   - BUSINESS: $79/month (7-day trial)");
