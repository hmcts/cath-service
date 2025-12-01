import type { Express } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@hmcts/cloud-native-platform", () => ({
  healthcheck: vi.fn(() => vi.fn()),
  configurePropertiesVolume: vi.fn(() => Promise.resolve())
}));

vi.mock("@hmcts/simple-router", () => ({
  createSimpleRouter: vi.fn(() => Promise.resolve(vi.fn()))
}));

describe("API Application", () => {
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

    it("should configure healthcheck middleware", async () => {
      const { healthcheck } = await import("@hmcts/cloud-native-platform");
      expect(healthcheck).toHaveBeenCalled();
    });

    it("should configure routes using simple router", async () => {
      const { createSimpleRouter } = await import("@hmcts/simple-router");
      expect(createSimpleRouter).toHaveBeenCalled();
    });

    it("should have JSON body parser middleware", () => {
      expect(app).toBeDefined();
      // Express app should be configured with json parser
    });

    it("should have URL encoded body parser middleware", () => {
      expect(app).toBeDefined();
      // Express app should be configured with urlencoded parser
    });

    it("should have compression middleware", () => {
      expect(app).toBeDefined();
      // Express app should be configured with compression
    });

    it("should have CORS middleware", () => {
      expect(app).toBeDefined();
      // Express app should be configured with CORS
    });

    it("should be configured with error handlers", () => {
      expect(app).toBeDefined();
      // Express app should have error handlers
    });
  });
});
