import type { Express, Request, Response } from "express";
import express from "express";
import * as oidcClient from "openid-client";
// @ts-expect-error - openid-client/passport subpath types
import { Strategy } from "openid-client/passport";
import passport from "passport";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as graphClient from "../graph-api/client.js";
import * as roleService from "../role-service/index.js";
import { configurePassport } from "./passport-config.js";
import * as ssoConfig from "./sso-config.js";

vi.mock("openid-client", () => ({
  discovery: vi.fn()
}));

vi.mock("openid-client/passport", () => ({
  Strategy: vi.fn()
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
const mockStrategy = vi.mocked(Strategy);
const mockDiscovery = vi.mocked(oidcClient.discovery);

const mockOidcConfig = { issuer: "https://test.com" };

describe("passport-config", () => {
  let app: Express;
  let consoleLogSpy: any;

  beforeEach(() => {
    app = express();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.clearAllMocks();
    mockDiscovery.mockResolvedValue(mockOidcConfig as any);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    delete process.env.NODE_ENV;
    delete process.env.ENABLE_SSO;
  });

  describe("when SSO is disabled for development", () => {
    it("should initialize passport without OIDC strategy when NODE_ENV is development and ENABLE_SSO is not set", async () => {
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
    it("should initialize passport without OIDC strategy when issuerUrl is missing", async () => {
      process.env.NODE_ENV = "production";
      mockGetSsoConfig.mockReturnValue({
        issuerUrl: "",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://localhost:8080/sso/return",
        systemAdminGroupId: "group1",
        internalAdminCtscGroupId: "group2",
        internalAdminLocalGroupId: "group3"
      });

      await configurePassport(app);

      expect(mockPassport.initialize).toHaveBeenCalled();
      expect(mockPassport.session).toHaveBeenCalled();
      expect(mockPassport.use).not.toHaveBeenCalled();
      expect(mockDiscovery).not.toHaveBeenCalled();
    });

    it("should initialize passport without OIDC strategy when clientId is missing", async () => {
      process.env.NODE_ENV = "production";
      mockGetSsoConfig.mockReturnValue({
        issuerUrl: "https://login.microsoftonline.com/tenant/v2.0",
        clientId: "",
        clientSecret: "test-secret",
        redirectUri: "https://localhost:8080/sso/return",
        systemAdminGroupId: "group1",
        internalAdminCtscGroupId: "group2",
        internalAdminLocalGroupId: "group3"
      });

      await configurePassport(app);

      expect(mockPassport.initialize).toHaveBeenCalled();
      expect(mockPassport.session).toHaveBeenCalled();
      expect(mockPassport.use).not.toHaveBeenCalled();
      expect(mockDiscovery).not.toHaveBeenCalled();
    });

    it("should initialize passport without OIDC strategy when clientSecret is missing", async () => {
      process.env.NODE_ENV = "production";
      mockGetSsoConfig.mockReturnValue({
        issuerUrl: "https://login.microsoftonline.com/tenant/v2.0",
        clientId: "test-client-id",
        clientSecret: "",
        redirectUri: "https://localhost:8080/sso/return",
        systemAdminGroupId: "group1",
        internalAdminCtscGroupId: "group2",
        internalAdminLocalGroupId: "group3"
      });

      await configurePassport(app);

      expect(mockPassport.initialize).toHaveBeenCalled();
      expect(mockPassport.session).toHaveBeenCalled();
      expect(mockPassport.use).not.toHaveBeenCalled();
      expect(mockDiscovery).not.toHaveBeenCalled();
    });
  });

  describe("when SSO is fully configured", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
      mockGetSsoConfig.mockReturnValue({
        issuerUrl: "https://login.microsoftonline.com/tenant/v2.0",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://localhost:8080/sso/return",
        systemAdminGroupId: "group1",
        internalAdminCtscGroupId: "group2",
        internalAdminLocalGroupId: "group3"
      });
    });

    it("should perform OIDC discovery and register the SSO strategy", async () => {
      await configurePassport(app);

      expect(mockDiscovery).toHaveBeenCalledWith(new URL("https://login.microsoftonline.com/tenant/v2.0"), "test-client-id", "test-secret");
      expect(mockStrategy).toHaveBeenCalledWith(
        expect.objectContaining({
          config: mockOidcConfig,
          callbackURL: "https://localhost:8080/sso/return",
          scope: "openid profile email"
        }),
        expect.any(Function)
      );
      expect(mockPassport.use).toHaveBeenCalledWith("sso-oidc", expect.anything());
      expect(mockPassport.initialize).toHaveBeenCalled();
      expect(mockPassport.session).toHaveBeenCalled();
      expect(mockPassport.serializeUser).toHaveBeenCalled();
      expect(mockPassport.deserializeUser).toHaveBeenCalled();
    });
  });

  describe("OIDC strategy verify callback", () => {
    let verifyCallback: (tokens: any, done: any) => Promise<void>;

    beforeEach(async () => {
      process.env.NODE_ENV = "production";
      mockGetSsoConfig.mockReturnValue({
        issuerUrl: "https://login.microsoftonline.com/tenant/v2.0",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://localhost:8080/sso/return",
        systemAdminGroupId: "group1",
        internalAdminCtscGroupId: "group2",
        internalAdminLocalGroupId: "group3"
      });

      await configurePassport(app);

      verifyCallback = mockStrategy.mock.calls[0][1] as any;
    });

    it("should extract claims from tokens, fetch user profile, and determine role", async () => {
      const mockClaims = { oid: "user-123", preferred_username: "test@example.com", name: "Test User" };
      const mockTokens = { access_token: "access-token", id_token: "some.jwt.token", claims: vi.fn().mockReturnValue(mockClaims) };
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

      await verifyCallback(mockTokens, mockDone);

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

    it("should fall back to graph profile email when preferred_username is absent", async () => {
      const mockClaims = { oid: "user-123", name: "Test User" };
      const mockTokens = { access_token: "access-token", id_token: "some.jwt.token", claims: vi.fn().mockReturnValue(mockClaims) };
      const mockUserProfile = {
        id: "user-123",
        email: "graph@example.com",
        displayName: "Test User",
        roles: [],
        groupIds: []
      };
      const mockDone = vi.fn();

      mockFetchUserProfile.mockResolvedValue(mockUserProfile);
      mockDetermineSsoUserRole.mockReturnValue("INTERNAL_ADMIN_CTSC");

      await verifyCallback(mockTokens, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, expect.objectContaining({ email: "graph@example.com", provenance: "SSO" }));
    });

    it("should handle errors during user profile fetching", async () => {
      const mockTokens = { access_token: "access-token", id_token: "some.jwt.token", claims: vi.fn().mockReturnValue({ oid: "user-123" }) };
      const mockError = new Error("Graph API error");
      const mockDone = vi.fn();

      mockFetchUserProfile.mockRejectedValue(mockError);

      await verifyCallback(mockTokens, mockDone);

      expect(mockDone).toHaveBeenCalledWith(mockError, false);
    });
  });
});
