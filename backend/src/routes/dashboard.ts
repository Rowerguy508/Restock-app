import { Hono, type Context } from "hono";
import { db } from "../db";
import { type AppType } from "../types";
import { type StockStatus } from "@/shared/contracts";

const dashboardRouter = new Hono<AppType>();

// Helper to get membership
const getMembership = async (c: Context<AppType>) => {
  const user = c.get("user");
  if (!user) return null;

  return db.membership.findUnique({
    where: { userId: user.id },
  });
};

// Calculate stock status
const getStockStatus = (daysRemaining: number | null, safetyDays: number): StockStatus => {
  if (daysRemaining === null || daysRemaining === 0) return "OUT";
  if (daysRemaining < safetyDays * 0.5) return "CRITICAL";
  if (daysRemaining < safetyDays) return "LOW";
  return "OK";
};

// GET /api/dashboard - Dashboard summary
dashboardRouter.get("/", async (c) => {
  const membership = await getMembership(c);
  if (!membership) return c.json({ error: "Unauthorized" }, 401);

  // Get all locations for this organization (or just the manager's location)
  const locationFilter =
    membership.role === "MANAGER" && membership.locationId
      ? { id: membership.locationId }
      : {};

  const locations = await db.location.findMany({
    where: {
      organizationId: membership.organizationId,
      ...locationFilter,
    },
  });

  const locationIds = locations.map((l) => l.id);

  // Get all products with stock levels
  const products = await db.product.findMany({
    where: {
      organizationId: membership.organizationId,
      isActive: true,
    },
    include: {
      stockLevels: {
        where: { locationId: { in: locationIds } },
      },
      reorderRules: {
        where: { isActive: true },
        take: 1,
      },
    },
  });

  // Calculate stock summary
  let ok = 0,
    low = 0,
    critical = 0,
    out = 0;

  const criticalItems: Array<{
    product: {
      id: string;
      name: string;
      sku: string | null;
      unit: string;
      category: string | null;
      organizationId: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    };
    stockLevel: {
      id: string;
      productId: string;
      locationId: string;
      onHand: number;
      dailyUsage: number;
      updatedAt: string;
    } | null;
    daysRemaining: number | null;
    status: StockStatus;
    reorderRule: null;
  }> = [];

  for (const product of products) {
    for (const stockLevel of product.stockLevels) {
      const reorderRule = product.reorderRules[0];
      const safetyDays = reorderRule?.safetyDays ?? 3;

      const daysRemaining =
        stockLevel.dailyUsage > 0
          ? stockLevel.onHand / stockLevel.dailyUsage
          : stockLevel.onHand > 0
            ? 999
            : 0;

      const status = getStockStatus(daysRemaining, safetyDays);

      switch (status) {
        case "OK":
          ok++;
          break;
        case "LOW":
          low++;
          break;
        case "CRITICAL":
          critical++;
          criticalItems.push({
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
            stockLevel: {
              id: stockLevel.id,
              productId: stockLevel.productId,
              locationId: stockLevel.locationId,
              onHand: stockLevel.onHand,
              dailyUsage: stockLevel.dailyUsage,
              updatedAt: stockLevel.updatedAt.toISOString(),
            },
            daysRemaining: Math.round(daysRemaining * 10) / 10,
            status,
            reorderRule: null,
          });
          break;
        case "OUT":
          out++;
          criticalItems.push({
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
            stockLevel: {
              id: stockLevel.id,
              productId: stockLevel.productId,
              locationId: stockLevel.locationId,
              onHand: stockLevel.onHand,
              dailyUsage: stockLevel.dailyUsage,
              updatedAt: stockLevel.updatedAt.toISOString(),
            },
            daysRemaining: 0,
            status,
            reorderRule: null,
          });
          break;
      }
    }

    // Products without stock levels count as OUT
    if (product.stockLevels.length === 0) {
      out += locationIds.length;
    }
  }

  // Count pending orders (DRAFT or SENT)
  const pendingOrders = await db.purchaseOrder.count({
    where: {
      locationId: { in: locationIds },
      status: { in: ["DRAFT", "SENT"] },
    },
  });

  // Count active alerts
  const activeAlerts = await db.alert.count({
    where: {
      organizationId: membership.organizationId,
      isDismissed: false,
      ...(membership.role === "MANAGER" && membership.locationId
        ? { locationId: membership.locationId }
        : {}),
    },
  });

  // Get recent orders
  const recentOrders = await db.purchaseOrder.findMany({
    where: {
      locationId: { in: locationIds },
    },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, unit: true } } },
      },
      supplier: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return c.json({
    stockSummary: {
      total: ok + low + critical + out,
      ok,
      low,
      critical,
      out,
    },
    pendingOrders,
    activeAlerts,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      locationId: o.locationId,
      supplierId: o.supplierId,
      status: o.status as "DRAFT" | "SENT" | "DELIVERED" | "NOT_DELIVERED" | "CANCELLED",
      totalAmount: o.totalAmount,
      notes: o.notes,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      sentAt: o.sentAt?.toISOString() ?? null,
      deliveredAt: o.deliveredAt?.toISOString() ?? null,
      confirmedById: o.confirmedById,
      confirmPhoto: o.confirmPhoto,
      supplier: o.supplier
        ? {
            id: o.supplier.id,
            name: o.supplier.name,
            contactName: null,
            phone: null,
            email: null,
            address: null,
            organizationId: "",
            isActive: true,
            createdAt: "",
            updatedAt: "",
          }
        : undefined,
      location: o.location
        ? {
            id: o.location.id,
            name: o.location.name,
            address: null,
            organizationId: "",
            createdAt: "",
            updatedAt: "",
          }
        : undefined,
    })),
    criticalItems: criticalItems.slice(0, 10),
  });
});

export { dashboardRouter };
