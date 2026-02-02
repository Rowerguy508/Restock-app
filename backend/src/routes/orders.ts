import { Hono, type Context } from "hono";
import { db } from "../db";
import { type AppType } from "../types";
import { createOrderRequestSchema, confirmDeliveryRequestSchema } from "../../shared/contracts";
import { incrementOrderCount } from "../subscription";

const ordersRouter = new Hono<AppType>();

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

// Generate order number
const generateOrderNumber = () => {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PO-${datePart}-${randomPart}`;
};

// Format order for response
const formatOrder = (order: Awaited<ReturnType<typeof db.purchaseOrder.findUnique>> & {
  items?: Array<{
    id: string;
    purchaseOrderId: string;
    productId: string;
    quantity: number;
    unitPrice: number | null;
    product?: { id: string; name: string; unit: string } | null;
  }>;
  supplier?: { id: string; name: string } | null;
  location?: { id: string; name: string } | null;
}) => {
  if (!order) return null;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    locationId: order.locationId,
    supplierId: order.supplierId,
    status: order.status as "DRAFT" | "SENT" | "DELIVERED" | "NOT_DELIVERED" | "CANCELLED",
    totalAmount: order.totalAmount,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    sentAt: order.sentAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    confirmedById: order.confirmedById,
    confirmPhoto: order.confirmPhoto,
    items: order.items?.map((item) => ({
      id: item.id,
      purchaseOrderId: item.purchaseOrderId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      product: item.product
        ? {
            id: item.product.id,
            name: item.product.name,
            sku: null,
            unit: item.product.unit,
            category: null,
            organizationId: "",
            isActive: true,
            createdAt: "",
            updatedAt: "",
          }
        : undefined,
    })),
    supplier: order.supplier
      ? {
          id: order.supplier.id,
          name: order.supplier.name,
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
    location: order.location
      ? {
          id: order.location.id,
          name: order.location.name,
          address: null,
          organizationId: "",
          createdAt: "",
          updatedAt: "",
        }
      : undefined,
  };
};

// GET /api/orders - List purchase orders
ordersRouter.get("/", async (c) => {
  const membership = await getMembership(c);
  if (!membership) return c.json({ error: "Unauthorized" }, 401);

  const locationId = c.req.query("locationId");
  const status = c.req.query("status");

  // Build where clause
  const locationFilter =
    membership.role === "MANAGER" && membership.locationId
      ? { locationId: membership.locationId }
      : locationId
        ? { locationId }
        : {};

  // Managers can only see SENT orders
  const statusFilter =
    membership.role === "MANAGER"
      ? { status: { in: ["SENT", "DELIVERED", "NOT_DELIVERED"] } }
      : status
        ? { status }
        : {};

  const orders = await db.purchaseOrder.findMany({
    where: {
      location: { organizationId: membership.organizationId },
      ...locationFilter,
      ...statusFilter,
    },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, unit: true } } },
      },
      supplier: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json({
    orders: orders.map((o) => formatOrder(o)),
  });
});

// GET /api/orders/:id - Get single order
ordersRouter.get("/:id", async (c) => {
  const membership = await getMembership(c);
  if (!membership) return c.json({ error: "Unauthorized" }, 401);

  const orderId = c.req.param("id");

  const order = await db.purchaseOrder.findFirst({
    where: {
      id: orderId,
      location: { organizationId: membership.organizationId },
      ...(membership.role === "MANAGER" && membership.locationId
        ? { locationId: membership.locationId }
        : {}),
    },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, unit: true } } },
      },
      supplier: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
    },
  });

  if (!order) return c.json({ error: "Order not found" }, 404);

  return c.json(formatOrder(order));
});

// POST /api/orders - Create purchase order (owner only)
ordersRouter.post("/", async (c) => {
  const membership = await requireOwner(c);
  if (!membership) return c.json({ error: "Owner access required" }, 403);

  const body = await c.req.json();
  const parsed = createOrderRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  const { locationId, supplierId, items, notes, sendImmediately } = parsed.data;

  // Verify location and supplier belong to organization
  const [location, supplier] = await Promise.all([
    db.location.findFirst({
      where: { id: locationId, organizationId: membership.organizationId },
    }),
    db.supplier.findFirst({
      where: { id: supplierId, organizationId: membership.organizationId },
    }),
  ]);

  if (!location) return c.json({ error: "Location not found" }, 404);
  if (!supplier) return c.json({ error: "Supplier not found" }, 404);

  // Calculate total
  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * (item.unitPrice ?? 0),
    0
  );

  // Create order with items
  const order = await db.purchaseOrder.create({
    data: {
      orderNumber: generateOrderNumber(),
      locationId,
      supplierId,
      status: sendImmediately ? "SENT" : "DRAFT",
      totalAmount: totalAmount > 0 ? totalAmount : null,
      notes: notes ?? null,
      sentAt: sendImmediately ? new Date() : null,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice ?? null,
        })),
      },
    },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, unit: true } } },
      },
      supplier: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
    },
  });

  // Track monthly order usage for subscription limits
  await incrementOrderCount(membership.organizationId);

  return c.json(formatOrder(order));
});

// PUT /api/orders/:id/send - Send purchase order (owner only)
ordersRouter.put("/:id/send", async (c) => {
  const membership = await requireOwner(c);
  if (!membership) return c.json({ error: "Owner access required" }, 403);

  const orderId = c.req.param("id");

  const existing = await db.purchaseOrder.findFirst({
    where: {
      id: orderId,
      location: { organizationId: membership.organizationId },
      status: "DRAFT",
    },
  });

  if (!existing) return c.json({ error: "Order not found or already sent" }, 404);

  const order = await db.purchaseOrder.update({
    where: { id: orderId },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, unit: true } } },
      },
      supplier: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
    },
  });

  return c.json({ order: formatOrder(order) });
});

// PUT /api/orders/:id/confirm - Confirm delivery (manager can do this)
ordersRouter.put("/:id/confirm", async (c) => {
  const user = c.get("user");
  const membership = await getMembership(c);
  if (!membership || !user) return c.json({ error: "Unauthorized" }, 401);

  const orderId = c.req.param("id");
  const body = await c.req.json();
  const parsed = confirmDeliveryRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  // Find order and verify access
  const existing = await db.purchaseOrder.findFirst({
    where: {
      id: orderId,
      location: { organizationId: membership.organizationId },
      status: "SENT",
      ...(membership.role === "MANAGER" && membership.locationId
        ? { locationId: membership.locationId }
        : {}),
    },
    include: { items: true },
  });

  if (!existing) return c.json({ error: "Order not found or not sent" }, 404);

  const { delivered, notes, photoUrl } = parsed.data;

  // Update order status
  const order = await db.purchaseOrder.update({
    where: { id: orderId },
    data: {
      status: delivered ? "DELIVERED" : "NOT_DELIVERED",
      deliveredAt: delivered ? new Date() : null,
      confirmedById: user.id,
      confirmPhoto: photoUrl ?? null,
      notes: notes ? (existing.notes ? `${existing.notes}\n\n${notes}` : notes) : existing.notes,
    },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, unit: true } } },
      },
      supplier: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
    },
  });

  // If delivered, update stock levels
  if (delivered) {
    for (const item of existing.items) {
      await db.stockLevel.upsert({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId: existing.locationId,
          },
        },
        update: {
          onHand: { increment: item.quantity },
        },
        create: {
          productId: item.productId,
          locationId: existing.locationId,
          onHand: item.quantity,
          dailyUsage: 0,
        },
      });
    }
  }

  // If not delivered, create alert
  if (!delivered) {
    await db.alert.create({
      data: {
        type: "DELIVERY_FAILED",
        severity: "CRIT",
        title: `Delivery Failed: ${order.orderNumber}`,
        message: `Order ${order.orderNumber} was not delivered. ${notes ?? ""}`,
        organizationId: membership.organizationId,
        locationId: existing.locationId,
        relatedId: orderId,
        relatedType: "purchase_order",
      },
    });
  }

  return c.json(formatOrder(order));
});

export { ordersRouter };
