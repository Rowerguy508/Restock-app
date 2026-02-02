// ============================================
// RESTOCKA AI API ROUTES
// ============================================
// AI-powered endpoints for insights, forecasting, and optimization
// ============================================

import { Hono } from "hono";
import {
  forecastDemand,
  generateWasteInsights,
  generateReorderSuggestions,
  analyzeCostOptimization,
  generateAISummary,
} from "../ai";
import { checkFeatureAccess } from "../subscription";
import type { AppType } from "../types";

const app = new Hono<AppType>();

// ============================================
// MIDDLEWARE
// ============================================
const requireAuth = async (c: Context<AppType>, next: () => Promise<void>) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Authentication required" }, 401);
  }
  await next();
};

const getOrgFromUser = async (c: Context<AppType>) => {
  const user = c.get("user");
  if (!user) return null;
  const membership = await db.membership.findUnique({
    where: { userId: user.id },
  });
  return membership?.organizationId;
};

// ============================================
// GET /api/ai/summary
// Get AI-generated summary of inventory state
// ============================================
app.get("/summary", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  try {
    const summary = await generateAISummary(organizationId);
    return c.json(summary);
  } catch (error) {
    console.error("AI Summary error:", error);
    return c.json({ error: "Failed to generate summary" }, 500);
  }
});

// ============================================
// GET /api/ai/forecast
// Get demand forecast for products
// ============================================
app.get("/forecast", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  const daysAhead = parseInt(c.req.query("days") || "7", 10);

  try {
    const forecast = await forecastDemand(organizationId, daysAhead);
    return c.json({
      forecast,
      generatedAt: new Date().toISOString(),
      period: `${daysAhead} days ahead`,
    });
  } catch (error) {
    console.error("Forecast error:", error);
    return c.json({ error: "Failed to generate forecast" }, 500);
  }
});

// ============================================
// GET /api/ai/waste-insights
// Get AI-powered waste reduction insights
// ============================================
app.get("/waste-insights", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  try {
    const insights = await generateWasteInsights(organizationId);
    return c.json({
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Waste insights error:", error);
    return c.json({ error: "Failed to generate insights" }, 500);
  }
});

// ============================================
// GET /api/ai/reorder-suggestions
// Get smart reorder suggestions
// ============================================
app.get("/reorder-suggestions", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  try {
    const suggestions = await generateReorderSuggestions(organizationId);
    return c.json({
      suggestions,
      generatedAt: new Date().toISOString(),
      count: suggestions.length,
    });
  } catch (error) {
    console.error("Reorder suggestions error:", error);
    return c.json({ error: "Failed to generate suggestions" }, 500);
  }
});

// ============================================
// GET /api/ai/cost-optimization
// Get cost optimization recommendations
// ============================================
app.get("/cost-optimization", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  try {
    const optimizations = await analyzeCostOptimization(organizationId);
    const totalPotentialSavings = optimizations.reduce(
      (sum, opt) => sum + opt.potentialSavings,
      0
    );
    return c.json({
      optimizations,
      totalPotentialSavings,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cost optimization error:", error);
    return c.json({ error: "Failed to analyze costs" }, 500);
  }
});

// ============================================
// GET /api/ai/insights-dashboard
// Get all AI insights for dashboard widget
// ============================================
app.get("/insights-dashboard", requireAuth, async (c) => {
  const organizationId = await getOrgFromUser(c);
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 403);
  }

  try {
    const [summary, forecast, wasteInsights, reorderSuggestions, costOptimization] =
      await Promise.all([
        generateAISummary(organizationId),
        forecastDemand(organizationId, 7),
        generateWasteInsights(organizationId),
        generateReorderSuggestions(organizationId),
        analyzeCostOptimization(organizationId),
      ]);

    // Get quick stats
    const totalProducts = await db.product.count({
      where: { organizationId, isActive: true },
    });

    const criticalItems = forecast.filter(
      (f) => f.daysUntilStockout !== null && f.daysUntilStockout <= 2
    ).length;

    const urgentSuggestions = reorderSuggestions.filter(
      (s) => s.urgency === "HIGH" || s.urgency === "CRITICAL"
    ).length;

    return c.json({
      summary,
      quickStats: {
        totalProducts,
        criticalItems,
        urgentReorders: urgentSuggestions,
        activeInsights: wasteInsights.length,
        potentialSavings: costOptimization.reduce((sum, o) => sum + o.potentialSavings, 0),
      },
      topReorders: reorderSuggestions.slice(0, 5),
      topInsights: wasteInsights.slice(0, 3),
      topOptimizations: costOptimization.slice(0, 3),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Dashboard insights error:", error);
    return c.json({ error: "Failed to generate dashboard insights" }, 500);
  }
});

export const aiRouter = app;
