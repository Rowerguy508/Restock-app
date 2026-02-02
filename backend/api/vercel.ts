import { handle } from "hono/vercel";
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

app.route("/api/upload", uploadRouter);
app.route("/api/sample", sampleRouter);
app.route("/api/me", meRouter);
app.route("/api/onboarding", onboardingRouter);
app.route("/api/locations", locationsRouter);
app.route("/api/products", productsRouter);
app.route("/api/suppliers", suppliersRouter);
app.route("/api/stock", stockRouter);
app.route("/api/orders", ordersRouter);
app.route("/api/alerts", alertsRouter);
app.route("/api/dashboard", dashboardRouter);
app.route("/api/reorder-rules", reorderRulesRouter);
app.route("/api/reorder", reorderRouter);
app.route("/api/team", teamRouter);
app.route("/api/subscription", subscriptionRouter);
app.route("/api/ai", aiRouter);

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const OPTIONS = handle(app);

