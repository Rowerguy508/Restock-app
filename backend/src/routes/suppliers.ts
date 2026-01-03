import { Hono, type Context } from "hono";
import { db } from "../db";
import { type AppType } from "../types";
import { createSupplierRequestSchema } from "@/shared/contracts";

const suppliersRouter = new Hono<AppType>();

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

// GET /api/suppliers - List suppliers
suppliersRouter.get("/", async (c) => {
  const membership = await getMembership(c);
  if (!membership) return c.json({ error: "Unauthorized" }, 401);

  const suppliers = await db.supplier.findMany({
    where: {
      organizationId: membership.organizationId,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  return c.json({
    suppliers: suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      contactName: s.contactName,
      phone: s.phone,
      email: s.email,
      address: s.address,
      organizationId: s.organizationId,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
  });
});

// POST /api/suppliers - Create supplier (owner only)
suppliersRouter.post("/", async (c) => {
  const membership = await requireOwner(c);
  if (!membership) return c.json({ error: "Owner access required" }, 403);

  const body = await c.req.json();
  const parsed = createSupplierRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  const supplier = await db.supplier.create({
    data: {
      name: parsed.data.name,
      contactName: parsed.data.contactName ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      address: parsed.data.address ?? null,
      organizationId: membership.organizationId,
    },
  });

  return c.json({
    id: supplier.id,
    name: supplier.name,
    contactName: supplier.contactName,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    organizationId: supplier.organizationId,
    isActive: supplier.isActive,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  });
});

export { suppliersRouter };
