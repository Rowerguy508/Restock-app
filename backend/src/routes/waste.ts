// ============================================
// RESTOCKA WASTE TRACKING API ROUTES
// ============================================

import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { checkFeatureAccess } from "../subscription";
import type { AppType } from "../types";

const app = new Hono<AppType>();

// ============================================
// MIDDLEWARE
// ============================================
const requireAuth = async (c: Context<AppType>, next: () => Promise<void>) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Authentication required" }, 401);
  }
  await next();
};

const getOrgFromUser = async (c: Context<AppType>) => {
  const user = c.get("user");
  if (!user) return null;
  const membership = await db.membership.findUnique({
    where: { userId: user.id },
  });
  return membership?.organizationId;
};

// ============================================
// POST /api/waste/log
// Log a waste entry
// ============================================
app.post("/log", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  const body = await c.req.json();
  const { productId, locationId, quantity, reason, notes } = body;

  // Validation
  if (!productId || !locationId || !quantity || !reason) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  // Check feature access
  const featureCheck = await checkFeatureAccess(organizationId, "products");
  if (!featureCheck.hasAccess) {
    return c.json({ error: featureCheck.message }, 403);
  }

  // Get product for cost info
  const product = await db.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return c.json({ error: "Product not found" }, 404);
  }

  // Get stock level for unit cost estimation
  const stockLevel = await db.stockLevel.findUnique({
    where: { productId_locationId: { productId, locationId } },
  });

  // Calculate estimated cost
  const unitCost = stockLevel?.dailyUsage ? 10 / stockLevel.dailyUsage : 0; // Placeholder
  const totalCost = quantity * unitCost;

  // Create waste entry
  const wasteEntry = await db.wasteEntry.create({
    data: {
      productId,
      locationId,
      quantity,
      reason,
      notes,
      totalCost,
    },
  });

  // Reduce stock level
  if (stockLevel && stockLevel.onHand >= quantity) {
    await db.stockLevel.update({
      where: { id: stockLevel.id },
      data: { onHand: { decrement: quantity } },
    });
  }

  // Log audit
  await db.auditLog.create({
    data: {
      organizationId,
      locationId,
      userId: c.get("user")?.id,
      action: "WASTE_LOGGED",
      entityType: "waste_entry",
      entityId: wasteEntry.id,
      details: JSON.stringify({ productId, quantity, reason, totalCost }),
    },
  });

  return c.json({
    success: true,
    wasteEntry: {
      id: wasteEntry.id,
      productId: wasteEntry.productId,
      quantity: wasteEntry.quantity,
      reason: wasteEntry.reason,
      totalCost: wasteEntry.totalCost,
      createdAt: wasteEntry.createdAt,
    },
  });
});

// ============================================
// GET /api/waste/history
// Get waste history for a location
// ============================================
app.get("/history", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  const locationId = c.req.query("locationId");
  const days = parseInt(c.req.query("days") || "30", 10);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const where: any = {
    location: { organizationId },
    createdAt: { gte: startDate },
  };

  if (locationId) {
    where.locationId = locationId;
  }

  const wasteEntries = await db.wasteEntry.findMany({
    where,
    include: {
      product: { select: { name: true, category: true, unit: true } },
      location: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Calculate summary
  const summary = {
    totalEntries: wasteEntries.length,
    totalQuantity: wasteEntries.reduce((sum, e) => sum + e.quantity, 0),
    totalCost: wasteEntries.reduce((sum, e) => sum + (e.totalCost || 0), 0),
    byReason: {} as Record<string, { count: number; cost: number }>,
  };

  for (const entry of wasteEntries) {
    if (!summary.byReason[entry.reason]) {
      summary.byReason[entry.reason] = { count: 0, cost: 0 };
    }
    summary.byReason[entry.reason].count++;
    summary.byReason[entry.reason].cost += entry.totalCost || 0;
  }

  return c.json({
    wasteEntries,
    summary,
  });
});

// ============================================
// GET /api/waste/stats
// Get waste statistics for dashboard
// ============================================
app.get("/stats", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  const locationId = c.req.query("locationId");

  // Last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const where: any = {
    location: { organizationId },
    createdAt: { gte: thirtyDaysAgo },
  };

  if (locationId) {
    where.locationId = locationId;
  }

  const [last30Days, last7Days, thisMonth] = await Promise.all([
    // Last 30 days
    db.wasteEntry.findMany({
      where: { ...where, createdAt: { gte: thirtyDaysAgo } },
    }),
    // Last 7 days
    db.wasteEntry.findMany({
      where: { ...where, createdAt: { gte: sevenDaysAgo } },
    }),
    // This month total cost
    db.wasteEntry.aggregate({
      where: {
        ...where,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { totalCost: true },
    }),
  ]);

  // Daily average
  const avgDailyWaste = last30Days.length > 0
    ? last30Days.reduce((sum, e) => sum + (e.totalCost || 0), 0) / 30
    : 0;

  // Top waste reasons
  const reasonCounts: Record<string, number> = {};
  for (const entry of last30Days) {
    reasonCounts[entry.reason] = (reasonCounts[entry.reason] || 0) + 1;
  }
  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason, count]) => ({ reason, count }));

  return c.json({
    last7Days: {
      entries: last7Days.length,
      totalCost: last7Days.reduce((sum, e) => sum + (e.totalCost || 0), 0),
    },
    thisMonth: {
      totalCost: thisMonth._sum.totalCost || 0,
    },
    avgDailyWaste,
    topReasons,
  });
});

// ============================================
// GET /api/waste/expiring
// Get products expiring soon
// ============================================
app.get("/expiring", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  const locationId = c.req.query("locationId");
  const daysAhead = parseInt(c.req.query("days") || "7", 10);

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const where: any = {
    location: { organizationId },
    expiryDate: {
      lte: futureDate,
      gte: new Date(), // Not expired yet
    },
    status: "PENDING",
  };

  if (locationId) {
    where.locationId = locationId;
  }

  const expiringItems = await db.expiryEntry.findMany({
    where,
    include: {
      product: { select: { name: true, category: true, unit: true } },
      location: { select: { name: true } },
    },
    orderBy: { expiryDate: "asc" },
    take: 50,
  });

  return c.json({ expiringItems });
});

export default app;
