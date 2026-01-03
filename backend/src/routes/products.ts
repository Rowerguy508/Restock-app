import { Hono, type Context } from "hono";
import { db } from "../db";
import { type AppType } from "../types";
import {
  createProductRequestSchema,
  updateProductRequestSchema,
} from "@/shared/contracts";

const productsRouter = new Hono<AppType>();

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

// GET /api/products - List products
productsRouter.get("/", async (c) => {
  const membership = await getMembership(c);
  if (!membership) return c.json({ error: "Unauthorized" }, 401);

  const products = await db.product.findMany({
    where: {
      organizationId: membership.organizationId,
      isActive: true,
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return c.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      unit: p.unit,
      category: p.category,
      organizationId: p.organizationId,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
});

// POST /api/products - Create product (owner only)
productsRouter.post("/", async (c) => {
  const membership = await requireOwner(c);
  if (!membership) return c.json({ error: "Owner access required" }, 403);

  const body = await c.req.json();
  const parsed = createProductRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  const product = await db.product.create({
    data: {
      name: parsed.data.name,
      sku: parsed.data.sku ?? null,
      unit: parsed.data.unit ?? "unit",
      category: parsed.data.category ?? null,
      organizationId: membership.organizationId,
    },
  });

  return c.json({
    id: product.id,
    name: product.name,
    sku: product.sku,
    unit: product.unit,
    category: product.category,
    organizationId: product.organizationId,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  });
});

// PUT /api/products/:id - Update product (owner only)
productsRouter.put("/:id", async (c) => {
  const membership = await requireOwner(c);
  if (!membership) return c.json({ error: "Owner access required" }, 403);

  const productId = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateProductRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  // Check product belongs to organization
  const existing = await db.product.findFirst({
    where: {
      id: productId,
      organizationId: membership.organizationId,
    },
  });

  if (!existing) {
    return c.json({ error: "Product not found" }, 404);
  }

  const product = await db.product.update({
    where: { id: productId },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.sku !== undefined && { sku: parsed.data.sku }),
      ...(parsed.data.unit !== undefined && { unit: parsed.data.unit }),
      ...(parsed.data.category !== undefined && { category: parsed.data.category }),
      ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
    },
  });

  return c.json({
    id: product.id,
    name: product.name,
    sku: product.sku,
    unit: product.unit,
    category: product.category,
    organizationId: product.organizationId,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  });
});

// DELETE /api/products/:id - Soft delete product (owner only)
productsRouter.delete("/:id", async (c) => {
  const membership = await requireOwner(c);
  if (!membership) return c.json({ error: "Owner access required" }, 403);

  const productId = c.req.param("id");

  // Check product belongs to organization
  const existing = await db.product.findFirst({
    where: {
      id: productId,
      organizationId: membership.organizationId,
    },
  });

  if (!existing) {
    return c.json({ error: "Product not found" }, 404);
  }

  // Soft delete
  await db.product.update({
    where: { id: productId },
    data: { isActive: false },
  });

  return c.json({ success: true });
});

export { productsRouter };
