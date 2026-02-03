import "@vibecodeapp/proxy"; // DO NOT REMOVE OTHERWISE VIBECODE PROXY WILL WORK
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { auth } from "../src/auth";
import { env } from "../src/env";
import { uploadRouter } from "../src/routes/upload";
import { sampleRouter } from "../src/routes/sample";
import { meRouter } from "../src/routes/me";
import { onboardingRouter } from "../src/routes/onboarding";
import { locationsRouter } from "../src/routes/locations";
import { productsRouter } from "../src/routes/products";
import { suppliersRouter } from "../src/routes/suppliers";
import { stockRouter } from "../src/routes/stock";
import { ordersRouter } from "../src/routes/orders";
import { alertsRouter } from "../src/routes/alerts";
import { dashboardRouter } from "../src/routes/dashboard";
import { reorderRulesRouter } from "../src/routes/reorder-rules";
import { reorderRouter } from "../src/routes/reorder";
import { teamRouter } from "../src/routes/team";
import { subscriptionRouter } from "../src/routes/subscription";
import { aiRouter } from "../src/routes/ai";
import { type AppType } from "../src/types";
import { db } from "../src/db";

const app = new Hono<AppType>();

console.log("🔧 Initializing Hono application for Vercel...");
app.use("*", logger());
app.use(
  "/*",
  cors({
    origin: (origin) => origin || "*",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "expo-origin"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  return next();
});

app.on(["GET", "POST"], "/api/auth/*", (c) => {
  const request = c.req.raw;
  const expoOrigin = request.headers.get("expo-origin");
  if (!request.headers.get("origin") && expoOrigin) {
    const headers = new Headers(request.headers);
    headers.set("origin", expoOrigin);
    const modifiedRequest = new Request(request, { headers });
    return auth.handler(modifiedRequest);
  }
  return auth.handler(request);
});

console.log("📤 Mounting upload routes at /api/upload");
app.route("/api/upload", uploadRouter);

console.log("📝 Mounting sample routes at /api/sample");
app.route("/api/sample", sampleRouter);

console.log("👤 Mounting me routes at /api/me");
app.route("/api/me", meRouter);

console.log("🚀 Mounting onboarding routes at /api/onboarding");
app.route("/api/onboarding", onboardingRouter);

console.log("📍 Mounting locations routes at /api/locations");
app.route("/api/locations", locationsRouter);

console.log("📦 Mounting products routes at /api/products");
app.route("/api/products", productsRouter);

console.log("🏭 Mounting suppliers routes at /api/suppliers");
app.route("/api/suppliers", suppliersRouter);

console.log("📊 Mounting stock routes at /api/stock");
app.route("/api/stock", stockRouter);

console.log("🛒 Mounting orders routes at /api/orders");
app.route("/api/orders", ordersRouter);

console.log("🔔 Mounting alerts routes at /api/alerts");
app.route("/api/alerts", alertsRouter);

console.log("📈 Mounting dashboard routes at /api/dashboard");
app.route("/api/dashboard", dashboardRouter);

console.log("📋 Mounting reorder-rules routes at /api/reorder-rules");
app.route("/api/reorder-rules", reorderRulesRouter);

console.log("🔄 Mounting reorder routes at /api/reorder");
app.route("/api/reorder", reorderRouter);

console.log("👥 Mounting team routes at /api/team");
app.route("/api/team", teamRouter);

console.log("💰 Mounting subscription routes at /api/subscription");
app.route("/api/subscription", subscriptionRouter);

console.log("🤖 Mounting AI routes at /api/ai");
app.route("/api/ai", aiRouter);

app.get("/health", (c) => {
  console.log("💚 Health check requested");
  return c.json({ status: "ok" });
});

// Vercel Serverless handler
export default app;
