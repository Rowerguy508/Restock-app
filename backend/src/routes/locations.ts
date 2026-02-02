import { Hono, type Context } from "hono";
import { db } from "../db";
import { getOrganizationSubscription, SUBSCRIPTION_TIERS } from "../subscription";
import { type AppType } from "../types";
import { createLocationRequestSchema } from "../../shared/contracts";

const locationsRouter = new Hono<AppType>();

// Helper to check if user is an owner
const requireOwner = async (c: Context<AppType>) => {
  const user = c.get("user");
  if (!user) return null;

  const membership = await db.membership.findUnique({
    where: { userId: user.id },
  });

  if (!membership || membership.role !== "OWNER") return null;
  return membership;
};

// Helper to check location limit
const checkLocationLimit = async (organizationId: string, c: Context<AppType>) => {
  const subscription = await getOrganizationSubscription(organizationId);
  
  if (!subscription || !subscription.isActive) {
    return {
      allowed: false,
      error: "subscription_inactive",
      message: "Tu suscripción no está activa",
    };
  }

  const tierLimits = SUBSCRIPTION_TIERS[subscription.tier as keyof typeof SUBSCRIPTION_TIERS]?.limits;
  const maxLocations = tierLimits?.locations ?? -1;

  if (maxLocations === -1) {
    return { allowed: true };
  }

  const currentCount = await db.location.count({ where: { organizationId } });
  
  if (currentCount >= maxLocations) {
    return {
      allowed: false,
      error: "limit_exceeded",
      message: `Has alcanzado el límite de ${maxLocations} ubicaciones. Actualiza tu plan para más.`,
      upgradeUrl: "/subscription",
      current: currentCount,
      limit: maxLocations,
    };
  }

  return { allowed: true, current: currentCount, limit: maxLocations };
};

// GET /api/locations - List locations
locationsRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const membership = await db.membership.findUnique({
    where: { userId: user.id },
  });

  if (!membership) return c.json({ error: "No organization" }, 403);

  // Owners see all locations, managers see only their assigned location
  const locations = await db.location.findMany({
    where: {
      organizationId: membership.organizationId,
      ...(membership.role === "MANAGER" && membership.locationId
        ? { id: membership.locationId }
        : {}),
    },
    orderBy: { name: "asc" },
  });

  return c.json({
    locations: locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      address: loc.address,
      organizationId: loc.organizationId,
      createdAt: loc.createdAt.toISOString(),
      updatedAt: loc.updatedAt.toISOString(),
    })),
  });
});

// POST /api/locations - Create location (owner only)
locationsRouter.post("/", async (c) => {
  const membership = await requireOwner(c);
  if (!membership) return c.json({ error: "Owner access required" }, 403);

  // Check subscription limit
  const limitCheck = await checkLocationLimit(membership.organizationId, c);
  if (!limitCheck.allowed) {
    return c.json({ 
      error: limitCheck.error, 
      message: limitCheck.message,
      upgradeUrl: limitCheck.upgradeUrl,
      current: limitCheck.current,
      limit: limitCheck.limit,
    }, 403);
  }

  const body = await c.req.json();
  const parsed = createLocationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  const location = await db.location.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      organizationId: membership.organizationId,
    },
  });

  return c.json({
    id: location.id,
    name: location.name,
    address: location.address,
    organizationId: location.organizationId,
    createdAt: location.createdAt.toISOString(),
    updatedAt: location.updatedAt.toISOString(),
  });
});

export { locationsRouter };
