import path from "node:path";
import { fileURLToPath } from "node:url";
import { moduleRoot as adminModuleRoot, pageRoutes as adminRoutes } from "@hmcts/admin-pages/config";
import { configurePropertiesVolume, healthcheck, monitoringMiddleware } from "@hmcts/cloud-native-platform";
import { moduleRoot as publicPagesModuleRoot, pageRoutes as publicPagesRoutes } from "@hmcts/public-pages/config";
import { createSimpleRouter } from "@hmcts/simple-router";
import { moduleRoot as verifiedPagesModuleRoot, pageRoutes as verifiedPagesRoutes } from "@hmcts/verified-pages/config";
import {
  configureCookieManager,
  configureGovuk,
  configureHelmet,
  configureNonce,
  createFileUpload,
  errorHandler,
  expressSessionRedis,
  notFoundHandler
} from "@hmcts/web-core";
import { pageRoutes, moduleRoot as webCoreModuleRoot } from "@hmcts/web-core/config";
import compression from "compression";
import config from "config";
import cookieParser from "cookie-parser";
import type { Express } from "express";
import express from "express";
import { createClient } from "redis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const chartPath = path.join(__dirname, "../helm/values.yaml");

export async function createApp(): Promise<Express> {
  await configurePropertiesVolume(config, { chartPath });

  const app = express();

  app.use(compression());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(healthcheck());
  app.use(monitoringMiddleware(config.get("applicationInsights")));
  app.use(configureNonce());
  app.use(configureHelmet());
  app.use(expressSessionRedis({ redisConnection: await getRedisClient() }));

  const modulePaths = [__dirname, webCoreModuleRoot, adminModuleRoot, publicPagesModuleRoot, verifiedPagesModuleRoot];

  await configureGovuk(app, modulePaths, {
    nunjucksGlobals: {
      gtm: config.get("gtm"),
      dynatrace: config.get("dynatrace")
    },
    assetOptions: {
      distPath: path.join(__dirname, "../dist")
    }
  });

  await configureCookieManager(app, {
    preferencesPath: "/cookie-preferences",
    categories: {
      essential: ["connect.sid"],
      analytics: ["_ga", "_gid", "dtCookie", "dtSa", "rxVisitor", "rxvt"],
      preferences: ["language"]
    }
  });

  app.use(await createSimpleRouter({ path: `${__dirname}/pages` }, pageRoutes));
  app.use(await createSimpleRouter(publicPagesRoutes, pageRoutes));
  app.use(await createSimpleRouter(verifiedPagesRoutes, pageRoutes));

  // Register admin pages with multer middleware for file upload
  const upload = createFileUpload();
  app.post("/manual-upload", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        // Multer error occurred, but don't throw - let the route handler deal with validation
        // Store the error so the POST handler can check it
        (req as any).fileUploadError = err;
      }
      next();
    });
  });
  app.use(await createSimpleRouter(adminRoutes, pageRoutes));

  app.use(notFoundHandler());
  app.use(errorHandler());

  return app;
}

const getRedisClient = async () => {
  const redisClient = createClient({ url: config.get("redis.url") });
  redisClient.on("error", (err) => console.error("Redis Client Error", err));

  await redisClient.connect();
  return redisClient;
};
