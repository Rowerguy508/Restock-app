// contracts.ts
// Shared API contracts (schemas and types) used by both the server and the app.
// Import in the app as: `import { type GetMeResponse } from "@/shared/contracts"`
// Import in the server as: `import { createOrganizationRequestSchema } from "@/shared/contracts"`

import { z } from "zod";

// ============================================
// ENUMS
// ============================================

export const UserRole = {
  OWNER: "OWNER",
  MANAGER: "MANAGER",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AutomationMode = {
  MANUAL: "MANUAL",
  ASSISTED: "ASSISTED",
  AUTO: "AUTO",
  EMERGENCY: "EMERGENCY",
} as const;
export type AutomationMode = (typeof AutomationMode)[keyof typeof AutomationMode];

export const PurchaseOrderStatus = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  NOT_DELIVERED: "NOT_DELIVERED",
  CANCELLED: "CANCELLED",
} as const;
export type PurchaseOrderStatus = (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus];

export const AlertType = {
  LOW_STOCK: "LOW_STOCK",
  DRAFT_PO_PENDING: "DRAFT_PO_PENDING",
  EMERGENCY_REORDER: "EMERGENCY_REORDER",
  DELIVERY_NOT_CONFIRMED: "DELIVERY_NOT_CONFIRMED",
  DELIVERY_FAILED: "DELIVERY_FAILED",
} as const;
export type AlertType = (typeof AlertType)[keyof typeof AlertType];

export const AlertSeverity = {
  INFO: "INFO",
  WARN: "WARN",
  CRIT: "CRIT",
} as const;
export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];

export const StockStatus = {
  OK: "OK", // Green - plenty of stock
  LOW: "LOW", // Yellow - getting low
  CRITICAL: "CRITICAL", // Red - urgent
  OUT: "OUT", // Out of stock
} as const;
export type StockStatus = (typeof StockStatus)[keyof typeof StockStatus];

// ============================================
// COMMON SCHEMAS
// ============================================

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Organization = z.infer<typeof organizationSchema>;

export const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  organizationId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Location = z.infer<typeof locationSchema>;

export const membershipSchema = z.object({
  id: z.string(),
  userId: z.string(),
  organizationId: z.string(),
  role: z.enum(["OWNER", "MANAGER"]),
  locationId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Membership = z.infer<typeof membershipSchema>;

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  unit: z.string(),
  category: z.string().nullable(),
  organizationId: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Product = z.infer<typeof productSchema>;

export const supplierSchema = z.object({
  id: z.string(),
  name: z.string(),
  contactName: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  organizationId: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Supplier = z.infer<typeof supplierSchema>;

export const stockLevelSchema = z.object({
  id: z.string(),
  productId: z.string(),
  locationId: z.string(),
  onHand: z.number(),
  dailyUsage: z.number(),
  updatedAt: z.string(),
});
export type StockLevel = z.infer<typeof stockLevelSchema>;

export const reorderRuleSchema = z.object({
  id: z.string(),
  productId: z.string(),
  supplierId: z.string(),
  safetyDays: z.number(),
  reorderQty: z.number(),
  automationMode: z.enum(["MANUAL", "ASSISTED", "AUTO", "EMERGENCY"]),
  priceCap: z.number().nullable(),
  maxSpend: z.number().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ReorderRule = z.infer<typeof reorderRuleSchema>;

export const purchaseOrderItemSchema = z.object({
  id: z.string(),
  purchaseOrderId: z.string(),
  productId: z.string(),
  quantity: z.number(),
  unitPrice: z.number().nullable(),
  product: productSchema.optional(),
});
export type PurchaseOrderItem = z.infer<typeof purchaseOrderItemSchema>;

export const purchaseOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  locationId: z.string(),
  supplierId: z.string(),
  status: z.enum(["DRAFT", "SENT", "DELIVERED", "NOT_DELIVERED", "CANCELLED"]),
  totalAmount: z.number().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sentAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  confirmedById: z.string().nullable(),
  confirmPhoto: z.string().nullable(),
  items: z.array(purchaseOrderItemSchema).optional(),
  supplier: supplierSchema.optional(),
  location: locationSchema.optional(),
});
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;

export const alertSchema = z.object({
  id: z.string(),
  type: z.enum([
    "LOW_STOCK",
    "DRAFT_PO_PENDING",
    "EMERGENCY_REORDER",
    "DELIVERY_NOT_CONFIRMED",
    "DELIVERY_FAILED",
  ]),
  severity: z.enum(["INFO", "WARN", "CRIT"]),
  title: z.string(),
  message: z.string(),
  organizationId: z.string(),
  locationId: z.string().nullable(),
  isRead: z.boolean(),
  isDismissed: z.boolean(),
  relatedId: z.string().nullable(),
  relatedType: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  location: locationSchema.optional(),
});
export type Alert = z.infer<typeof alertSchema>;

// ============================================
// COMPUTED TYPES (for UI)
// ============================================

export const stockItemSchema = z.object({
  product: productSchema,
  stockLevel: stockLevelSchema.nullable(),
  daysRemaining: z.number().nullable(),
  status: z.enum(["OK", "LOW", "CRITICAL", "OUT"]),
  reorderRule: reorderRuleSchema.nullable(),
});
export type StockItem = z.infer<typeof stockItemSchema>;

// ============================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================

// GET /api/me - Get current user with membership
export const getMeResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
  }),
  membership: membershipSchema.nullable(),
  organization: organizationSchema.nullable(),
  location: locationSchema.nullable(),
});
export type GetMeResponse = z.infer<typeof getMeResponseSchema>;

// POST /api/onboarding - Create organization and become owner
export const createOrganizationRequestSchema = z.object({
  organizationName: z.string().min(1),
  locationName: z.string().min(1),
  locationAddress: z.string().optional(),
});
export type CreateOrganizationRequest = z.infer<typeof createOrganizationRequestSchema>;

export const createOrganizationResponseSchema = z.object({
  organization: organizationSchema,
  location: locationSchema,
  membership: membershipSchema,
});
export type CreateOrganizationResponse = z.infer<typeof createOrganizationResponseSchema>;

// GET /api/locations - List locations
export const getLocationsResponseSchema = z.object({
  locations: z.array(locationSchema),
});
export type GetLocationsResponse = z.infer<typeof getLocationsResponseSchema>;

// POST /api/locations - Create location
export const createLocationRequestSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
});
export type CreateLocationRequest = z.infer<typeof createLocationRequestSchema>;

// GET /api/products - List products
export const getProductsResponseSchema = z.object({
  products: z.array(productSchema),
});
export type GetProductsResponse = z.infer<typeof getProductsResponseSchema>;

// POST /api/products - Create product
export const createProductRequestSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  unit: z.string().default("unit"),
  category: z.string().optional(),
});
export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;

// PUT /api/products/:id - Update product
export const updateProductRequestSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;

// GET /api/suppliers - List suppliers
export const getSuppliersResponseSchema = z.object({
  suppliers: z.array(supplierSchema),
});
export type GetSuppliersResponse = z.infer<typeof getSuppliersResponseSchema>;

// POST /api/suppliers - Create supplier
export const createSupplierRequestSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
});
export type CreateSupplierRequest = z.infer<typeof createSupplierRequestSchema>;

// GET /api/stock/:locationId - Get stock levels for location
export const getStockResponseSchema = z.object({
  items: z.array(stockItemSchema),
  summary: z.object({
    total: z.number(),
    ok: z.number(),
    low: z.number(),
    critical: z.number(),
    out: z.number(),
  }),
});
export type GetStockResponse = z.infer<typeof getStockResponseSchema>;

// PUT /api/stock/:locationId/:productId - Update stock level (owner only)
export const updateStockRequestSchema = z.object({
  onHand: z.number().min(0),
  dailyUsage: z.number().min(0).optional(),
});
export type UpdateStockRequest = z.infer<typeof updateStockRequestSchema>;

// GET /api/orders - List purchase orders
export const getOrdersRequestSchema = z.object({
  locationId: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "DELIVERED", "NOT_DELIVERED", "CANCELLED"]).optional(),
});
export type GetOrdersRequest = z.infer<typeof getOrdersRequestSchema>;

export const getOrdersResponseSchema = z.object({
  orders: z.array(purchaseOrderSchema),
});
export type GetOrdersResponse = z.infer<typeof getOrdersResponseSchema>;

// POST /api/orders - Create purchase order (owner only)
export const createOrderRequestSchema = z.object({
  locationId: z.string(),
  supplierId: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().min(0.01),
      unitPrice: z.number().optional(),
    })
  ),
  notes: z.string().optional(),
  sendImmediately: z.boolean().default(false),
});
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

// PUT /api/orders/:id/send - Send purchase order
export const sendOrderResponseSchema = z.object({
  order: purchaseOrderSchema,
});
export type SendOrderResponse = z.infer<typeof sendOrderResponseSchema>;

// PUT /api/orders/:id/confirm - Confirm delivery (manager can do this)
export const confirmDeliveryRequestSchema = z.object({
  delivered: z.boolean(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
});
export type ConfirmDeliveryRequest = z.infer<typeof confirmDeliveryRequestSchema>;

// GET /api/alerts - List alerts
export const getAlertsResponseSchema = z.object({
  alerts: z.array(alertSchema),
  unreadCount: z.number(),
});
export type GetAlertsResponse = z.infer<typeof getAlertsResponseSchema>;

// PUT /api/alerts/:id/read - Mark alert as read
export const markAlertReadResponseSchema = z.object({
  alert: alertSchema,
});
export type MarkAlertReadResponse = z.infer<typeof markAlertReadResponseSchema>;

// PUT /api/alerts/:id/dismiss - Dismiss alert
export const dismissAlertResponseSchema = z.object({
  alert: alertSchema,
});
export type DismissAlertResponse = z.infer<typeof dismissAlertResponseSchema>;

// GET /api/reorder-rules - List reorder rules
export const getReorderRulesResponseSchema = z.object({
  rules: z.array(
    reorderRuleSchema.extend({
      product: productSchema,
      supplier: supplierSchema,
    })
  ),
});
export type GetReorderRulesResponse = z.infer<typeof getReorderRulesResponseSchema>;

// POST /api/reorder-rules - Create reorder rule
export const createReorderRuleRequestSchema = z.object({
  productId: z.string(),
  supplierId: z.string(),
  safetyDays: z.number().min(1).default(3),
  reorderQty: z.number().min(0.01).default(1),
  automationMode: z.enum(["MANUAL", "ASSISTED", "AUTO", "EMERGENCY"]).default("MANUAL"),
  priceCap: z.number().optional(),
  maxSpend: z.number().optional(),
});
export type CreateReorderRuleRequest = z.infer<typeof createReorderRuleRequestSchema>;

// PUT /api/reorder-rules/:id - Update reorder rule
export const updateReorderRuleRequestSchema = z.object({
  safetyDays: z.number().min(1).optional(),
  reorderQty: z.number().min(0.01).optional(),
  automationMode: z.enum(["MANUAL", "ASSISTED", "AUTO", "EMERGENCY"]).optional(),
  priceCap: z.number().nullable().optional(),
  maxSpend: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateReorderRuleRequest = z.infer<typeof updateReorderRuleRequestSchema>;

// POST /api/reorder/check - Trigger reorder check (owner only)
export const triggerReorderCheckRequestSchema = z.object({
  locationId: z.string().optional(), // If not provided, check all locations
  dryRun: z.boolean().default(true),
});
export type TriggerReorderCheckRequest = z.infer<typeof triggerReorderCheckRequestSchema>;

export const triggerReorderCheckResponseSchema = z.object({
  actions: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      locationId: z.string(),
      locationName: z.string(),
      daysRemaining: z.number(),
      safetyDays: z.number(),
      automationMode: z.enum(["MANUAL", "ASSISTED", "AUTO", "EMERGENCY"]),
      action: z.enum(["ALERT_CREATED", "DRAFT_PO_CREATED", "PO_SENT", "NO_ACTION"]),
      orderId: z.string().nullable(),
    })
  ),
  dryRun: z.boolean(),
});
export type TriggerReorderCheckResponse = z.infer<typeof triggerReorderCheckResponseSchema>;

// GET /api/dashboard - Dashboard summary
export const getDashboardResponseSchema = z.object({
  stockSummary: z.object({
    total: z.number(),
    ok: z.number(),
    low: z.number(),
    critical: z.number(),
    out: z.number(),
  }),
  pendingOrders: z.number(),
  activeAlerts: z.number(),
  recentOrders: z.array(purchaseOrderSchema),
  criticalItems: z.array(stockItemSchema),
});
export type GetDashboardResponse = z.infer<typeof getDashboardResponseSchema>;

// POST /api/team/invite - Invite team member (owner only)
export const inviteTeamMemberRequestSchema = z.object({
  email: z.string().email(),
  role: z.enum(["OWNER", "MANAGER"]),
  locationId: z.string().optional(), // Required if role is MANAGER
});
export type InviteTeamMemberRequest = z.infer<typeof inviteTeamMemberRequestSchema>;

// ============================================
// LEGACY SCHEMAS (keep for compatibility)
// ============================================

// GET /api/sample
export const getSampleResponseSchema = z.object({
  message: z.string(),
});
export type GetSampleResponse = z.infer<typeof getSampleResponseSchema>;

// POST /api/sample
export const postSampleRequestSchema = z.object({
  value: z.string(),
});
export type PostSampleRequest = z.infer<typeof postSampleRequestSchema>;
export const postSampleResponseSchema = z.object({
  message: z.string(),
});
export type PostSampleResponse = z.infer<typeof postSampleResponseSchema>;

// POST /api/upload/image
export const uploadImageRequestSchema = z.object({
  image: z.instanceof(File),
});
export type UploadImageRequest = z.infer<typeof uploadImageRequestSchema>;
export const uploadImageResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  url: z.string(),
  filename: z.string(),
});
export type UploadImageResponse = z.infer<typeof uploadImageResponseSchema>;
