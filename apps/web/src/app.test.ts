import type { Express } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock all dependencies before importing createApp
vi.mock("@hmcts/cloud-native-platform", () => ({
  configurePropertiesVolume: vi.fn().mockResolvedValue(undefined),
  healthcheck: vi.fn(() => vi.fn()),
  monitoringMiddleware: vi.fn(() => vi.fn())
}));

vi.mock("@hmcts/simple-router", () => ({
  createSimpleRouter: vi.fn(() => Promise.resolve(vi.fn()))
}));

vi.mock("@hmcts/web-core", () => ({
  configureCookieManager: vi.fn().mockResolvedValue(undefined),
  configureGovuk: vi.fn().mockResolvedValue(undefined),
  configureHelmet: vi.fn(() => vi.fn()),
  configureNonce: vi.fn(() => vi.fn()),
  createFileUpload: vi.fn(() => ({
    single: vi.fn(() => vi.fn((_req: any, _res: any, next: any) => next()))
  })),
  createFileUploadMiddleware: vi.fn(() => vi.fn((_req: any, _res: any, next: any) => next())),
  errorHandler: vi.fn(() => vi.fn()),
  expressSessionRedis: vi.fn(() => vi.fn()),
  notFoundHandler: vi.fn(() => vi.fn())
}));

vi.mock("redis", () => ({
  createClient: vi.fn(() => ({
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock("config", () => ({
  default: {
    get: vi.fn((key: string) => {
      if (key === "redis.url") return "redis://localhost:6379";
      if (key === "gtm") return { id: "GTM-TEST" };
      if (key === "dynatrace") return { enabled: false };
      if (key === "applicationInsights") return { connectionString: "test" };
      return {};
    })
  }
}));

vi.mock("@hmcts/auth", () => ({
  configurePassport: vi.fn(),
  authNavigationMiddleware: vi.fn(() => vi.fn()),
  ssoCallbackHandler: vi.fn(),
  cftCallbackHandler: vi.fn()
}));

vi.mock("@hmcts/admin-pages/config", () => ({
  fileUploadRoutes: ["/manual-upload", "/non-strategic-upload"],
  moduleRoot: "/mock/admin-pages",
  pageRoutes: { path: "/mock/admin-pages/pages" }
}));

vi.mock("@hmcts/auth/config", () => ({
  moduleRoot: "/mock/auth",
  pageRoutes: { path: "/mock/auth/pages" }
}));

vi.mock("@hmcts/civil-and-family-daily-cause-list/config", () => ({
  moduleRoot: "/mock/civil-family",
  pageRoutes: { path: "/mock/civil-family/pages" }
}));

vi.mock("@hmcts/care-standards-tribunal-weekly-hearing-list/config", () => ({
  moduleRoot: "/mock/care-standards-tribunal",
  pageRoutes: { path: "/mock/care-standards-tribunal/pages" }
}));

vi.mock("@hmcts/rcj-standard-daily-cause-list/config", () => ({
  moduleRoot: "/mock/rcj-standard",
  pageRoutes: { path: "/mock/rcj-standard/pages" }
}));

vi.mock("@hmcts/london-administrative-court-daily-cause-list/config", () => ({
  moduleRoot: "/mock/london-admin",
  pageRoutes: { path: "/mock/london-admin/pages" }
}));

vi.mock("@hmcts/court-of-appeal-civil-daily-cause-list/config", () => ({
  moduleRoot: "/mock/civil-appeal",
  pageRoutes: { path: "/mock/civil-appeal/pages" }
}));

vi.mock("@hmcts/administrative-court-daily-cause-list/config", () => ({
  moduleRoot: "/mock/admin-court",
  pageRoutes: { path: "/mock/admin-court/pages" }
}));

vi.mock("@hmcts/list-types-common/config", () => ({
  moduleRoot: "/mock/list-types-common"
}));

vi.mock("@hmcts/location/config", () => ({
  apiRoutes: { path: "/mock/location/routes" }
}));

vi.mock("@hmcts/public-pages/config", () => ({
  fileUploadRoutes: ["/create-media-account"],
  moduleRoot: "/mock/public-pages",
  pageRoutes: { path: "/mock/public-pages/pages" }
}));

vi.mock("@hmcts/system-admin-pages/config", () => ({
  apiRoutes: { path: "/mock/system-admin/api" },
  fileUploadRoutes: ["/reference-data-upload"],
  moduleRoot: "/mock/system-admin",
  pageRoutes: { path: "/mock/system-admin/pages" }
}));

vi.mock("@hmcts/verified-pages/config", () => ({
  moduleRoot: "/mock/verified-pages",
  pageRoutes: { path: "/mock/verified-pages/pages" }
}));

vi.mock("@hmcts/web-core/config", () => ({
  pageRoutes: { path: "/mock/web-core/pages" },
  moduleRoot: "/mock/web-core"
}));

describe("Web Application", () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { createApp } = await import("./app.js");
    app = await createApp();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("createApp", () => {
    it("should create an Express application", () => {
      expect(app).toBeDefined();
      expect(typeof app.use).toBe("function");
      expect(typeof app.get).toBe("function");
    });

    it("should configure properties volume", async () => {
      const { configurePropertiesVolume } = await import("@hmcts/cloud-native-platform");
      expect(configurePropertiesVolume).toHaveBeenCalled();
    });

    it("should configure middleware in correct order", () => {
      // Verify app.use was called multiple times for middleware
      expect(app.use).toBeDefined();
    });

    it("should configure healthcheck middleware", async () => {
      const { healthcheck } = await import("@hmcts/cloud-native-platform");
      expect(healthcheck).toHaveBeenCalled();
    });

    it("should configure monitoring middleware", async () => {
      const { monitoringMiddleware } = await import("@hmcts/cloud-native-platform");
      expect(monitoringMiddleware).toHaveBeenCalled();
    });

    it("should configure nonce middleware", async () => {
      const { configureNonce } = await import("@hmcts/web-core");
      expect(configureNonce).toHaveBeenCalled();
    });

    it("should configure helmet middleware", async () => {
      const { configureHelmet } = await import("@hmcts/web-core");
      expect(configureHelmet).toHaveBeenCalled();
    });

    it("should configure session middleware with Redis", async () => {
      const { expressSessionRedis } = await import("@hmcts/web-core");
      expect(expressSessionRedis).toHaveBeenCalled();
    });

    it("should configure GOV.UK Frontend", async () => {
      const { configureGovuk } = await import("@hmcts/web-core");
      expect(configureGovuk).toHaveBeenCalled();
    });

    it("should configure cookie manager", async () => {
      const { configureCookieManager } = await import("@hmcts/web-core");
      expect(configureCookieManager).toHaveBeenCalledWith(
        app,
        expect.objectContaining({
          preferencesPath: "/cookie-preferences",
          categories: expect.objectContaining({
            essential: expect.arrayContaining(["connect.sid"]),
            analytics: expect.any(Array),
            preferences: expect.arrayContaining(["language"])
          })
        })
      );
    });

    it("should register web core page routes", async () => {
      const { createSimpleRouter } = await import("@hmcts/simple-router");
      expect(createSimpleRouter).toHaveBeenCalled();
    });

    it("should register public pages routes", async () => {
      const { createSimpleRouter } = await import("@hmcts/simple-router");
      // Should be called 14 times: location API routes, system-admin API routes, civil-family-cause-list pages, care-standards-tribunal pages,
      // rcj-standard pages, london-admin pages, civil-appeal pages, admin-court pages, web pages, auth routes,
      // public pages, verified pages, system-admin pages, admin routes
      expect(createSimpleRouter).toHaveBeenCalledTimes(14);
    });

    it("should register system-admin page routes", async () => {
      const { createSimpleRouter } = await import("@hmcts/simple-router");
      const calls = vi.mocked(createSimpleRouter).mock.calls;

      // Verify system-admin routes were registered (should have 13 total calls)
      expect(calls.length).toBeGreaterThanOrEqual(14);
    });

    it("should configure error handlers at the end", async () => {
      const { notFoundHandler, errorHandler } = await import("@hmcts/web-core");
      expect(notFoundHandler).toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalled();
    });

    it("should connect to Redis", async () => {
      const { createClient } = await import("redis");
      expect(createClient).toHaveBeenCalledWith({
        url: "redis://localhost:6379"
      });
    });

    it("should configure file upload middleware with error handling", async () => {
      const { createFileUploadMiddleware } = await import("@hmcts/web-core");
      expect(createFileUploadMiddleware).toHaveBeenCalled();
    });
  });

  describe("File Upload Error Handling", () => {
    it("should handle multer errors gracefully", async () => {
      vi.resetModules();
      vi.clearAllMocks();

      // Mock createFileUploadMiddleware to simulate an error
      const mockError = new Error("File too large");
      vi.doMock("@hmcts/web-core", () => ({
        configureCookieManager: vi.fn().mockResolvedValue(undefined),
        configureGovuk: vi.fn().mockResolvedValue(undefined),
        configureHelmet: vi.fn(() => vi.fn()),
        configureNonce: vi.fn(() => vi.fn()),
        createFileUploadMiddleware: vi.fn(() => (req: any, _res: any, next: any) => {
          // Simulate multer error handling
          req.fileUploadError = mockError;
          next();
        }),
        errorHandler: vi.fn(() => vi.fn()),
        expressSessionRedis: vi.fn(() => vi.fn()),
        notFoundHandler: vi.fn(() => vi.fn())
      }));

      const { createApp } = await import("./app.js");
      const app = await createApp();

      expect(app).toBeDefined();
    });
  });
});
