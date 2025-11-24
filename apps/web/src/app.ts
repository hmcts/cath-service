import path from "node:path";
import { fileURLToPath } from "node:url";
import { moduleRoot as adminModuleRoot, pageRoutes as adminRoutes } from "@hmcts/admin-pages/config";
import { authNavigationMiddleware, cftCallbackHandler, configurePassport, ssoCallbackHandler } from "@hmcts/auth";
import { moduleRoot as authModuleRoot, pageRoutes as authRoutes } from "@hmcts/auth/config";
import { moduleRoot as civilFamilyCauseListModuleRoot, pageRoutes as civilFamilyCauseListRoutes } from "@hmcts/civil-and-family-daily-cause-list/config";
import { configurePropertiesVolume, healthcheck, monitoringMiddleware } from "@hmcts/cloud-native-platform";
import { moduleRoot as listTypesCommonModuleRoot } from "@hmcts/list-types-common/config";
import { moduleRoot as publicPagesModuleRoot, pageRoutes as publicPagesRoutes } from "@hmcts/public-pages/config";
import { createSimpleRouter } from "@hmcts/simple-router";
import { moduleRoot as systemAdminModuleRoot, pageRoutes as systemAdminPageRoutes } from "@hmcts/system-admin-pages/config";
import { moduleRoot as verifiedPagesModuleRoot, pageRoutes as verifiedPagesRoutes } from "@hmcts/verified-pages/config";
import {
  configureCookieManager,
  configureCsrf,
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
  app.use(
    configureHelmet({
      cftIdamUrl: process.env.CFT_IDAM_URL
    })
  );
  app.use(expressSessionRedis({ redisConnection: await getRedisClient() }));

  // Register multer middleware for file upload routes BEFORE CSRF protection
  // This ensures multipart form bodies are parsed before CSRF validation
  const upload = createFileUpload();

  // Helper function to handle multer errors consistently
  const handleMulterError = (err: any, req: any, fieldName: string) => {
    if (!err) return;

    // Store the error for the controller to handle
    req.fileUploadError = {
      code: err.code,
      field: fieldName,
      message: err.message,
      originalError: err
    };

    // Log unexpected multer errors for debugging
    if (!["LIMIT_FILE_SIZE", "LIMIT_FILE_COUNT", "LIMIT_FIELD_SIZE", "LIMIT_UNEXPECTED_FILE"].includes(err.code)) {
      console.error(`Unexpected file upload error on ${fieldName}:`, {
        code: err.code,
        message: err.message,
        field: err.field,
        stack: err.stack
      });
    }
  };

  app.post("/create-media-account", (req, res, next) => {
    upload.single("idProof")(req, res, (err) => {
      handleMulterError(err, req, "idProof");
      next();
    });
  });
  app.post("/manual-upload", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      handleMulterError(err, req, "file");
      next();
    });
  });

  app.use(configureCsrf());

  // Initialize Passport for Azure AD authentication
  configurePassport(app);

  const modulePaths = [
    __dirname,
    webCoreModuleRoot,
    adminModuleRoot,
    authModuleRoot,
    listTypesCommonModuleRoot,
    civilFamilyCauseListModuleRoot,
    systemAdminModuleRoot,
    publicPagesModuleRoot,
    verifiedPagesModuleRoot
  ];

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

  // Add authentication state to navigation (AFTER all other middleware is set up)
  app.use(authNavigationMiddleware());

  // Manual route registration for SSO callback (maintains /sso/return URL for external SSO config)
  app.get("/sso/return", ssoCallbackHandler);

  // Manual route registration for CFT callback (maintains /cft-login/return URL for external CFT IDAM config)
  app.get("/cft-login/return", cftCallbackHandler);

  // Register civil-and-family-daily-cause-list routes first to ensure proper route matching
  app.use(await createSimpleRouter(civilFamilyCauseListRoutes));

  app.use(await createSimpleRouter({ path: `${__dirname}/pages` }, pageRoutes));
  app.use(await createSimpleRouter(authRoutes, pageRoutes));
  app.use(await createSimpleRouter(systemAdminPageRoutes, pageRoutes));
  app.use(await createSimpleRouter(publicPagesRoutes, pageRoutes));
  app.use(await createSimpleRouter(verifiedPagesRoutes, pageRoutes));
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
