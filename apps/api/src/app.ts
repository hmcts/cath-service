import path from "node:path";
import { fileURLToPath } from "node:url";
import { apiRoutes as blobIngestionRoutes } from "@hmcts/blob-ingestion/config";
import { configurePropertiesVolume, healthcheck } from "@hmcts/cloud-native-platform";
import { apiRoutes as locationRoutes } from "@hmcts/location/config";
import { apiRoutes as publicPagesRoutes } from "@hmcts/public-pages/config";
import { createSimpleRouter } from "@hmcts/simple-router";
import compression from "compression";
import config from "config";
import cors from "cors";
import type { Express } from "express";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const chartPath = path.join(__dirname, "../helm/values.yaml");

export async function createApp(): Promise<Express> {
  await configurePropertiesVolume(config, { chartPath });

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
