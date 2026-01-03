import { Hono, type Context } from "hono";
import { db } from "../db";
import { type AppType } from "../types";

const alertsRouter = new Hono<AppType>();

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

// GET /api/alerts - List alerts (owners see all, managers see their location)
alertsRouter.get("/", async (c) => {
  const membership = await getMembership(c);
  if (!membership) return c.json({ error: "Unauthorized" }, 401);

  // Managers can only see alerts for their location
  const locationFilter =
    membership.role === "MANAGER" && membership.locationId
      ? { locationId: membership.locationId }
      : {};

  const alerts = await db.alert.findMany({
    where: {
      organizationId: membership.organizationId,
      isDismissed: false,
      ...locationFilter,
    },
    include: {
      location: { select: { id: true, name: true, address: true, organizationId: true } },
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
  });

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return c.json({
    alerts: alerts.map((a) => ({
      id: a.id,
      type: a.type as
        | "LOW_STOCK"
        | "DRAFT_PO_PENDING"
        | "EMERGENCY_REORDER"
        | "DELIVERY_NOT_CONFIRMED"
        | "DELIVERY_FAILED",
      severity: a.severity as "INFO" | "WARN" | "CRIT",
      title: a.title,
      message: a.message,
      organizationId: a.organizationId,
      locationId: a.locationId,
      isRead: a.isRead,
      isDismissed: a.isDismissed,
      relatedId: a.relatedId,
      relatedType: a.relatedType,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      location: a.location
        ? {
            id: a.location.id,
            name: a.location.name,
            address: a.location.address,
            organizationId: a.location.organizationId,
            createdAt: "",
            updatedAt: "",
          }
        : undefined,
    })),
    unreadCount,
  });
});

// PUT /api/alerts/:id/read - Mark alert as read
alertsRouter.put("/:id/read", async (c) => {
  const membership = await getMembership(c);
  if (!membership) return c.json({ error: "Unauthorized" }, 401);

  const alertId = c.req.param("id");

  const existing = await db.alert.findFirst({
    where: {
      id: alertId,
      organizationId: membership.organizationId,
    },
  });

  if (!existing) return c.json({ error: "Alert not found" }, 404);

  const alert = await db.alert.update({
    where: { id: alertId },
    data: { isRead: true },
  });

  return c.json({
    alert: {
      id: alert.id,
      type: alert.type as
        | "LOW_STOCK"
        | "DRAFT_PO_PENDING"
        | "EMERGENCY_REORDER"
        | "DELIVERY_NOT_CONFIRMED"
        | "DELIVERY_FAILED",
      severity: alert.severity as "INFO" | "WARN" | "CRIT",
      title: alert.title,
      message: alert.message,
      organizationId: alert.organizationId,
      locationId: alert.locationId,
      isRead: alert.isRead,
      isDismissed: alert.isDismissed,
      relatedId: alert.relatedId,
      relatedType: alert.relatedType,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
    },
  });
});

// PUT /api/alerts/:id/dismiss - Dismiss alert (owner only)
alertsRouter.put("/:id/dismiss", async (c) => {
  const membership = await requireOwner(c);
  if (!membership) return c.json({ error: "Owner access required" }, 403);

  const alertId = c.req.param("id");

  const existing = await db.alert.findFirst({
    where: {
      id: alertId,
      organizationId: membership.organizationId,
    },
  });

  if (!existing) return c.json({ error: "Alert not found" }, 404);

  const alert = await db.alert.update({
    where: { id: alertId },
    data: { isDismissed: true },
  });

  return c.json({
    alert: {
      id: alert.id,
      type: alert.type as
        | "LOW_STOCK"
        | "DRAFT_PO_PENDING"
        | "EMERGENCY_REORDER"
        | "DELIVERY_NOT_CONFIRMED"
        | "DELIVERY_FAILED",
      severity: alert.severity as "INFO" | "WARN" | "CRIT",
      title: alert.title,
      message: alert.message,
      organizationId: alert.organizationId,
      locationId: alert.locationId,
      isRead: alert.isRead,
      isDismissed: alert.isDismissed,
      relatedId: alert.relatedId,
      relatedType: alert.relatedType,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
    },
  });
});

export { alertsRouter };
