import { Hono, type Context } from "hono";
import { db } from "../db";
import { type AppType } from "../types";
import { triggerReorderCheckRequestSchema } from "@/shared/contracts";

const reorderRouter = new Hono<AppType>();

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

// Generate unique order number
const generateOrderNumber = () => {
  const date = new Date();
  const prefix = `PO${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${suffix}`;
};

// Calculate days remaining for a product at a location
const calculateDaysRemaining = (onHand: number, dailyUsage: number): number | null => {
  if (dailyUsage <= 0) return null;
  return Math.floor(onHand / dailyUsage);
};

interface ReorderAction {
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  supplierId: string;
  supplierName: string;
  daysRemaining: number | null;
  safetyDays: number;
  reorderQty: number;
  automationMode: string;
  action: "ALERT_CREATED" | "DRAFT_PO_CREATED" | "PO_SENT" | "NO_ACTION";
  orderId: string | null;
  reason: string;
}

// POST /api/reorder/check - Trigger reorder check (owner only)
reorderRouter.post("/check", async (c) => {
  const membership = await requireOwner(c);
  if (!membership) return c.json({ error: "Owner access required" }, 403);

  const user = c.get("user");
  const body = await c.req.json();
  const parsed = triggerReorderCheckRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  const { locationId, dryRun = true } = parsed.data;

  // Get all locations for this organization (or just the specified one)
  const locations = await db.location.findMany({
    where: {
      organizationId: membership.organizationId,
      ...(locationId ? { id: locationId } : {}),
    },
  });

  // Get all active reorder rules for this organization
  const reorderRules = await db.reorderRule.findMany({
    where: {
      isActive: true,
      product: {
        organizationId: membership.organizationId,
        isActive: true,
      },
      supplier: {
        isActive: true,
      },
    },
    include: {
      product: true,
      supplier: true,
    },
  });

  const actions: ReorderAction[] = [];

  for (const location of locations) {
    // Get stock levels for this location
    const stockLevels = await db.stockLevel.findMany({
      where: { locationId: location.id },
    });

    const stockByProduct = new Map(stockLevels.map((s) => [s.productId, s]));

    for (const rule of reorderRules) {
      const stock = stockByProduct.get(rule.productId);
      const onHand = stock?.onHand ?? 0;
      const dailyUsage = stock?.dailyUsage ?? 0;
      const daysRemaining = calculateDaysRemaining(onHand, dailyUsage);

      // Check if we need to reorder
      const needsReorder = daysRemaining !== null && daysRemaining < rule.safetyDays;

      if (!needsReorder) {
        continue;
      }

      let action: ReorderAction["action"] = "NO_ACTION";
      let orderId: string | null = null;
      let reason = "";

      // Determine action based on automation mode
      switch (rule.automationMode) {
        case "MANUAL":
          // Create alert only
          action = "ALERT_CREATED";
          reason = `Stock is low (${daysRemaining} days remaining, safety threshold is ${rule.safetyDays} days). Manual reorder required.`;

          if (!dryRun) {
            // Check if alert already exists for this product/location
            const existingAlert = await db.alert.findFirst({
              where: {
                type: "LOW_STOCK",
                relatedId: rule.productId,
                locationId: location.id,
                isDismissed: false,
              },
            });

            if (!existingAlert) {
              await db.alert.create({
                data: {
                  type: "LOW_STOCK",
                  severity: daysRemaining <= 1 ? "CRIT" : "WARN",
                  title: `Low Stock: ${rule.product.name}`,
                  message: `${rule.product.name} at ${location.name} has only ${daysRemaining} days of stock remaining. Safety threshold is ${rule.safetyDays} days.`,
                  organizationId: membership.organizationId,
                  locationId: location.id,
                  relatedId: rule.productId,
                  relatedType: "product",
                },
              });
            }
          }
          break;

        case "ASSISTED":
          // Create draft PO for owner review
          action = "DRAFT_PO_CREATED";
          reason = `Stock is low (${daysRemaining} days remaining). Draft PO created for review.`;

          if (!dryRun) {
            // Check if draft PO already exists
            const existingDraftPO = await db.purchaseOrder.findFirst({
              where: {
                locationId: location.id,
                supplierId: rule.supplierId,
                status: "DRAFT",
                items: {
                  some: { productId: rule.productId },
                },
              },
            });

            if (!existingDraftPO) {
              const po = await db.purchaseOrder.create({
                data: {
                  orderNumber: generateOrderNumber(),
                  locationId: location.id,
                  supplierId: rule.supplierId,
                  status: "DRAFT",
                  notes: `Auto-generated: ${rule.product.name} low stock (${daysRemaining} days remaining)`,
                  items: {
                    create: {
                      productId: rule.productId,
                      quantity: rule.reorderQty,
                      unitPrice: rule.priceCap,
                    },
                  },
                },
              });
              orderId = po.id;

              // Create alert about pending draft
              await db.alert.create({
                data: {
                  type: "DRAFT_PO_PENDING",
                  severity: "INFO",
                  title: `Draft PO Pending Review`,
                  message: `A draft purchase order for ${rule.product.name} has been created for ${location.name}. Please review and send.`,
                  organizationId: membership.organizationId,
                  locationId: location.id,
                  relatedId: po.id,
                  relatedType: "purchase_order",
                },
              });
            }
          }
          break;

        case "AUTO":
          // Create and send PO automatically
          action = "PO_SENT";
          reason = `Stock is low (${daysRemaining} days remaining). PO created and sent automatically.`;

          if (!dryRun) {
            const po = await db.purchaseOrder.create({
              data: {
                orderNumber: generateOrderNumber(),
                locationId: location.id,
                supplierId: rule.supplierId,
                status: "SENT",
                sentAt: new Date(),
                notes: `Auto-generated and sent: ${rule.product.name} low stock (${daysRemaining} days remaining)`,
                items: {
                  create: {
                    productId: rule.productId,
                    quantity: rule.reorderQty,
                    unitPrice: rule.priceCap,
                  },
                },
              },
            });
            orderId = po.id;

            // Log the auto-send
            await db.auditLog.create({
              data: {
                action: "PO_AUTO_SENT",
                entityType: "purchase_order",
                entityId: po.id,
                organizationId: membership.organizationId,
                locationId: location.id,
                userId: user?.id,
                details: JSON.stringify({
                  productId: rule.productId,
                  productName: rule.product.name,
                  supplierId: rule.supplierId,
                  supplierName: rule.supplier.name,
                  quantity: rule.reorderQty,
                  daysRemaining,
                  safetyDays: rule.safetyDays,
                }),
              },
            });
          }
          break;

        case "EMERGENCY":
          // Create, send PO immediately and create critical alert
          action = "PO_SENT";
          reason = `EMERGENCY: Stock critically low (${daysRemaining} days remaining). PO sent immediately.`;

          if (!dryRun) {
            const po = await db.purchaseOrder.create({
              data: {
                orderNumber: generateOrderNumber(),
                locationId: location.id,
                supplierId: rule.supplierId,
                status: "SENT",
                sentAt: new Date(),
                notes: `EMERGENCY ORDER: ${rule.product.name} critically low (${daysRemaining} days remaining)`,
                items: {
                  create: {
                    productId: rule.productId,
                    quantity: rule.reorderQty,
                    unitPrice: rule.priceCap,
                  },
                },
              },
            });
            orderId = po.id;

            // Create emergency alert
            await db.alert.create({
              data: {
                type: "EMERGENCY_REORDER",
                severity: "CRIT",
                title: `Emergency Reorder: ${rule.product.name}`,
                message: `An emergency purchase order has been sent to ${rule.supplier.name} for ${rule.product.name} at ${location.name}. Stock was critically low (${daysRemaining} days remaining).`,
                organizationId: membership.organizationId,
                locationId: location.id,
                relatedId: po.id,
                relatedType: "purchase_order",
              },
            });

            // Log the emergency order
            await db.auditLog.create({
              data: {
                action: "PO_EMERGENCY_SENT",
                entityType: "purchase_order",
                entityId: po.id,
                organizationId: membership.organizationId,
                locationId: location.id,
                userId: user?.id,
                details: JSON.stringify({
                  productId: rule.productId,
                  productName: rule.product.name,
                  supplierId: rule.supplierId,
                  supplierName: rule.supplier.name,
                  quantity: rule.reorderQty,
                  daysRemaining,
                  safetyDays: rule.safetyDays,
                  emergency: true,
                }),
              },
            });
          }
          break;
      }

      actions.push({
        productId: rule.productId,
        productName: rule.product.name,
        locationId: location.id,
        locationName: location.name,
        supplierId: rule.supplierId,
        supplierName: rule.supplier.name,
        daysRemaining,
        safetyDays: rule.safetyDays,
        reorderQty: rule.reorderQty,
        automationMode: rule.automationMode,
        action,
        orderId,
        reason,
      });
    }
  }

  // Log the reorder check
  if (!dryRun) {
    await db.auditLog.create({
      data: {
        action: "REORDER_CHECK",
        entityType: "organization",
        entityId: membership.organizationId,
        organizationId: membership.organizationId,
        locationId: locationId ?? null,
        userId: user?.id,
        details: JSON.stringify({
          locationsChecked: locations.length,
          rulesChecked: reorderRules.length,
          actionsTriggered: actions.length,
          dryRun,
        }),
      },
    });
  }

  return c.json({
    actions: actions.map((a) => ({
      productId: a.productId,
      productName: a.productName,
      locationId: a.locationId,
      locationName: a.locationName,
      daysRemaining: a.daysRemaining,
      safetyDays: a.safetyDays,
      automationMode: a.automationMode,
      action: a.action,
      orderId: a.orderId,
    })),
    dryRun,
    summary: {
      locationsChecked: locations.length,
      rulesChecked: reorderRules.length,
      actionsTriggered: actions.filter((a) => a.action !== "NO_ACTION").length,
      alertsCreated: actions.filter((a) => a.action === "ALERT_CREATED").length,
      draftsCreated: actions.filter((a) => a.action === "DRAFT_PO_CREATED").length,
      ordersSent: actions.filter((a) => a.action === "PO_SENT").length,
    },
  });
});

export { reorderRouter };
