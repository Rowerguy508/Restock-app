import { Hono } from "hono";
import { db } from "../db";
import { type AppType } from "../types";
import { inviteTeamMemberRequestSchema } from "../../../shared/contracts";

const teamRouter = new Hono<AppType>();

// Helper to check if user is owner
async function isOwner(userId: string, organizationId: string): Promise<boolean> {
  const membership = await db.membership.findUnique({
    where: { userId },
  });
  return membership?.role === "OWNER" && membership?.organizationId === organizationId;
}

// GET /api/team - List team members
teamRouter.get("/", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const membership = await db.membership.findUnique({
    where: { userId: user.id },
    include: { organization: true },
  });

  if (!membership) {
    return c.json({ error: "No membership found" }, 404);
  }

  // Only owners can see team members
  if (membership.role !== "OWNER") {
    return c.json({ error: "Only owners can manage team" }, 403);
  }

  const members = await db.membership.findMany({
    where: { organizationId: membership.organizationId },
    include: {
      user: true,
      location: true,
    },
    orderBy: [
      { role: "asc" }, // OWNER first
      { createdAt: "asc" },
    ],
  });

  return c.json({
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      locationId: m.locationId,
      locationName: m.location?.name ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

// POST /api/team/invite - Invite a new team member
teamRouter.post("/invite", async (c) => {
  const currentUser = c.get("user");

  if (!currentUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const membership = await db.membership.findUnique({
    where: { userId: currentUser.id },
    include: { organization: true },
  });

  if (!membership || membership.role !== "OWNER") {
    return c.json({ error: "Only owners can invite team members" }, 403);
  }

  const body = await c.req.json();
  const parsed = inviteTeamMemberRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const { email, role, locationId } = parsed.data;

  // If inviting a manager, locationId is required
  if (role === "MANAGER" && !locationId) {
    return c.json({ error: "Location is required for manager role" }, 400);
  }

  // Validate location belongs to org
  if (locationId) {
    const location = await db.location.findFirst({
      where: {
        id: locationId,
        organizationId: membership.organizationId,
      },
    });
    if (!location) {
      return c.json({ error: "Location not found in organization" }, 404);
    }
  }

  // Check if user with email exists
  const existingUser = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { membership: true },
  });

  if (existingUser) {
    // Check if already a member of this org
    if (existingUser.membership?.organizationId === membership.organizationId) {
      return c.json({ error: "User is already a member of this organization" }, 400);
    }

    // Check if member of another org
    if (existingUser.membership) {
      return c.json({ error: "User is already a member of another organization" }, 400);
    }

    // User exists but not in any org - add them
    const newMembership = await db.membership.create({
      data: {
        userId: existingUser.id,
        organizationId: membership.organizationId,
        role,
        locationId: role === "MANAGER" ? locationId : null,
      },
      include: {
        user: true,
        location: true,
      },
    });

    return c.json({
      success: true,
      message: `${existingUser.email} has been added to the team`,
      member: {
        id: newMembership.id,
        userId: newMembership.userId,
        email: newMembership.user.email,
        name: newMembership.user.name,
        role: newMembership.role,
        locationId: newMembership.locationId,
        locationName: newMembership.location?.name ?? null,
        createdAt: newMembership.createdAt.toISOString(),
      },
    });
  }

  // User doesn't exist - they need to sign up first
  // For now, return an error instructing them to have the user sign up first
  return c.json({
    error: "User not found",
    message: "The user must create an account first. Have them sign up in the app, then try adding them again.",
  }, 404);
});

// PUT /api/team/:memberId - Update team member (change role/location)
teamRouter.put("/:memberId", async (c) => {
  const currentUser = c.get("user");
  const memberId = c.req.param("memberId");

  if (!currentUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const currentMembership = await db.membership.findUnique({
    where: { userId: currentUser.id },
  });

  if (!currentMembership || currentMembership.role !== "OWNER") {
    return c.json({ error: "Only owners can update team members" }, 403);
  }

  const targetMembership = await db.membership.findUnique({
    where: { id: memberId },
    include: { user: true },
  });

  if (!targetMembership || targetMembership.organizationId !== currentMembership.organizationId) {
    return c.json({ error: "Team member not found" }, 404);
  }

  // Can't modify your own membership
  if (targetMembership.userId === currentUser.id) {
    return c.json({ error: "You cannot modify your own membership" }, 400);
  }

  const body = await c.req.json();
  const { role, locationId } = body;

  // Validate
  if (role && !["OWNER", "MANAGER"].includes(role)) {
    return c.json({ error: "Invalid role" }, 400);
  }

  const newRole = role ?? targetMembership.role;
  let newLocationId = locationId !== undefined ? locationId : targetMembership.locationId;

  // If setting to manager, require location
  if (newRole === "MANAGER" && !newLocationId) {
    return c.json({ error: "Location is required for manager role" }, 400);
  }

  // If setting to owner, clear location
  if (newRole === "OWNER") {
    newLocationId = null;
  }

  // Validate location if provided
  if (newLocationId) {
    const location = await db.location.findFirst({
      where: {
        id: newLocationId,
        organizationId: currentMembership.organizationId,
      },
    });
    if (!location) {
      return c.json({ error: "Location not found" }, 404);
    }
  }

  const updated = await db.membership.update({
    where: { id: memberId },
    data: {
      role: newRole,
      locationId: newLocationId,
    },
    include: {
      user: true,
      location: true,
    },
  });

  return c.json({
    success: true,
    member: {
      id: updated.id,
      userId: updated.userId,
      email: updated.user.email,
      name: updated.user.name,
      role: updated.role,
      locationId: updated.locationId,
      locationName: updated.location?.name ?? null,
      createdAt: updated.createdAt.toISOString(),
    },
  });
});

// DELETE /api/team/:memberId - Remove team member
teamRouter.delete("/:memberId", async (c) => {
  const currentUser = c.get("user");
  const memberId = c.req.param("memberId");

  if (!currentUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const currentMembership = await db.membership.findUnique({
    where: { userId: currentUser.id },
  });

  if (!currentMembership || currentMembership.role !== "OWNER") {
    return c.json({ error: "Only owners can remove team members" }, 403);
  }

  const targetMembership = await db.membership.findUnique({
    where: { id: memberId },
    include: { user: true },
  });

  if (!targetMembership || targetMembership.organizationId !== currentMembership.organizationId) {
    return c.json({ error: "Team member not found" }, 404);
  }

  // Can't remove yourself
  if (targetMembership.userId === currentUser.id) {
    return c.json({ error: "You cannot remove yourself from the team" }, 400);
  }

  // Delete the membership (not the user)
  await db.membership.delete({
    where: { id: memberId },
  });

  return c.json({
    success: true,
    message: `${targetMembership.user.email} has been removed from the team`,
  });
});

export { teamRouter };
