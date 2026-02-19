import path from "node:path";
import { fileURLToPath } from "node:url";
import "@hmcts/web-core"; // Import for Express type augmentation
import { fileUploadRoutes as adminFileUploadRoutes, moduleRoot as adminModuleRoot, pageRoutes as adminRoutes } from "@hmcts/admin-pages/config";
import { moduleRoot as adminCourtModuleRoot, pageRoutes as adminCourtRoutes } from "@hmcts/administrative-court-daily-cause-list/config";
import {
  authNavigationMiddleware,
  b2cCallbackHandler,
  b2cCallbackPostHandler,
  b2cForgotPasswordHandler,
  cftCallbackHandler,
  configurePassport,
  sessionTimeoutMiddleware,
  ssoCallbackHandler
} from "@hmcts/auth";
import { moduleRoot as authModuleRoot, pageRoutes as authRoutes } from "@hmcts/auth/config";
import {
  moduleRoot as careStandardsTribunalModuleRoot,
  pageRoutes as careStandardsTribunalRoutes
} from "@hmcts/care-standards-tribunal-weekly-hearing-list/config";
import { moduleRoot as civilFamilyCauseListModuleRoot, pageRoutes as civilFamilyCauseListRoutes } from "@hmcts/civil-and-family-daily-cause-list/config";
import { configurePropertiesVolume, healthcheck, monitoringMiddleware } from "@hmcts/cloud-native-platform";
import { moduleRoot as civilAppealModuleRoot, pageRoutes as civilAppealRoutes } from "@hmcts/court-of-appeal-civil-daily-cause-list/config";
import { moduleRoot as listTypesCommonModuleRoot } from "@hmcts/list-types-common/config";
import { apiRoutes as locationApiRoutes } from "@hmcts/location/config";
import { moduleRoot as londonAdminModuleRoot, pageRoutes as londonAdminRoutes } from "@hmcts/london-administrative-court-daily-cause-list/config";
import {
  apiRoutes as publicPagesApiRoutes,
  fileUploadRoutes as publicPagesFileUploadRoutes,
  moduleRoot as publicPagesModuleRoot,
  pageRoutes as publicPagesRoutes
} from "@hmcts/public-pages/config";
import { moduleRoot as rcjStandardModuleRoot, pageRoutes as rcjStandardRoutes } from "@hmcts/rcj-standard-daily-cause-list/config";
import { createSimpleRouter } from "@hmcts/simple-router";
import {
  apiRoutes as systemAdminApiRoutes,
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
      cftIdamUrl: process.env.CFT_IDAM_URL,
      b2cCustomDomain: process.env.B2C_CUSTOM_DOMAIN,
      b2cTenantName: process.env.B2C_TENANT_NAME
    })
  );
  app.use(expressSessionRedis({ redisConnection: await getRedisClient() }));

  // Initialize Passport for Azure AD authentication
  await configurePassport(app);

  const modulePaths = [
    __dirname,
    webCoreModuleRoot,
    adminModuleRoot,
    authModuleRoot,
    listTypesCommonModuleRoot,
    careStandardsTribunalModuleRoot,
    civilFamilyCauseListModuleRoot,
    rcjStandardModuleRoot,
    londonAdminModuleRoot,
    civilAppealModuleRoot,
    adminCourtModuleRoot,
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
      analytics: ["_ga", "_gid"],
      performance: ["dtCookie", "dtSa", "rxVisitor", "rxvt"],
      preferences: ["language"]
    }
  });

  // Add authentication state to navigation (AFTER all other middleware is set up)
  app.use(authNavigationMiddleware());

  // Session timeout tracking for authenticated users
  app.use(sessionTimeoutMiddleware);

  // Manual route registration for SSO callback (maintains /sso/return URL for external SSO config)
  app.get("/sso/return", ssoCallbackHandler);

  // Manual route registration for CFT callback (maintains /cft-login/return URL for external CFT IDAM config)
  app.get("/cft-login/return", cftCallbackHandler);

  // Manual route registration for B2C callback (maintains /login/return URL for Azure B2C config)
  // Supports both GET (response_mode=query) and POST (response_mode=form_post)
  app.get("/login/return", b2cCallbackHandler);
  app.post("/login/return", b2cCallbackPostHandler);

  // Manual route registration for B2C password reset
  app.get("/b2c-forgot-password", b2cForgotPasswordHandler);

  // Register location autocomplete routes (no prefix - frontend expects /locations)
  app.use(await createSimpleRouter(locationApiRoutes));

  // Register API routes for public pages (flat file download)
  app.use(await createSimpleRouter({ ...publicPagesApiRoutes, prefix: "/api" }));

  // Register API routes for system admin (file serving)
  app.use(await createSimpleRouter(systemAdminApiRoutes));

  // Register list type routes first to ensure proper route matching
  app.use(await createSimpleRouter(civilFamilyCauseListRoutes));
  app.use(await createSimpleRouter(careStandardsTribunalRoutes));
  app.use(await createSimpleRouter(rcjStandardRoutes));
  app.use(await createSimpleRouter(londonAdminRoutes));
  app.use(await createSimpleRouter(civilAppealRoutes));
  app.use(await createSimpleRouter(adminCourtRoutes));

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
