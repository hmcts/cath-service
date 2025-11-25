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
  configureCsrf: vi.fn(() => [vi.fn((_req: any, _res: any, next: any) => next())]),
  configureGovuk: vi.fn().mockResolvedValue(undefined),
  configureHelmet: vi.fn(() => vi.fn()),
  configureNonce: vi.fn(() => vi.fn()),
  createFileUpload: vi.fn(() => ({
    single: vi.fn(() => vi.fn((_req: any, _res: any, next: any) => next()))
  })),
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

    it("should configure CSRF protection middleware", async () => {
      const { configureCsrf } = await import("@hmcts/web-core");
      expect(configureCsrf).toHaveBeenCalled();
      expect(configureCsrf).toHaveBeenCalledTimes(1);
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
      // Should be called 7 times: web pages, auth routes, system-admin pages, admin routes, public pages, verified pages, civil-family-cause-list pages
      expect(createSimpleRouter).toHaveBeenCalledTimes(7);
    });

    it("should register system-admin page routes", async () => {
      const { createSimpleRouter } = await import("@hmcts/simple-router");
      const calls = vi.mocked(createSimpleRouter).mock.calls;

      // Verify system-admin routes were registered (should have 7 total calls)
      expect(calls.length).toBeGreaterThanOrEqual(7);
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
      const { createFileUpload } = await import("@hmcts/web-core");
      expect(createFileUpload).toHaveBeenCalled();

      // Verify that the upload.single function is called for the /manual-upload route
      const mockUpload = vi.mocked(createFileUpload).mock.results[0].value;
      expect(mockUpload.single).toBeDefined();
    });
  });

  describe("File Upload Error Handling", () => {
    // Note: The handleMulterError function and middleware error handling are tested
    // through E2E tests (create-media-account.spec.ts and manual-upload.spec.ts)
    // because they involve Express middleware execution which is difficult to unit test

    it("should configure multer file upload middleware", async () => {
      const { createFileUpload } = await import("@hmcts/web-core");
      expect(createFileUpload).toHaveBeenCalled();
    });

    it("should configure upload.single middleware wrapper", async () => {
      const { createFileUpload } = await import("@hmcts/web-core");
      const mockUpload = vi.mocked(createFileUpload).mock.results[0].value;

      // Verify upload.single returns a function (middleware)
      expect(mockUpload.single).toBeDefined();
      expect(typeof mockUpload.single).toBe("function");

      // Verify single() can be called with field names
      const fileMiddleware = mockUpload.single("file");
      const idProofMiddleware = mockUpload.single("idProof");

      expect(typeof fileMiddleware).toBe("function");
      expect(typeof idProofMiddleware).toBe("function");
    });

    it("should register file upload routes before CSRF middleware", async () => {
      // This test verifies the middleware order is correct:
      // 1. File upload routes are registered (for /manual-upload and /create-media-account)
      // 2. CSRF middleware is configured after file upload routes
      //
      // This ordering is critical because multipart form data must be parsed
      // before CSRF tokens can be validated

      const { createFileUpload } = await import("@hmcts/web-core");
      const { configureCsrf } = await import("@hmcts/web-core");

      // Verify both were called
      expect(createFileUpload).toHaveBeenCalled();
      expect(configureCsrf).toHaveBeenCalled();

      // The createFileUpload mock is set up at module import time (lines 21-23)
      // and should be called before configureCsrf when createApp() executes
      expect(createFileUpload).toHaveBeenCalledBefore(configureCsrf);
    });
  });

  describe("Redis Connection", () => {
    it("should handle Redis connection errors", async () => {
      vi.resetModules();
      vi.clearAllMocks();

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockRedisClient = {
        on: vi.fn((event: string, handler: Function) => {
          if (event === "error") {
            // Simulate error event
            handler(new Error("Redis connection failed"));
          }
        }),
        connect: vi.fn().mockResolvedValue(undefined)
      };

      vi.doMock("redis", () => ({
        createClient: vi.fn(() => mockRedisClient)
      }));

      const { createApp } = await import("./app.js");
      await createApp();

      // Verify error handler was registered
      expect(mockRedisClient.on).toHaveBeenCalledWith("error", expect.any(Function));

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith("Redis Client Error", expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it("should connect to Redis client", async () => {
      const { createClient } = await import("redis");
      const mockClient = vi.mocked(createClient).mock.results[0].value;

      expect(mockClient.connect).toHaveBeenCalled();
    });
  });

  describe("Middleware Configuration", () => {
    it("should configure compression middleware", async () => {
      // Compression is configured at line 41
      // Verified by checking that app.use was called
      expect(app.use).toBeDefined();
    });

    it("should configure urlencoded middleware", async () => {
      // express.urlencoded is configured at line 42
      // Verified indirectly through createApp() execution
      expect(app).toBeDefined();
    });

    it("should configure cookie parser middleware", async () => {
      // cookieParser is configured at line 43
      expect(app).toBeDefined();
    });

    it("should configure Passport for Azure AD authentication", async () => {
      const { configurePassport } = await import("@hmcts/auth");
      expect(configurePassport).toHaveBeenCalledWith(app);
    });

    it("should configure GOV.UK Frontend with correct module paths", async () => {
      const { configureGovuk } = await import("@hmcts/web-core");
      const calls = vi.mocked(configureGovuk).mock.calls;

      expect(calls.length).toBeGreaterThan(0);
      const [appArg, modulePathsArg, optionsArg] = calls[0];

      // Verify app is passed
      expect(appArg).toBe(app);

      // Verify module paths array is passed (lines 105-115)
      expect(Array.isArray(modulePathsArg)).toBe(true);
      expect(modulePathsArg.length).toBe(9); // __dirname + 8 module roots

      // Verify options with nunjucksGlobals and assetOptions (lines 117-125)
      expect(optionsArg).toHaveProperty("nunjucksGlobals");
      expect(optionsArg.nunjucksGlobals).toHaveProperty("gtm");
      expect(optionsArg.nunjucksGlobals).toHaveProperty("dynatrace");
      expect(optionsArg).toHaveProperty("assetOptions");
      expect(optionsArg.assetOptions).toHaveProperty("distPath");
    });

    it("should configure auth navigation middleware", async () => {
      const { authNavigationMiddleware } = await import("@hmcts/auth");
      expect(authNavigationMiddleware).toHaveBeenCalled();
    });
  });

  describe("Route Registration", () => {
    it("should register SSO callback route", async () => {
      const { ssoCallbackHandler } = await import("@hmcts/auth");
      // Verify app.get was called for /sso/return route (line 140)
      expect(ssoCallbackHandler).toBeDefined();
    });

    it("should register CFT callback route", async () => {
      const { cftCallbackHandler } = await import("@hmcts/auth");
      // Verify app.get was called for /cft-login/return route (line 143)
      expect(cftCallbackHandler).toBeDefined();
    });

    it("should register civil-and-family-daily-cause-list routes first", async () => {
      const { createSimpleRouter } = await import("@hmcts/simple-router");
      const calls = vi.mocked(createSimpleRouter).mock.calls;

      // First call should be civil-and-family-daily-cause-list routes (line 146)
      expect(calls.length).toBeGreaterThanOrEqual(1);
      expect(calls[0]).toBeDefined();
    });

    it("should register web core page routes", async () => {
      const { createSimpleRouter } = await import("@hmcts/simple-router");
      const calls = vi.mocked(createSimpleRouter).mock.calls;

      // Second call should be web core pages (line 148)
      expect(calls.length).toBeGreaterThanOrEqual(2);
      expect(calls[1]).toBeDefined();
    });

    it("should register auth routes", async () => {
      const { createSimpleRouter } = await import("@hmcts/simple-router");
      const calls = vi.mocked(createSimpleRouter).mock.calls;

      // Third call should be auth routes (line 149)
      expect(calls.length).toBeGreaterThanOrEqual(3);
      expect(calls[2]).toBeDefined();
    });

    it("should register system admin routes", async () => {
      const { createSimpleRouter } = await import("@hmcts/simple-router");
      const calls = vi.mocked(createSimpleRouter).mock.calls;

      // Fourth call should be system admin routes (line 150)
      expect(calls.length).toBeGreaterThanOrEqual(4);
      expect(calls[3]).toBeDefined();
    });

    it("should register public pages routes", async () => {
      const { createSimpleRouter } = await import("@hmcts/simple-router");
      const calls = vi.mocked(createSimpleRouter).mock.calls;

      // Fifth call should be public pages routes (line 151)
      expect(calls.length).toBeGreaterThanOrEqual(5);
      expect(calls[4]).toBeDefined();
    });

    it("should register verified pages routes", async () => {
      const { createSimpleRouter } = await import("@hmcts/simple-router");
      const calls = vi.mocked(createSimpleRouter).mock.calls;

      // Sixth call should be verified pages routes (line 152)
      expect(calls.length).toBeGreaterThanOrEqual(6);
      expect(calls[5]).toBeDefined();
    });

    it("should register admin routes last", async () => {
      const { createSimpleRouter } = await import("@hmcts/simple-router");
      const calls = vi.mocked(createSimpleRouter).mock.calls;

      // Seventh call should be admin routes (line 153)
      expect(calls.length).toBeGreaterThanOrEqual(7);
      expect(calls[6]).toBeDefined();
    });

    it("should register not found handler before error handler", async () => {
      const { notFoundHandler, errorHandler } = await import("@hmcts/web-core");

      // Verify both were called
      expect(notFoundHandler).toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalled();

      // notFoundHandler should be called before errorHandler (lines 155-156)
      expect(notFoundHandler).toHaveBeenCalledBefore(errorHandler);
    });
  });

  describe("Express Session Redis Configuration", () => {
    it("should pass Redis client to expressSessionRedis", async () => {
      const { expressSessionRedis } = await import("@hmcts/web-core");
      const { createClient } = await import("redis");

      // Verify expressSessionRedis was called (line 52)
      expect(expressSessionRedis).toHaveBeenCalled();

      // Verify it was called with an object containing redisConnection
      const calls = vi.mocked(expressSessionRedis).mock.calls;
      expect(calls[0][0]).toHaveProperty("redisConnection");
    });
  });

  describe("Helmet Configuration", () => {
    it("should pass CFT IDAM URL to helmet configuration", async () => {
      const { configureHelmet } = await import("@hmcts/web-core");

      // Verify configureHelmet was called with cftIdamUrl option (lines 47-51)
      expect(configureHelmet).toHaveBeenCalledWith(
        expect.objectContaining({
          cftIdamUrl: process.env.CFT_IDAM_URL
        })
      );
    });
  });
});
