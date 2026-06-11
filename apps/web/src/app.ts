import path from "node:path";
import { fileURLToPath } from "node:url";
import "./session.js"; // Session type augmentation
import "@hmcts/web-core"; // Import for Express type augmentation
import { fileUploadRoutes as adminFileUploadRoutes, moduleRoot as adminModuleRoot } from "@hmcts/admin-pages/config";
import { moduleRoot as adminCourtModuleRoot } from "@hmcts/administrative-court-daily-cause-list/config";
import { moduleRoot as authModuleRoot } from "@hmcts/auth/config";
import { moduleRoot as careStandardsTribunalModuleRoot } from "@hmcts/care-standards-tribunal-weekly-hearing-list/config";
import { moduleRoot as civilFamilyCauseListModuleRoot } from "@hmcts/civil-and-family-daily-cause-list/config";
import { moduleRoot as civilAppealModuleRoot } from "@hmcts/court-of-appeal-civil-daily-cause-list/config";
import { moduleRoot as listTypesCommonModuleRoot } from "@hmcts/list-types-common/config";
import { apiRoutes as locationApiRoutes } from "@hmcts/location/config";
import { moduleRoot as londonAdminModuleRoot } from "@hmcts/london-administrative-court-daily-cause-list/config";
import { fileUploadRoutes as publicPagesFileUploadRoutes, moduleRoot as publicPagesModuleRoot } from "@hmcts/public-pages/config";
import { moduleRoot as rcjStandardModuleRoot } from "@hmcts/rcj-standard-daily-cause-list/config";
import { moduleRoot as sjpPressListModuleRoot } from "@hmcts/sjp-press-list/config";
import { moduleRoot as sjpPublicListModuleRoot } from "@hmcts/sjp-public-list/config";
import { fileUploadRoutes as systemAdminFileUploadRoutes, moduleRoot as systemAdminModuleRoot } from "@hmcts/system-admin-pages/config";
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
import { moduleRoot as webCoreModuleRoot } from "@hmcts/web-core/config";
import { getPropertiesVolumeSecrets, healthcheck, monitoringMiddleware } from "@hmcts-cft/cloud-native-platform";
import { createSimpleRouter } from "@hmcts-cft/simple-router";
import cookieParser from "cookie-parser";
import type { Express } from "express";
import express from "express";
import { createClient } from "redis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const helmValues = process.env.LOCAL_DEV === "true" ? "values.dev.yaml" : "values.yaml";
const chartPath = path.join(__dirname, `../helm/${helmValues}`);

export async function createApp(): Promise<Express> {
  await getPropertiesVolumeSecrets({ chartPath });
  const { default: config } = await import("config");

  // Dynamic import to avoid eager initialization of @hmcts/auth (which loads `config` via b2c-config.ts)
  // before getPropertiesVolumeSecrets() has set env vars from Key Vault. If imported statically,
  // config caches stale default values for APPLICATION_INSIGHTS_CONNECTION_STRING and other KV secrets.
  const { authNavigationMiddleware, configurePassport, sessionTimeoutMiddleware } = await import("@hmcts/auth");

  const app = express();
  app.set("trust proxy", 1);

  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(healthcheck());
  app.use(monitoringMiddleware(config.get("applicationInsights")));
  app.use(configureNonce());
  app.use(
    configureHelmet({
      cftIdamUrl: process.env.CFT_IDAM_URL,
      crimeIdamUrl: process.env.CRIME_IDAM_BASE_URL,
      b2cCustomDomain: process.env.B2C_CUSTOM_DOMAIN,
      b2cTenantName: process.env.B2C_TENANT_NAME
    })
  );
  app.use(
    "/assets",
    express.static(path.join(__dirname, "../dist/assets"), {
      setHeaders: (res) => {
        res.removeHeader("Content-Length");
      }
    })
  );
  const redisClient = await getRedisClient(config);
  app.use(expressSessionRedis({ redisConnection: redisClient }));
  app.locals.redisClient = redisClient;

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
    sjpPressListModuleRoot,
    sjpPublicListModuleRoot,
    rcjStandardModuleRoot,
    londonAdminModuleRoot,
    civilAppealModuleRoot,
    adminCourtModuleRoot,
    systemAdminModuleRoot,
    publicPagesModuleRoot
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

  // Dynamic import to avoid eager initialization of @hmcts/postgres-prisma before
  // getPropertiesVolumeSecrets() has set DATABASE_URL from the Key Vault mount.
  const { restorePendingSubscriptionsMiddleware } = await import("@hmcts/subscriptions");
  app.use(restorePendingSubscriptionsMiddleware());

  // Audit log middleware must be registered before the page router so it can intercept
  // all system admin and admin POST actions. Dynamic import for the same Key Vault reason.
  const { auditLogMiddleware } = await import("@hmcts/system-admin-pages");
  app.use(auditLogMiddleware());

  // File upload middleware must be registered before the page router so req.file is
  // available when route handlers process the request.
  for (const route of publicPagesFileUploadRoutes) {
    app.post(route, createFileUploadMiddleware("idProof"));
  }
  const fileUploadMiddleware = createFileUploadMiddleware();
  for (const route of systemAdminFileUploadRoutes) {
    app.post(route, fileUploadMiddleware);
  }
  for (const route of adminFileUploadRoutes) {
    app.post(route, fileUploadMiddleware);
  }

  // API routes served from the web app (location autocomplete, etc.)
  app.use(await createSimpleRouter(locationApiRoutes));

  // Register all pages from apps/web/src/pages (includes route groups and admin)
  app.use(await createSimpleRouter({ path: `${__dirname}/pages` }));

  // Enable test-support routes in non-production environments or when explicitly enabled
  if (process.env.NODE_ENV !== "production" || process.env.ENABLE_TEST_SUPPORT === "true") {
    const { apiRoutes: testSupportRoutes } = await import("@hmcts/test-support/config");
    app.use(express.json());
    app.use(await createSimpleRouter(testSupportRoutes));
  }

  app.use(notFoundHandler());
  app.use(errorHandler());

  return app;
}

const getRedisClient = async (config: { get: (key: string) => any }) => {
  const url = process.env.REDIS_URL ?? config.get("redis.url");
  const redisClient = createClient({ url });
  redisClient.on("error", (err) => console.error("Redis Client Error", err));

  await redisClient.connect();
  return redisClient;
};
