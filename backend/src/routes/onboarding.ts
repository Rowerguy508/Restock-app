import { Hono } from "hono";
import { db } from "../db";
import { type AppType } from "../types";
import { createOrganizationRequestSchema } from "@/shared/contracts";

const onboardingRouter = new Hono<AppType>();

// POST /api/onboarding - Create organization and become owner
onboardingRouter.post("/", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Check if user already has a membership
  const existingMembership = await db.membership.findUnique({
    where: { userId: user.id },
  });

  if (existingMembership) {
    return c.json({ error: "User already belongs to an organization" }, 400);
  }

  const body = await c.req.json();
  const parsed = createOrganizationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  const { organizationName, locationName, locationAddress } = parsed.data;

  // Create organization, location, and membership in a transaction
  const result = await db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: organizationName },
    });

    const location = await tx.location.create({
      data: {
        name: locationName,
        address: locationAddress ?? null,
        organizationId: organization.id,
      },
    });

    const membership = await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: "OWNER",
        locationId: null, // Owners see all locations
      },
    });

    return { organization, location, membership };
  });

  return c.json({
    organization: {
      id: result.organization.id,
      name: result.organization.name,
      createdAt: result.organization.createdAt.toISOString(),
      updatedAt: result.organization.updatedAt.toISOString(),
    },
    location: {
      id: result.location.id,
      name: result.location.name,
      address: result.location.address,
      organizationId: result.location.organizationId,
      createdAt: result.location.createdAt.toISOString(),
      updatedAt: result.location.updatedAt.toISOString(),
    },
    membership: {
      id: result.membership.id,
      userId: result.membership.userId,
      organizationId: result.membership.organizationId,
      role: result.membership.role,
      locationId: result.membership.locationId,
      createdAt: result.membership.createdAt.toISOString(),
      updatedAt: result.membership.updatedAt.toISOString(),
    },
  });
});

export { onboardingRouter };
