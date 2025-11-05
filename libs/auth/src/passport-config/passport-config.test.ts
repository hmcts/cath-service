import type { Express, Request, Response } from "express";
import express from "express";
import passport from "passport";
import { OIDCStrategy } from "passport-azure-ad";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as roleService from "../authorization/role-service.js";
import * as ssoConfig from "../config/sso-config.js";
import * as graphClient from "../graph-api/graph-client.js";
import { configurePassport } from "./passport-config.js";

// Mock all dependencies
vi.mock("passport-azure-ad", () => ({
  OIDCStrategy: vi.fn()
}));

vi.mock("../graph-api/graph-client.js", () => ({
  fetchUserProfile: vi.fn()
}));

vi.mock("../authorization/role-service.js", () => ({
  determineUserRole: vi.fn(),
  USER_ROLES: {
    SYSTEM_ADMIN: "SYSTEM_ADMIN",
    INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC",
    INTERNAL_ADMIN_LOCAL: "INTERNAL_ADMIN_LOCAL"
  }
}));

vi.mock("../config/sso-config.js", () => ({
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
const mockDetermineUserRole = vi.mocked(roleService.determineUserRole);
const mockGetSsoConfig = vi.mocked(ssoConfig.getSsoConfig);
const mockPassport = vi.mocked(passport);
const mockOIDCStrategy = vi.mocked(OIDCStrategy);

describe("passport-config", () => {
  let app: Express;
  let consoleLogSpy: any;

  beforeEach(() => {
    app = express();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    delete process.env.NODE_ENV;
    delete process.env.ENABLE_SSO;
  });

  describe("when SSO is disabled for development", () => {
    it("should initialize passport without OIDC strategy when NODE_ENV is development and ENABLE_SSO is not set", () => {
      process.env.NODE_ENV = "development";
      delete process.env.ENABLE_SSO;

      configurePassport(app);

      expect(mockPassport.initialize).toHaveBeenCalled();
      expect(mockPassport.session).toHaveBeenCalled();
      expect(mockPassport.serializeUser).toHaveBeenCalled();
      expect(mockPassport.deserializeUser).toHaveBeenCalled();
      expect(mockPassport.use).not.toHaveBeenCalled();
    });
  });

  describe("when SSO configuration is incomplete", () => {
    it("should initialize passport without OIDC strategy when identityMetadata is missing", () => {
      process.env.NODE_ENV = "production";
      mockGetSsoConfig.mockReturnValue({
        identityMetadata: "",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://localhost:8080/sso/return",
        responseType: "code",
        responseMode: "query",
        scope: ["openid", "profile", "email"],
        systemAdminGroupId: "group1",
        internalAdminCtscGroupId: "group2",
        internalAdminLocalGroupId: "group3"
      });

      configurePassport(app);

      expect(mockPassport.initialize).toHaveBeenCalled();
      expect(mockPassport.session).toHaveBeenCalled();
      expect(mockPassport.use).not.toHaveBeenCalled();
    });

    it("should initialize passport without OIDC strategy when clientId is missing", () => {
      process.env.NODE_ENV = "production";
      mockGetSsoConfig.mockReturnValue({
        identityMetadata: "https://test.com/metadata",
        clientId: "",
        clientSecret: "test-secret",
        redirectUri: "https://localhost:8080/sso/return",
        responseType: "code",
        responseMode: "query",
        scope: ["openid", "profile", "email"],
        systemAdminGroupId: "group1",
        internalAdminCtscGroupId: "group2",
        internalAdminLocalGroupId: "group3"
      });

      configurePassport(app);

      expect(mockPassport.initialize).toHaveBeenCalled();
      expect(mockPassport.session).toHaveBeenCalled();
      expect(mockPassport.use).not.toHaveBeenCalled();
    });

    it("should initialize passport without OIDC strategy when clientSecret is missing", () => {
      process.env.NODE_ENV = "production";
      mockGetSsoConfig.mockReturnValue({
        identityMetadata: "https://test.com/metadata",
        clientId: "test-client-id",
        clientSecret: "",
        redirectUri: "https://localhost:8080/sso/return",
        responseType: "code",
        responseMode: "query",
        scope: ["openid", "profile", "email"],
        systemAdminGroupId: "group1",
        internalAdminCtscGroupId: "group2",
        internalAdminLocalGroupId: "group3"
      });

      configurePassport(app);

      expect(mockPassport.initialize).toHaveBeenCalled();
      expect(mockPassport.session).toHaveBeenCalled();
      expect(mockPassport.use).not.toHaveBeenCalled();
    });
  });

  describe("when SSO is fully configured", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
      mockGetSsoConfig.mockReturnValue({
        identityMetadata: "https://test.com/metadata",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://localhost:8080/sso/return",
        responseType: "code",
        responseMode: "query",
        scope: ["openid", "profile", "email"],
        systemAdminGroupId: "group1",
        internalAdminCtscGroupId: "group2",
        internalAdminLocalGroupId: "group3"
      });
    });

    it("should initialize passport with OIDC strategy", () => {
      configurePassport(app);

      expect(mockPassport.initialize).toHaveBeenCalled();
      expect(mockPassport.session).toHaveBeenCalled();
      expect(mockOIDCStrategy).toHaveBeenCalled();
      expect(mockPassport.use).toHaveBeenCalled();
      expect(mockPassport.serializeUser).toHaveBeenCalled();
      expect(mockPassport.deserializeUser).toHaveBeenCalled();
    });

    it("should configure OIDC strategy with correct options", () => {
      configurePassport(app);

      expect(mockOIDCStrategy).toHaveBeenCalledWith(
        expect.objectContaining({
          identityMetadata: "https://test.com/metadata",
          clientID: "test-client-id",
          clientSecret: "test-secret",
          redirectUrl: "https://localhost:8080/sso/return",
          responseType: "code",
          responseMode: "query",
          scope: ["openid", "profile", "email"],
          passReqToCallback: false,
          validateIssuer: true,
          clockSkew: 300
        }),
        expect.any(Function)
      );
    });
  });

  describe("OIDC strategy verify callback", () => {
    let verifyCallback: (_iss: any, _sub: any, profile: any, accessToken: any, _refreshToken: any, done: any) => Promise<void>;

    beforeEach(() => {
      process.env.NODE_ENV = "production";
      mockGetSsoConfig.mockReturnValue({
        identityMetadata: "https://test.com/metadata",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://localhost:8080/sso/return",
        responseType: "code",
        responseMode: "query",
        scope: ["openid", "profile", "email"],
        systemAdminGroupId: "group1",
        internalAdminCtscGroupId: "group2",
        internalAdminLocalGroupId: "group3"
      });

      configurePassport(app);

      // Extract the verify callback from the OIDCStrategy constructor
      verifyCallback = mockOIDCStrategy.mock.calls[0][1] as any;
    });

    it("should fetch user profile and determine role", async () => {
      const mockProfile = {
        oid: "user-123",
        upn: "test@example.com",
        name: "Test User"
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
      mockDetermineUserRole.mockReturnValue("SYSTEM_ADMIN");

      await verifyCallback("issuer", "subject", mockProfile, "access-token", "refresh-token", mockDone);

      expect(mockFetchUserProfile).toHaveBeenCalledWith("access-token");
      expect(mockDetermineUserRole).toHaveBeenCalledWith(["group1", "group2"]);
      expect(mockDone).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          id: "user-123",
          email: "test@example.com",
          displayName: "Test User",
          role: "SYSTEM_ADMIN"
        })
      );
    });

    it("should use profile email fallbacks when upn is not available", async () => {
      const mockProfile = {
        oid: "user-123",
        email: "test@example.com",
        name: "Test User"
      };
      const mockUserProfile = {
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
        roles: [],
        groupIds: []
      };
      const mockDone = vi.fn();

      mockFetchUserProfile.mockResolvedValue(mockUserProfile);
      mockDetermineUserRole.mockReturnValue("INTERNAL_ADMIN_CTSC");

      await verifyCallback("issuer", "subject", mockProfile, "access-token", "refresh-token", mockDone);

      expect(mockDone).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          email: "test@example.com"
        })
      );
    });

    it("should use _json email fallback when email is not available", async () => {
      const mockProfile = {
        oid: "user-123",
        _json: { email: "json@example.com" },
        name: "Test User"
      };
      const mockUserProfile = {
        id: "user-123",
        email: "json@example.com",
        displayName: "Test User",
        roles: [],
        groupIds: []
      };
      const mockDone = vi.fn();

      mockFetchUserProfile.mockResolvedValue(mockUserProfile);
      mockDetermineUserRole.mockReturnValue("INTERNAL_ADMIN_LOCAL");

      await verifyCallback("issuer", "subject", mockProfile, "access-token", "refresh-token", mockDone);

      expect(mockDone).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          email: "json@example.com"
        })
      );
    });

    it("should handle errors during user profile fetching", async () => {
      const mockProfile = {
        oid: "user-123",
        upn: "test@example.com",
        name: "Test User"
      };
      const mockError = new Error("Graph API error");
      const mockDone = vi.fn();

      mockFetchUserProfile.mockRejectedValue(mockError);

      await verifyCallback("issuer", "subject", mockProfile, "access-token", "refresh-token", mockDone);

      expect(mockDone).toHaveBeenCalledWith(mockError, false);
    });
  });
});
