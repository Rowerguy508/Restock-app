import { Hono } from "hono";
import { db } from "../db";
import { type AppType } from "../types";

const meRouter = new Hono<AppType>();

// GET /api/me - Get current user with membership info
meRouter.get("/", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const membership = await db.membership.findUnique({
    where: { userId: user.id },
    include: {
      organization: true,
      location: true,
    },
  });

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    membership: membership
      ? {
          id: membership.id,
          userId: membership.userId,
          organizationId: membership.organizationId,
          role: membership.role,
          locationId: membership.locationId,
          createdAt: membership.createdAt.toISOString(),
          updatedAt: membership.updatedAt.toISOString(),
        }
      : null,
    organization: membership?.organization
      ? {
          id: membership.organization.id,
          name: membership.organization.name,
          createdAt: membership.organization.createdAt.toISOString(),
          updatedAt: membership.organization.updatedAt.toISOString(),
        }
      : null,
    location: membership?.location
      ? {
          id: membership.location.id,
          name: membership.location.name,
          address: membership.location.address,
          organizationId: membership.location.organizationId,
          createdAt: membership.location.createdAt.toISOString(),
          updatedAt: membership.location.updatedAt.toISOString(),
        }
      : null,
  });
});

export { meRouter };
