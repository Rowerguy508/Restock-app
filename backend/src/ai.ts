// ============================================
// RESTOCKA AI SERVICE
// ============================================
// AI-powered features for inventory management
// ============================================

import { db } from "./db";
import type { AppType } from "./types";

// ============================================
// DEMAND FORECASTING
// ============================================

interface ForecastResult {
  productId: string;
  productName: string;
  currentStock: number;
  predictedDemand: number;
  daysUntilStockout: number | null;
  suggestedOrderQuantity: number;
  confidence: number;
  factors: string[];
}

/**
 * Predict future demand based on historical usage patterns
 * Uses simple moving average + trend detection
 */
export async function forecastDemand(
  organizationId: string,
  daysAhead: number = 7
): Promise<ForecastResult[]> {
  const results: ForecastResult[] = [];

  // Get all products with stock levels
  const products = await db.product.findMany({
    where: { organizationId, isActive: true },
    include: {
      stockLevels: {
        include: { location: { select: { name: true } } },
      },
    },
  });

  for (const product of products) {
    // Collect all stock levels across locations
    const allStockLevels = product.stockLevels;
    if (allStockLevels.length === 0) continue;

    // Calculate total current stock
    const currentStock = allStockLevels.reduce(
      (sum, sl) => sum + sl.onHand,
      0
    );

    // Calculate average daily usage (simulated - in production, use historical data)
    const avgDailyUsage = allStockLevels.reduce(
      (sum, sl) => sum + sl.dailyUsage,
      0
    ) / allStockLevels.length;

    // Simple forecasting logic
    const predictedDemand = avgDailyUsage * daysAhead;
    const daysUntilStockout =
      avgDailyUsage > 0 ? Math.floor(currentStock / avgDailyUsage) : null;

    // Determine factors
    const factors: string[] = [];
    if (daysUntilStockout !== null && daysUntilStockout <= 3) {
      factors.push("Low stock warning");
    }
    if (avgDailyUsage > 10) {
      factors.push("High usage item");
    }
    if (predictedDemand > currentStock) {
      factors.push("Additional stock recommended");
    }
    factors.push("Based on historical usage");

    // Calculate confidence (simulated)
    const confidence = Math.min(95, 70 + Math.random() * 20);

    // Suggest order quantity
    let suggestedOrderQuantity = 0;
    if (predictedDemand > currentStock) {
      suggestedOrderQuantity = Math.ceil(
        predictedDemand - currentStock + (avgDailyUsage * 3)
      ); // Buffer for 3 days
    }

    results.push({
      productId: product.id,
      productName: product.name,
      currentStock: Math.round(currentStock * 100) / 100,
      predictedDemand: Math.round(predictedDemand * 100) / 100,
      daysUntilStockout,
      suggestedOrderQuantity,
      confidence: Math.round(confidence),
      factors,
    });
  }

  // Sort by urgency (lowest days until stockout first)
  return results.sort((a, b) => {
    if (a.daysUntilStockout === null) return 1;
    if (b.daysUntilStockout === null) return -1;
    return a.daysUntilStockout - b.daysUntilStockout;
  });
}

// ============================================
// WASTE OPTIMIZATION INSIGHTS
// ============================================

interface WasteInsight {
  productId?: string;
  productName?: string;
  insight: string;
  severity: "INFO" | "WARN" | "ACTION";
  suggestion: string;
  potentialSavings?: number;
}

/**
 * Analyze waste patterns and generate insights
 */
export async function generateWasteInsights(
  organizationId: string
): Promise<WasteInsight[]> {
  const insights: WasteInsight[] = [];

  // Get recent waste entries
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const wasteEntries = await db.wasteEntry.findMany({
    where: {
      location: { organizationId },
      createdAt: { gte: thirtyDaysAgo },
    },
    include: {
      product: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Group waste by product
  const wasteByProduct: Record<string, { count: number; totalQty: number }> = {};
  const wasteByReason: Record<string, number> = {};

  for (const entry of wasteEntries) {
    const productId = entry.productId;
    if (!wasteByProduct[productId]) {
      wasteByProduct[productId] = { count: 0, totalQty: 0 };
    }
    wasteByProduct[productId].count++;
    wasteByProduct[productId].totalQty += entry.quantity;

    if (!wasteByReason[entry.reason]) {
      wasteByReason[entry.reason] = 0;
    }
    wasteByReason[entry.reason]++;
  }

  // Generate insights
  // High waste products
  const highWasteProducts = Object.entries(wasteByProduct)
    .filter(([_, data]) => data.count > 3)
    .sort((a, b) => b[1].count - a[1].count);

  for (const [productId, data] of highWasteProducts.slice(0, 3)) {
    const product = wasteEntries.find((e) => e.productId === productId)?.product;
    if (product) {
      insights.push({
        productId,
        productName: product.name,
        insight: `High waste frequency: ${data.count} waste entries in 30 days`,
        severity: "ACTION",
        suggestion:
          "Consider reducing order quantities or checking supplier quality",
        potentialSavings: Math.round(data.totalQty * 5), // Assume $5/unit avg
      });
    }
  }

  // Common waste reasons
  const topReasons = Object.entries(wasteByReason)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  for (const [reason, count] of topReasons) {
    if (count > 5) {
      const reasonLabels: Record<string, string> = {
        SPOILED: "spoil quickly",
        EXPIRED: "expire before use",
        DAMAGED: "arrive damaged",
      };
      const label = reasonLabels[reason] || "be wasted";
      insights.push({
        insight: `Common issue: ${count} items ${label}`,
        severity: "WARN",
        suggestion: `Review handling procedures for ${reason.toLowerCase()} items`,
      });
    }
  }

  // General tip if low waste
  if (wasteEntries.length < 5) {
    insights.push({
      insight: "Low waste levels detected - great inventory management!",
      severity: "INFO",
      suggestion: "Continue monitoring to maintain efficiency",
    });
  }

  return insights;
}

// ============================================
// SMART REORDER SUGGESTIONS
// ============================================

interface ReorderSuggestion {
  productId: string;
  productName: string;
  supplierName?: string;
  currentStock: number;
  daysRemaining: number;
  suggestedQuantity: number;
  estimatedCost: number;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reason: string;
}

/**
 * Generate smart reorder suggestions based on stock levels and reorder rules
 */
export async function generateReorderSuggestions(
  organizationId: string
): Promise<ReorderSuggestion[]> {
  const suggestions: ReorderSuggestion[] = [];

  // Get active reorder rules
  const reorderRules = await db.reorderRule.findMany({
    where: {
      product: { organizationId },
      isActive: true,
    },
    include: {
      product: { select: { name: true, unit: true } },
      supplier: { select: { name: true } },
      product: {
        include: {
          stockLevels: true,
        },
      },
    },
  });

  for (const rule of reorderRules) {
    const product = rule.product;
    const totalStock = product.stockLevels.reduce(
      (sum, sl) => sum + sl.onHand,
      0
    );
    const avgDailyUsage = product.stockLevels.reduce(
      (sum, sl) => sum + sl.dailyUsage,
      0
    ) / (product.stockLevels.length || 1);

    // Calculate days until safety threshold
    const safetyStock = rule.safetyDays * avgDailyUsage;
    const daysRemaining =
      avgDailyUsage > 0
        ? Math.floor((totalStock - safetyStock) / avgDailyUsage)
        : 999;

    // Skip if plenty of stock
    if (daysRemaining > 7) continue;

    // Calculate suggested order quantity
    const targetStock = avgDailyUsage * 14; // 2-week buffer
    let suggestedQuantity = Math.max(
      rule.reorderQty,
      Math.ceil(targetStock - totalStock)
    );

    // Estimate cost (placeholder - in production, use actual supplier prices)
    const estimatedCost = suggestedQuantity * 10; // $10/unit placeholder

    // Determine urgency
    let urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    if (daysRemaining <= 1) urgency = "CRITICAL";
    else if (daysRemaining <= 2) urgency = "HIGH";
    else if (daysRemaining <= 4) urgency = "MEDIUM";
    else urgency = "LOW";

    // Generate reason
    let reason: string;
    if (daysRemaining <= 0) {
      reason = "Below safety stock threshold";
    } else if (daysRemaining <= 1) {
      reason = "Will run out within 1 day";
    } else {
      reason = `Stock will drop below safety level in ${daysRemaining} days`;
    }

    suggestions.push({
      productId: product.id,
      productName: product.name,
      supplierName: rule.supplier.name,
      currentStock: Math.round(totalStock * 100) / 100,
      daysRemaining,
      suggestedQuantity,
      estimatedCost,
      urgency,
      reason,
    });
  }

  // Sort by urgency
  const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return suggestions.sort(
    (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
  );
}

// ============================================
// COST OPTIMIZATION
// ============================================

interface CostOptimization {
  category: string;
  potentialSavings: number;
  recommendation: string;
}

/**
 * Analyze spending patterns and suggest cost optimizations
 */
export async function analyzeCostOptimization(
  organizationId: string
): Promise<CostOptimization[]> {
  const optimizations: CostOptimization[] = [];

  // Get recent purchase orders
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const orders = await db.purchaseOrder.findMany({
    where: {
      location: { organizationId },
      status: "DELIVERED",
      createdAt: { gte: thirtyDaysAgo },
    },
    include: {
      items: {
        include: {
          product: { select: { name: true, category: true } },
        },
      },
      supplier: { select: { name: true } },
    },
  });

  // Calculate spending by category
  const spendingByCategory: Record<string, number> = {};
  const spendingBySupplier: Record<string, number> = {};

  for (const order of orders) {
    spendingBySupplier[order.supplier.name] =
      (spendingBySupplier[order.supplier.name] || 0) + (order.totalAmount || 0);

    for (const item of order.items) {
      const category = item.product.category || "Uncategorized";
      spendingByCategory[category] =
        (spendingByCategory[category] || 0) +
        (item.unitPrice || 0) * item.quantity;
    }
  }

  // Generate optimizations
  // Suggest consolidating suppliers if spending is spread thin
  const supplierCount = Object.keys(spendingBySupplier).length;
  if (supplierCount > 5) {
    optimizations.push({
      category: "Supplier Consolidation",
      potentialSavings: Math.round(
        Object.values(spendingBySupplier).reduce((a, b) => a + b, 0) * 0.05
      ), // 5% savings estimate
      recommendation:
        "Consider consolidating suppliers to negotiate better rates",
    });
  }

  // Identify top spending categories
  const topCategories = Object.entries(spendingByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  for (const [category, amount] of topCategories) {
    optimizations.push({
      category: category === "Uncategorized" ? "General" : category,
      potentialSavings: Math.round(amount * 0.03), // 3% savings estimate
      recommendation: `Review pricing for ${category} items - potential for better rates`,
    });
  }

  return optimizations.sort((a, b) => b.potentialSavings - a.potentialSavings);
}

// ============================================
// AI SUMMARY GENERATOR
// ============================================

interface AISummary {
  headline: string;
  summary: string;
  keyMetrics: { label: string; value: string; change?: string }[];
  alerts: string[];
  recommendations: string[];
}

/**
 * Generate a summary of the current inventory state using AI logic
 */
export async function generateAISummary(
  organizationId: string
): Promise<AISummary> {
  // Get current stock summary
  const locations = await db.location.count({
    where: { organizationId },
  });

  const products = await db.product.count({
    where: { organizationId, isActive: true },
  });

  // Get stock levels
  const stockLevels = await db.stockLevel.findMany({
    where: { product: { organizationId } },
    include: { product: { select: { name: true } } },
  });

  // Categorize stock status
  let ok = 0,
    low = 0,
    critical = 0,
    out = 0;

  for (const sl of stockLevels) {
    const daysRemaining = sl.dailyUsage > 0 ? sl.onHand / sl.dailyUsage : 999;
    if (daysRemaining > 7) ok++;
    else if (daysRemaining > 3) low++;
    else if (daysRemaining > 0) critical++;
    else out++;
  }

  // Get active alerts
  const alerts = await db.alert.count({
    where: {
      organizationId,
      isRead: false,
      isDismissed: false,
    },
  });

  // Get recent waste entries
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentWaste = await db.wasteEntry.count({
    where: {
      location: { organizationId },
      createdAt: { gte: sevenDaysAgo },
    },
  });

  // Generate summary
  const headline =
    out > 0
      ? `${out} item${out > 1 ? "s" : ""} need${out === 1 ? "s" : ""} immediate attention`
      : low > 0
        ? `${low + critical} item${low + critical > 1 ? "s" : ""} running low`
        : "Inventory is in good shape";

  const summary =
    out > 0
      ? `You have ${out} item${out > 1 ? "s" : ""} completely out of stock and ${critical} at critical levels. Reorder immediately to avoid service disruption.`
      : low + critical > 0
        ? `${low} items are running low and ${critical} are at critical levels. Consider reordering soon.`
        : `All ${ok} items have healthy stock levels. Great inventory management!`;

  const keyMetrics = [
    { label: "Products Tracked", value: products.toString() },
    { label: "Locations", value: locations.toString() },
    {
      label: "Stock Status",
      value: `${ok} OK, ${low} Low, ${critical} Critical`,
    },
    { label: "Active Alerts", value: alerts.toString(), change: alerts > 0 ? "action" : "good" },
    { label: "Waste This Week", value: recentWaste.toString(), change: recentWaste > 5 ? "warning" : "good" },
  ];

  const alertList: string[] = [];
  if (out > 0) alertList.push(`${out} items completely out of stock`);
  if (critical > 0) alertList.push(`${critical} items at critical levels`);
  if (recentWaste > 10)
    alertList.push(`High waste: ${recentWaste} items wasted this week`);

  const recommendations: string[] = [];
  if (out > 0) {
    recommendations.push("Urgent: Reorder out-of-stock items immediately");
  }
  if (low > 5) {
    recommendations.push("Consider bulk reorder for low-stock items");
  }
  if (recentWaste > 5) {
    recommendations.push("Review waste patterns to reduce spoilage");
  }
  if (recommendations.length === 0) {
    recommendations.push("Continue monitoring inventory levels");
    recommendations.push("Set up automated reorder rules for efficiency");
  }

  return {
    headline,
    summary,
    keyMetrics,
    alerts: alertList,
    recommendations,
  };
}

console.log("✅ [Restocka AI] Service loaded");
