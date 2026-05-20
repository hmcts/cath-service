import path from "node:path";
import { fileURLToPath } from "node:url";
import { apiRoutes as blobIngestionRoutes } from "@hmcts/blob-ingestion/config";
import { getPropertiesVolumeSecrets, healthcheck } from "@hmcts/cloud-native-platform";
import { apiRoutes as locationRoutes } from "@hmcts/location/config";
import { apiRoutes as publicPagesRoutes } from "@hmcts/public-pages/config";
import { createSimpleRouter } from "@hmcts/simple-router";
import compression from "compression";
import cors from "cors";
import type { Express } from "express";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const chartPath = path.join(__dirname, "../helm/values.yaml");

export async function createApp(): Promise<Express> {
  console.log("[API] Starting API server initialization...");
  console.log("[API] NODE_ENV:", process.env.NODE_ENV);
  console.log("[API] DATABASE_URL:", process.env.DATABASE_URL ? "set" : "not set");

  try {
    console.log("[API] Loading secrets from properties volume...");
    await getPropertiesVolumeSecrets({ chartPath, omit: ["DATABASE_URL"] });
    console.log("[API] Secrets loaded successfully");
  } catch (error) {
    console.error("[API] Failed to load secrets:", error);
    throw error;
  }

  console.log("[API] Creating Express app...");
  const app = express();

  app.use(healthcheck());

  app.use(compression());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") || ["https://localhost:8080"],
      credentials: true
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const routeMounts = [{ path: `${__dirname}/routes` }, blobIngestionRoutes, locationRoutes, publicPagesRoutes];

  // Enable test-support routes in non-production environments or when explicitly enabled
  // ENABLE_TEST_SUPPORT=true allows preview/staging deployments to run E2E tests
  if (process.env.NODE_ENV !== "production" || process.env.ENABLE_TEST_SUPPORT === "true") {
    console.log("[API] Loading test-support routes...");
    const { apiRoutes: testSupportRoutes } = await import("@hmcts/test-support/config");
    routeMounts.push(testSupportRoutes);
    console.log("[API] Test-support routes loaded");
  }

  console.log("[API] Registering routes...");
  app.use(await createSimpleRouter(...routeMounts));
  console.log("[API] Routes registered successfully");

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[API] Express error handler:", err.stack);
    res.status(500).json({ error: "Internal server error" });
  });

  console.log("[API] API app created successfully");
  return app;
}
