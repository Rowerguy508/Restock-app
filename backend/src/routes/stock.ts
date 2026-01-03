import { Hono, type Context } from "hono";
import { db } from "../db";
import { type AppType } from "../types";
import { updateStockRequestSchema, type StockStatus } from "@/shared/contracts";

const stockRouter = new Hono<AppType>();

// Helper to get membership
const getMembership = async (c: Context<AppType>) => {
  const user = c.get("user");
  if (!user) return null;

  return db.membership.findUnique({
    where: { userId: user.id },
  });
};

// Helper to check if user is an owner
const requireOwner = async (c: Context<AppType>) => {
  const membership = await getMembership(c);
  if (!membership || membership.role !== "OWNER") return null;
  return membership;
};

// Calculate stock status based on days remaining
const getStockStatus = (daysRemaining: number | null, safetyDays: number): StockStatus => {
  if (daysRemaining === null || daysRemaining === 0) return "OUT";
  if (daysRemaining < safetyDays * 0.5) return "CRITICAL";
  if (daysRemaining < safetyDays) return "LOW";
  return "OK";
};

// GET /api/stock/:locationId - Get stock levels for location
stockRouter.get("/:locationId", async (c) => {
  const membership = await getMembership(c);
  if (!membership) return c.json({ error: "Unauthorized" }, 401);

  const locationId = c.req.param("locationId");

  // Verify access to location
  if (membership.role === "MANAGER" && membership.locationId !== locationId) {
    return c.json({ error: "Access denied to this location" }, 403);
  }

  // Verify location belongs to organization
  const location = await db.location.findFirst({
    where: {
      id: locationId,
      organizationId: membership.organizationId,
    },
  });

  if (!location) {
    return c.json({ error: "Location not found" }, 404);
  }

  // Get all products with their stock levels and reorder rules
  const products = await db.product.findMany({
    where: {
      organizationId: membership.organizationId,
      isActive: true,
    },
    include: {
      stockLevels: {
        where: { locationId },
      },
      reorderRules: {
        where: { isActive: true },
        take: 1,
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const items = products.map((product) => {
    const stockLevel = product.stockLevels[0] ?? null;
    const reorderRule = product.reorderRules[0] ?? null;

    const daysRemaining =
      stockLevel && stockLevel.dailyUsage > 0
        ? stockLevel.onHand / stockLevel.dailyUsage
        : stockLevel?.onHand ?? 0 > 0
          ? 999
          : 0;

    const safetyDays = reorderRule?.safetyDays ?? 3;
    const status = getStockStatus(daysRemaining, safetyDays);

    return {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        category: product.category,
        organizationId: product.organizationId,
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      },
      stockLevel: stockLevel
        ? {
            id: stockLevel.id,
            productId: stockLevel.productId,
            locationId: stockLevel.locationId,
            onHand: stockLevel.onHand,
            dailyUsage: stockLevel.dailyUsage,
            updatedAt: stockLevel.updatedAt.toISOString(),
          }
        : null,
      daysRemaining: daysRemaining === 999 ? null : Math.round(daysRemaining * 10) / 10,
      status,
      reorderRule: reorderRule
        ? {
            id: reorderRule.id,
            productId: reorderRule.productId,
            supplierId: reorderRule.supplierId,
            safetyDays: reorderRule.safetyDays,
            reorderQty: reorderRule.reorderQty,
            automationMode: reorderRule.automationMode as
              | "MANUAL"
              | "ASSISTED"
              | "AUTO"
              | "EMERGENCY",
            priceCap: reorderRule.priceCap,
            maxSpend: reorderRule.maxSpend,
            isActive: reorderRule.isActive,
            createdAt: reorderRule.createdAt.toISOString(),
            updatedAt: reorderRule.updatedAt.toISOString(),
          }
        : null,
    };
  });

  // Calculate summary
  const summary = {
    total: items.length,
    ok: items.filter((i) => i.status === "OK").length,
    low: items.filter((i) => i.status === "LOW").length,
    critical: items.filter((i) => i.status === "CRITICAL").length,
    out: items.filter((i) => i.status === "OUT").length,
  };

  return c.json({ items, summary });
});

// PUT /api/stock/:locationId/:productId - Update stock level (owner only)
stockRouter.put("/:locationId/:productId", async (c) => {
  const membership = await requireOwner(c);
  if (!membership) return c.json({ error: "Owner access required" }, 403);

  const locationId = c.req.param("locationId");
  const productId = c.req.param("productId");

  const body = await c.req.json();
  const parsed = updateStockRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  // Verify location and product belong to organization
  const [location, product] = await Promise.all([
    db.location.findFirst({
      where: { id: locationId, organizationId: membership.organizationId },
    }),
    db.product.findFirst({
      where: { id: productId, organizationId: membership.organizationId },
    }),
  ]);

  if (!location) return c.json({ error: "Location not found" }, 404);
  if (!product) return c.json({ error: "Product not found" }, 404);

  // Upsert stock level
  const stockLevel = await db.stockLevel.upsert({
    where: {
      productId_locationId: { productId, locationId },
    },
    update: {
      onHand: parsed.data.onHand,
      ...(parsed.data.dailyUsage !== undefined && { dailyUsage: parsed.data.dailyUsage }),
    },
    create: {
      productId,
      locationId,
      onHand: parsed.data.onHand,
      dailyUsage: parsed.data.dailyUsage ?? 0,
    },
  });

  return c.json({
    id: stockLevel.id,
    productId: stockLevel.productId,
    locationId: stockLevel.locationId,
    onHand: stockLevel.onHand,
    dailyUsage: stockLevel.dailyUsage,
    updatedAt: stockLevel.updatedAt.toISOString(),
  });
});

export { stockRouter };
