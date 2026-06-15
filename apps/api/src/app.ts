import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPropertiesVolumeSecrets, healthcheck } from "@hmcts-cft/cloud-native-platform";
import { createSimpleRouter } from "@hmcts-cft/simple-router";
import compression from "compression";
import cors from "cors";
import type { Express } from "express";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const chartPath = path.join(__dirname, "../helm/values.yaml");

export async function createApp(): Promise<Express> {
  await getPropertiesVolumeSecrets({ chartPath, omit: ["DATABASE_URL"] });

  const app = express();

  app.use(healthcheck());

  app.use(compression());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") || ["https://localhost:8080"],
      credentials: true
    })
  );

  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));

  const routeMounts = [{ path: `${__dirname}/routes` }];

  // Register public-pages API routes (flat-file download)
  const { apiRoutes: publicPagesRoutes } = await import("@hmcts/public-pages/config");
  routeMounts.push(publicPagesRoutes);

  // Enable test-support routes in non-production environments or when explicitly enabled
  // ENABLE_TEST_SUPPORT=true allows preview/staging deployments to run E2E tests
  if (process.env.NODE_ENV !== "production" || process.env.ENABLE_TEST_SUPPORT === "true") {
    const { apiRoutes: testSupportRoutes } = await import("@hmcts/test-support/config");
    routeMounts.push(testSupportRoutes);
  }

  app.use(await createSimpleRouter(...routeMounts));

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
