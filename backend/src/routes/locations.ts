import { Hono, type Context } from "hono";
import { db } from "../db";
import { type AppType } from "../types";
import { createLocationRequestSchema } from "@/shared/contracts";

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
