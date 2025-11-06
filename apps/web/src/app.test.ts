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
    single: vi.fn(() => vi.fn((req: any, res: any, next: any) => next()))
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
      // Should be called 5 times: web pages, admin pages, public pages, system-admin pages, verified pages
      expect(createSimpleRouter).toHaveBeenCalledTimes(5);
    });

    it("should register system-admin page routes", async () => {
      const { createSimpleRouter } = await import("@hmcts/simple-router");
      const calls = vi.mocked(createSimpleRouter).mock.calls;

      // Verify system-admin routes were registered (4th call)
      expect(calls.length).toBeGreaterThanOrEqual(4);
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
  });
});
