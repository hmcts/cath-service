import type { Express, Request, Response } from "express";
import express from "express";
import passport from "passport";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as graphClient from "../graph-api/client.js";
import * as roleService from "../role-service/index.js";
import { configurePassport } from "./passport-config.js";
import * as ssoConfig from "./sso-config.js";

const mockDiscovery = vi.fn();
const mockStrategyConstructor = vi.fn();

vi.mock("openid-client", () => ({
  discovery: (...args: unknown[]) => mockDiscovery(...args)
}));

vi.mock("openid-client/passport", () => ({
  Strategy: class MockStrategy {
    name: string;
    constructor(...args: unknown[]) {
      mockStrategyConstructor(...args);
      this.name = (args[0] as { name: string }).name;
    }
  }
}));

vi.mock("../graph-api/client.js", () => ({
  fetchUserProfile: vi.fn()
}));

vi.mock("../role-service/index.js", () => ({
  determineSsoUserRole: vi.fn()
}));

vi.mock("./sso-config.js", () => ({
  getSsoConfig: vi.fn(),
  isSsoConfigured: vi.fn()
}));

vi.mock("passport", () => ({
  default: {
    initialize: vi.fn(() => (_req: Request, _res: Response, next: () => void) => next()),
    session: vi.fn(() => (_req: Request, _res: Response, next: () => void) => next()),
    use: vi.fn(),
    serializeUser: vi.fn(),
    deserializeUser: vi.fn()
  }
}));

const mockFetchUserProfile = vi.mocked(graphClient.fetchUserProfile);
const mockDetermineSsoUserRole = vi.mocked(roleService.determineSsoUserRole);
const mockGetSsoConfig = vi.mocked(ssoConfig.getSsoConfig);
const mockPassport = vi.mocked(passport);

const FULL_SSO_CONFIG = {
  issuerUrl: "https://login.microsoftonline.com/tenant/v2.0",
  clientId: "test-client-id",
  clientSecret: "test-secret",
  redirectUri: "https://localhost:8080/sso/return",
  scope: ["openid", "profile", "email"],
  systemAdminGroupId: "group1",
  internalAdminCtscGroupId: "group2",
  internalAdminLocalGroupId: "group3"
};

describe("passport-config", () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.ENABLE_SSO;
  });

  describe("when SSO is disabled for development", () => {
    it("should initialize passport without OIDC strategy", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.ENABLE_SSO;

      await configurePassport(app);

      expect(mockPassport.initialize).toHaveBeenCalled();
      expect(mockPassport.session).toHaveBeenCalled();
      expect(mockPassport.serializeUser).toHaveBeenCalled();
      expect(mockPassport.deserializeUser).toHaveBeenCalled();
      expect(mockPassport.use).not.toHaveBeenCalled();
    });
  });

  describe("when SSO configuration is incomplete", () => {
    it("should throw when issuerUrl is missing", async () => {
      process.env.NODE_ENV = "production";
      mockGetSsoConfig.mockReturnValue({ ...FULL_SSO_CONFIG, issuerUrl: "" });

      await expect(configurePassport(app)).rejects.toThrow("SSO configuration is incomplete");
    });

    it("should throw when clientId is missing", async () => {
      process.env.NODE_ENV = "production";
      mockGetSsoConfig.mockReturnValue({ ...FULL_SSO_CONFIG, clientId: "" });

      await expect(configurePassport(app)).rejects.toThrow("SSO configuration is incomplete");
    });

    it("should throw when clientSecret is missing", async () => {
      process.env.NODE_ENV = "production";
      mockGetSsoConfig.mockReturnValue({ ...FULL_SSO_CONFIG, clientSecret: "" });

      await expect(configurePassport(app)).rejects.toThrow("SSO configuration is incomplete");
    });
  });

  describe("when SSO is fully configured", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
      mockGetSsoConfig.mockReturnValue(FULL_SSO_CONFIG);
      mockDiscovery.mockResolvedValue({ serverMetadata: () => ({ issuer: FULL_SSO_CONFIG.issuerUrl }) });
    });

    it("should perform OIDC discovery and register strategy", async () => {
      await configurePassport(app);

      expect(mockDiscovery).toHaveBeenCalledWith(new URL(FULL_SSO_CONFIG.issuerUrl), FULL_SSO_CONFIG.clientId, FULL_SSO_CONFIG.clientSecret);
      expect(mockStrategyConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "azuread-openidconnect",
          callbackURL: FULL_SSO_CONFIG.redirectUri,
          scope: "openid profile email"
        }),
        expect.any(Function)
      );
      expect(mockPassport.use).toHaveBeenCalled();
    });

    it("should throw when OIDC discovery fails", async () => {
      // Arrange
      mockDiscovery.mockRejectedValue(new Error("Network error"));

      // Act & Assert
      await expect(configurePassport(app)).rejects.toThrow("Network error");
    });
  });

  describe("verify callback", () => {
    let verifyCallback: (tokens: unknown, done: unknown) => Promise<void>;

    beforeEach(async () => {
      process.env.NODE_ENV = "production";
      mockGetSsoConfig.mockReturnValue(FULL_SSO_CONFIG);
      mockDiscovery.mockResolvedValue({ serverMetadata: () => ({ issuer: FULL_SSO_CONFIG.issuerUrl }) });

      await configurePassport(app);

      verifyCallback = mockStrategyConstructor.mock.calls[0][1] as typeof verifyCallback;
    });

    it("should fetch user profile and determine role from token claims", async () => {
      // Arrange
      const mockTokens = {
        access_token: "access-token",
        claims: () => ({
          oid: "user-123",
          preferred_username: "test@example.com",
          name: "Test User"
        })
      };
      const mockUserProfile = {
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
        roles: [],
        groupIds: ["group1", "group2"]
      };
      const mockDone = vi.fn();

      mockFetchUserProfile.mockResolvedValue(mockUserProfile);
      mockDetermineSsoUserRole.mockReturnValue("SYSTEM_ADMIN");

      // Act
      await verifyCallback(mockTokens, mockDone);

      // Assert
      expect(mockFetchUserProfile).toHaveBeenCalledWith("access-token");
      expect(mockDetermineSsoUserRole).toHaveBeenCalledWith(["group1", "group2"]);
      expect(mockDone).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          id: "user-123",
          email: "test@example.com",
          displayName: "Test User",
          role: "SYSTEM_ADMIN",
          provenance: "SSO"
        })
      );
    });

    it("should fall back to sub when oid is not present", async () => {
      // Arrange
      const mockTokens = {
        access_token: "access-token",
        claims: () => ({
          sub: "sub-id",
          email: "test@example.com",
          name: "Test User"
        })
      };
      const mockUserProfile = {
        id: "graph-id",
        email: "test@example.com",
        displayName: "Test User",
        roles: [],
        groupIds: []
      };
      const mockDone = vi.fn();

      mockFetchUserProfile.mockResolvedValue(mockUserProfile);
      mockDetermineSsoUserRole.mockReturnValue("INTERNAL_ADMIN_CTSC");

      // Act
      await verifyCallback(mockTokens, mockDone);

      // Assert
      expect(mockDone).toHaveBeenCalledWith(null, expect.objectContaining({ id: "sub-id" }));
    });

    it("should fall back to Graph API values when claims are missing", async () => {
      // Arrange
      const mockTokens = {
        access_token: "access-token",
        claims: () => ({ sub: "sub-id" })
      };
      const mockUserProfile = {
        id: "graph-id",
        email: "graph@example.com",
        displayName: "Graph User",
        roles: [],
        groupIds: []
      };
      const mockDone = vi.fn();

      mockFetchUserProfile.mockResolvedValue(mockUserProfile);
      mockDetermineSsoUserRole.mockReturnValue("INTERNAL_ADMIN_LOCAL");

      // Act
      await verifyCallback(mockTokens, mockDone);

      // Assert
      expect(mockDone).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          email: "graph@example.com",
          displayName: "Graph User"
        })
      );
    });

    it("should fall back entirely to Graph API when claims() returns undefined", async () => {
      // Arrange
      const mockTokens = {
        access_token: "access-token",
        claims: () => undefined
      };
      const mockUserProfile = {
        id: "graph-id",
        email: "graph@example.com",
        displayName: "Graph User",
        roles: [],
        groupIds: ["group1"]
      };
      const mockDone = vi.fn();

      mockFetchUserProfile.mockResolvedValue(mockUserProfile);
      mockDetermineSsoUserRole.mockReturnValue("SYSTEM_ADMIN");

      // Act
      await verifyCallback(mockTokens, mockDone);

      // Assert
      expect(mockDone).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          id: "graph-id",
          email: "graph@example.com",
          displayName: "Graph User",
          role: "SYSTEM_ADMIN",
          provenance: "SSO"
        })
      );
    });

    it("should return error when access token is missing", async () => {
      // Arrange
      const mockTokens = {
        access_token: undefined,
        claims: () => ({ oid: "user-123" })
      };
      const mockDone = vi.fn();

      // Act
      await verifyCallback(mockTokens, mockDone);

      // Assert
      expect(mockDone).toHaveBeenCalledWith(expect.objectContaining({ message: "No access token received from identity provider" }), false);
      expect(mockFetchUserProfile).not.toHaveBeenCalled();
    });

    it("should handle errors during user profile fetching", async () => {
      // Arrange
      const mockTokens = {
        access_token: "access-token",
        claims: () => ({ oid: "user-123" })
      };
      const mockError = new Error("Graph API error");
      const mockDone = vi.fn();

      mockFetchUserProfile.mockRejectedValue(mockError);

      // Act
      await verifyCallback(mockTokens, mockDone);

      // Assert
      expect(mockDone).toHaveBeenCalledWith(mockError, false);
    });
  });
});
