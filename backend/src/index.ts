import "@vibecodeapp/proxy"; // DO NOT REMOVE OTHERWISE VIBECODE PROXY WILL NOT WORK
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";

import { auth } from "./auth";
import { env } from "./env";
import { uploadRouter } from "./routes/upload";
import { sampleRouter } from "./routes/sample";
import { meRouter } from "./routes/me";
import { onboardingRouter } from "./routes/onboarding";
import { locationsRouter } from "./routes/locations";
import { productsRouter } from "./routes/products";
import { suppliersRouter } from "./routes/suppliers";
import { stockRouter } from "./routes/stock";
import { ordersRouter } from "./routes/orders";
import { alertsRouter } from "./routes/alerts";
import { dashboardRouter } from "./routes/dashboard";
import { reorderRulesRouter } from "./routes/reorder-rules";
import { reorderRouter } from "./routes/reorder";
import { teamRouter } from "./routes/team";
import { subscriptionRouter } from "./routes/subscription";
import { aiRouter } from "./routes/ai";
import { type AppType } from "./types";
import { db } from "./db";

// AppType context adds user and session to the context, will be null if the user or session is null
const app = new Hono<AppType>();

console.log("🔧 Initializing Hono application...");
app.use("*", logger());
app.use(
  "/*",
  cors({
    origin: (origin) => origin || "*", // Allow the requesting origin or fallback to *
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "expo-origin"], // expo-origin is required for Better Auth Expo plugin
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

/** Authentication middleware
 * Extracts session from request headers and attaches user/session to context
 * All routes can access c.get("user") and c.get("session")
 */
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null); // type: typeof auth.$Infer.Session.user | null
  c.set("session", session?.session ?? null); // type: typeof auth.$Infer.Session.session | null
  return next();
});

// Better Auth handler
// Handles all authentication endpoints: /api/auth/sign-in, /api/auth/sign-up, etc.
console.log("🔐 Mounting Better Auth handler at /api/auth/*");
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  const request = c.req.raw;
  // Workaround for Expo/React Native: native apps don't send Origin header,
  // but the expo client plugin sends expo-origin instead. We need to create
  // a new request with the origin header set from expo-origin.
  const expoOrigin = request.headers.get("expo-origin");
  if (!request.headers.get("origin") && expoOrigin) {
    const headers = new Headers(request.headers);
    headers.set("origin", expoOrigin);
    const modifiedRequest = new Request(request, { headers });
    return auth.handler(modifiedRequest);
  }
  return auth.handler(request);
});

// Serve uploaded images statically
// Files in uploads/ directory are accessible at /uploads/* URLs
console.log("📁 Serving static files from uploads/ directory");
app.use("/uploads/*", serveStatic({ root: "./" }));

// Mount route modules
console.log("📤 Mounting upload routes at /api/upload");
app.route("/api/upload", uploadRouter);

console.log("📝 Mounting sample routes at /api/sample");
app.route("/api/sample", sampleRouter);

// ReStocka routes
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

// Health check endpoint
// Used by load balancers and monitoring tools to verify service is running
app.get("/health", (c) => {
  console.log("💚 Health check requested");
  return c.json({ status: "ok" });
});

// Start the server
console.log("⚙️  Starting server...");
const server = serve({ fetch: app.fetch, port: Number(env.PORT) }, () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📍 Environment: ${env.NODE_ENV}`);
  console.log(`🚀 Server is running on port ${env.PORT}`);
  console.log(`🔗 Base URL: http://localhost:${env.PORT}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📚 Available endpoints:");
  console.log("  🔐 Auth:     /api/auth/*");
  console.log("  📤 Upload:   POST /api/upload/image");
  console.log("  📝 Sample:   GET/POST /api/sample");
  console.log("  💚 Health:   GET /health");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
});

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down server...");
  await db.$disconnect();
  await db.$connect();
  await db.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE)");
  await db.$disconnect();
  console.log("Successfully shutdown server");
  server.close();
  process.exit(0);
};

// Handle SIGINT (ctrl+c).
process.on("SIGINT", async () => {
  console.log("SIGINT received. Cleaning up...");
  await shutdown();
});

// Handle SIGTERM (normal shutdown).
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Cleaning up...");
  await shutdown();
});
