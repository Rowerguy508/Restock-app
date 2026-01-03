import { Hono, type Context } from "hono";
import { db } from "../db";
import { type AppType } from "../types";
import {
  createReorderRuleRequestSchema,
  updateReorderRuleRequestSchema,
} from "@/shared/contracts";

const reorderRulesRouter = new Hono<AppType>();

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

// GET /api/reorder-rules - List reorder rules
reorderRulesRouter.get("/", async (c) => {
  const membership = await getMembership(c);
  if (!membership) return c.json({ error: "Unauthorized" }, 401);

  // Only owners can view reorder rules
  if (membership.role !== "OWNER") {
    return c.json({ error: "Owner access required" }, 403);
  }

  const rules = await db.reorderRule.findMany({
    where: {
      product: {
        organizationId: membership.organizationId,
      },
    },
    include: {
      product: true,
      supplier: true,
    },
    orderBy: [
      { product: { name: "asc" } },
    ],
  });

  return c.json({
    rules: rules.map((r) => ({
      id: r.id,
      productId: r.productId,
      supplierId: r.supplierId,
      safetyDays: r.safetyDays,
      reorderQty: r.reorderQty,
      automationMode: r.automationMode,
      priceCap: r.priceCap,
      maxSpend: r.maxSpend,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      product: {
        id: r.product.id,
        name: r.product.name,
        sku: r.product.sku,
        unit: r.product.unit,
        category: r.product.category,
        organizationId: r.product.organizationId,
        isActive: r.product.isActive,
        createdAt: r.product.createdAt.toISOString(),
        updatedAt: r.product.updatedAt.toISOString(),
      },
      supplier: {
        id: r.supplier.id,
        name: r.supplier.name,
        contactName: r.supplier.contactName,
        phone: r.supplier.phone,
        email: r.supplier.email,
        address: r.supplier.address,
        organizationId: r.supplier.organizationId,
        isActive: r.supplier.isActive,
        createdAt: r.supplier.createdAt.toISOString(),
        updatedAt: r.supplier.updatedAt.toISOString(),
      },
    })),
  });
});

// POST /api/reorder-rules - Create reorder rule (owner only)
reorderRulesRouter.post("/", async (c) => {
  const membership = await requireOwner(c);
  if (!membership) return c.json({ error: "Owner access required" }, 403);

  const body = await c.req.json();
  const parsed = createReorderRuleRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  // Verify product belongs to organization
  const product = await db.product.findFirst({
    where: {
      id: parsed.data.productId,
      organizationId: membership.organizationId,
    },
  });

  if (!product) {
    return c.json({ error: "Product not found" }, 404);
  }

  // Verify supplier belongs to organization
  const supplier = await db.supplier.findFirst({
    where: {
      id: parsed.data.supplierId,
      organizationId: membership.organizationId,
    },
  });

  if (!supplier) {
    return c.json({ error: "Supplier not found" }, 404);
  }

  // Check if rule already exists for this product-supplier pair
  const existingRule = await db.reorderRule.findUnique({
    where: {
      productId_supplierId: {
        productId: parsed.data.productId,
        supplierId: parsed.data.supplierId,
      },
    },
  });

  if (existingRule) {
    return c.json({ error: "A reorder rule already exists for this product-supplier combination" }, 400);
  }

  const rule = await db.reorderRule.create({
    data: {
      productId: parsed.data.productId,
      supplierId: parsed.data.supplierId,
      safetyDays: parsed.data.safetyDays ?? 3,
      reorderQty: parsed.data.reorderQty ?? 1,
      automationMode: parsed.data.automationMode ?? "MANUAL",
      priceCap: parsed.data.priceCap ?? null,
      maxSpend: parsed.data.maxSpend ?? null,
    },
    include: {
      product: true,
      supplier: true,
    },
  });

  return c.json({
    id: rule.id,
    productId: rule.productId,
    supplierId: rule.supplierId,
    safetyDays: rule.safetyDays,
    reorderQty: rule.reorderQty,
    automationMode: rule.automationMode,
    priceCap: rule.priceCap,
    maxSpend: rule.maxSpend,
    isActive: rule.isActive,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
    product: {
      id: rule.product.id,
      name: rule.product.name,
      sku: rule.product.sku,
      unit: rule.product.unit,
      category: rule.product.category,
      organizationId: rule.product.organizationId,
      isActive: rule.product.isActive,
      createdAt: rule.product.createdAt.toISOString(),
      updatedAt: rule.product.updatedAt.toISOString(),
    },
    supplier: {
      id: rule.supplier.id,
      name: rule.supplier.name,
      contactName: rule.supplier.contactName,
      phone: rule.supplier.phone,
      email: rule.supplier.email,
      address: rule.supplier.address,
      organizationId: rule.supplier.organizationId,
      isActive: rule.supplier.isActive,
      createdAt: rule.supplier.createdAt.toISOString(),
      updatedAt: rule.supplier.updatedAt.toISOString(),
    },
  });
});

// PUT /api/reorder-rules/:id - Update reorder rule (owner only)
reorderRulesRouter.put("/:id", async (c) => {
  const membership = await requireOwner(c);
  if (!membership) return c.json({ error: "Owner access required" }, 403);

  const ruleId = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateReorderRuleRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  // Check rule exists and belongs to organization
  const existing = await db.reorderRule.findFirst({
    where: {
      id: ruleId,
      product: {
        organizationId: membership.organizationId,
      },
    },
  });

  if (!existing) {
    return c.json({ error: "Reorder rule not found" }, 404);
  }

  const rule = await db.reorderRule.update({
    where: { id: ruleId },
    data: {
      ...(parsed.data.safetyDays !== undefined && { safetyDays: parsed.data.safetyDays }),
      ...(parsed.data.reorderQty !== undefined && { reorderQty: parsed.data.reorderQty }),
      ...(parsed.data.automationMode !== undefined && { automationMode: parsed.data.automationMode }),
      ...(parsed.data.priceCap !== undefined && { priceCap: parsed.data.priceCap }),
      ...(parsed.data.maxSpend !== undefined && { maxSpend: parsed.data.maxSpend }),
      ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
    },
    include: {
      product: true,
      supplier: true,
    },
  });

  return c.json({
    id: rule.id,
    productId: rule.productId,
    supplierId: rule.supplierId,
    safetyDays: rule.safetyDays,
    reorderQty: rule.reorderQty,
    automationMode: rule.automationMode,
    priceCap: rule.priceCap,
    maxSpend: rule.maxSpend,
    isActive: rule.isActive,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
    product: {
      id: rule.product.id,
      name: rule.product.name,
      sku: rule.product.sku,
      unit: rule.product.unit,
      category: rule.product.category,
      organizationId: rule.product.organizationId,
      isActive: rule.product.isActive,
      createdAt: rule.product.createdAt.toISOString(),
      updatedAt: rule.product.updatedAt.toISOString(),
    },
    supplier: {
      id: rule.supplier.id,
      name: rule.supplier.name,
      contactName: rule.supplier.contactName,
      phone: rule.supplier.phone,
      email: rule.supplier.email,
      address: rule.supplier.address,
      organizationId: rule.supplier.organizationId,
      isActive: rule.supplier.isActive,
      createdAt: rule.supplier.createdAt.toISOString(),
      updatedAt: rule.supplier.updatedAt.toISOString(),
    },
  });
});

// DELETE /api/reorder-rules/:id - Delete reorder rule (owner only)
reorderRulesRouter.delete("/:id", async (c) => {
  const membership = await requireOwner(c);
  if (!membership) return c.json({ error: "Owner access required" }, 403);

  const ruleId = c.req.param("id");

  // Check rule exists and belongs to organization
  const existing = await db.reorderRule.findFirst({
    where: {
      id: ruleId,
      product: {
        organizationId: membership.organizationId,
      },
    },
  });

  if (!existing) {
    return c.json({ error: "Reorder rule not found" }, 404);
  }

  await db.reorderRule.delete({
    where: { id: ruleId },
  });

  return c.json({ success: true });
});

export { reorderRulesRouter };
