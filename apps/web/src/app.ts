import path from "node:path";
import { fileURLToPath } from "node:url";
import "@hmcts/web-core"; // Import for Express type augmentation
import { fileUploadRoutes as adminFileUploadRoutes, moduleRoot as adminModuleRoot, pageRoutes as adminRoutes } from "@hmcts/admin-pages/config";
import { authNavigationMiddleware, cftCallbackHandler, configurePassport, ssoCallbackHandler } from "@hmcts/auth";
import { moduleRoot as authModuleRoot, pageRoutes as authRoutes } from "@hmcts/auth/config";
import {
  moduleRoot as careStandardsTribunalModuleRoot,
  pageRoutes as careStandardsTribunalRoutes
} from "@hmcts/care-standards-tribunal-weekly-hearing-list/config";
import { moduleRoot as civilFamilyCauseListModuleRoot, pageRoutes as civilFamilyCauseListRoutes } from "@hmcts/civil-and-family-daily-cause-list/config";
import { configurePropertiesVolume, healthcheck, monitoringMiddleware } from "@hmcts/cloud-native-platform";
import { moduleRoot as listTypesCommonModuleRoot } from "@hmcts/list-types-common/config";
import { apiRoutes as locationApiRoutes } from "@hmcts/location/config";
import {
  fileUploadRoutes as publicPagesFileUploadRoutes,
  moduleRoot as publicPagesModuleRoot,
  pageRoutes as publicPagesRoutes
} from "@hmcts/public-pages/config";
import { createSimpleRouter } from "@hmcts/simple-router";
import { assets as sjpPressListAssets, moduleRoot as sjpPressListModuleRoot, pageRoutes as sjpPressListRoutes } from "@hmcts/sjp-press-list/config";
import { moduleRoot as sjpPublicListModuleRoot, pageRoutes as sjpPublicListRoutes } from "@hmcts/sjp-public-list/config";
import {
  fileUploadRoutes as systemAdminFileUploadRoutes,
  moduleRoot as systemAdminModuleRoot,
  pageRoutes as systemAdminPageRoutes
} from "@hmcts/system-admin-pages/config";
import { moduleRoot as verifiedPagesModuleRoot, pageRoutes as verifiedPagesRoutes } from "@hmcts/verified-pages/config";
import {
  configureCookieManager,
  configureGovuk,
  configureHelmet,
  configureNonce,
  createFileUploadMiddleware,
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

  // Initialize Passport for Azure AD authentication
  configurePassport(app);

  const modulePaths = [
    __dirname,
    webCoreModuleRoot,
    adminModuleRoot,
    authModuleRoot,
    listTypesCommonModuleRoot,
    careStandardsTribunalModuleRoot,
    civilFamilyCauseListModuleRoot,
    sjpPressListModuleRoot,
    sjpPublicListModuleRoot,
    systemAdminModuleRoot,
    publicPagesModuleRoot,
    verifiedPagesModuleRoot,
    sjpPressListAssets
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

  // Register API routes for location autocomplete
  app.use(await createSimpleRouter(locationApiRoutes));

  // Register list type routes first to ensure proper route matching
  app.use(await createSimpleRouter(civilFamilyCauseListRoutes));
  app.use(await createSimpleRouter(careStandardsTribunalRoutes));
  app.use(await createSimpleRouter(sjpPressListRoutes));
  app.use(await createSimpleRouter(sjpPublicListRoutes));

  app.use(await createSimpleRouter({ path: `${__dirname}/pages` }, pageRoutes));
  app.use(await createSimpleRouter(authRoutes, pageRoutes));

  // Register file upload middleware for public pages
  for (const route of publicPagesFileUploadRoutes) {
    app.post(route, createFileUploadMiddleware("idProof"));
  }
  app.use(await createSimpleRouter(publicPagesRoutes, pageRoutes));
  app.use(await createSimpleRouter(verifiedPagesRoutes, pageRoutes));

  // Register file upload middleware for system admin pages
  const fileUploadMiddleware = createFileUploadMiddleware();
  for (const route of systemAdminFileUploadRoutes) {
    app.post(route, fileUploadMiddleware);
  }
  app.use(await createSimpleRouter(systemAdminPageRoutes, pageRoutes));

  // Register file upload middleware for admin pages
  for (const route of adminFileUploadRoutes) {
    app.post(route, fileUploadMiddleware);
  }
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
