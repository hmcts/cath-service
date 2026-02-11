import * as accountQuery from "@hmcts/account/repository/query";
import * as cloudNative from "@hmcts/cloud-native-platform";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as b2cConfig from "../../config/b2c-config.js";
import { GET, POST } from "./index.js";

vi.mock("../../config/b2c-config.js");
vi.mock("@hmcts/account/repository/query");
vi.mock("@hmcts/cloud-native-platform");

describe("B2C Callback Handler", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockSession: any;

  const validState = Buffer.from("test-session-id:12345:abc123").toString("base64");
  const validIdToken = createMockIdToken({
    sub: "user-123",
    email: "test@example.com",
    name: "Test User"
  });

  beforeEach(() => {
    vi.resetAllMocks();

    mockSession = {
      id: "test-session-id",
      b2cProvider: "cath",
      returnTo: "/account-home",
      b2cLocale: "en",
      save: vi.fn((callback) => callback(null))
    };

    mockReq = {
      query: {
        code: "test-auth-code",
        state: validState
      },
      body: {},
      session: mockSession,
      login: vi.fn((_user, callback) => callback(null))
    };

    mockRes = {
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };

    vi.mocked(b2cConfig.isB2cConfigured).mockReturnValue(true);
    vi.mocked(b2cConfig.getB2cConfig).mockReturnValue({
      tenantName: "test-tenant",
      tenantId: "test-tenant-id",
      clientId: "test-client-id",
      clientSecret: "test-secret",
      policyCath: "B2C_1_CathSignIn",
      policyPasswordReset: "B2C_1A_PASSWORD_RESET",
      redirectUri: "https://localhost:8080/login/return",
      responseType: "code",
      responseMode: "query",
      scope: ["openid"],
      customDomain: "sign-in.test.platform.hmcts.net",
      customDomainPath: "test.platform.hmcts.net"
    });
    vi.mocked(b2cConfig.getB2cBaseUrl).mockReturnValue("https://sign-in.test.platform.hmcts.net/test.platform.hmcts.net");

    vi.mocked(accountQuery.createOrUpdateUser).mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
      firstName: "Test",
      surname: "User",
      userProvenance: "PI_AAD",
      userProvenanceId: "user-123",
      role: "VERIFIED",
      createdDate: new Date(),
      lastSignedInDate: null
    });

    vi.mocked(cloudNative.trackException).mockImplementation(() => {});

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "test-access-token",
          id_token: validIdToken
        })
    });
  });

  describe("GET handler", () => {
    it("should successfully authenticate user and redirect to account-home", async () => {
      await GET(mockReq as Request, mockRes as Response);

      expect(mockReq.login).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "user-123",
          email: "test@example.com",
          displayName: "Test User",
          role: "VERIFIED",
          provenance: "B2C"
        }),
        expect.any(Function)
      );
      expect(mockSession.save).toHaveBeenCalled();
      expect(mockRes.redirect).toHaveBeenCalledWith("/account-home");
    });

    it("should redirect with Welsh locale when b2cLocale is cy", async () => {
      mockSession.b2cLocale = "cy";

      await GET(mockReq as Request, mockRes as Response);

      expect(mockRes.redirect).toHaveBeenCalledWith("/account-home?lng=cy");
    });

    it("should use custom returnTo from session", async () => {
      mockSession.returnTo = "/admin/dashboard";

      await GET(mockReq as Request, mockRes as Response);

      expect(mockRes.redirect).toHaveBeenCalledWith("/admin/dashboard");
    });

    it("should return 503 when B2C is not configured", async () => {
      vi.mocked(b2cConfig.isB2cConfigured).mockReturnValue(false);

      await GET(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.send).toHaveBeenCalledWith("B2C authentication is not available. Please check configuration.");
    });

    it("should redirect to sign-in when B2C returns an error", async () => {
      mockReq.query = {
        error: "access_denied",
        error_description: "User cancelled"
      };

      await GET(mockReq as Request, mockRes as Response);

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=auth_failed");
    });

    it("should redirect to forgot password when user clicks forgot password in B2C", async () => {
      mockReq.query = {
        error: "access_denied",
        error_description: "AADB2C90118: The user has forgotten their password."
      };
      mockSession.b2cLocale = "en";

      await GET(mockReq as Request, mockRes as Response);

      expect(mockRes.redirect).toHaveBeenCalledWith("/b2c-forgot-password?lng=en");
    });

    it("should redirect to forgot password with Welsh locale when user clicks forgot password in B2C", async () => {
      mockReq.query = {
        error: "access_denied",
        error_description: "AADB2C90118: The user has forgotten their password."
      };
      mockSession.b2cLocale = "cy";

      await GET(mockReq as Request, mockRes as Response);

      expect(mockRes.redirect).toHaveBeenCalledWith("/b2c-forgot-password?lng=cy");
    });

    it("should redirect to sign-in when authorization code is missing", async () => {
      mockReq.query = { state: validState };

      await GET(mockReq as Request, mockRes as Response);

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=invalid_request");
    });

    it("should return 403 when state parameter is missing", async () => {
      mockReq.query = { code: "test-code" };

      await GET(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.send).toHaveBeenCalledWith("Invalid request: missing state parameter");
    });

    it("should return 403 when state does not match session", async () => {
      const invalidState = Buffer.from("wrong-session-id:12345:abc123").toString("base64");
      mockReq.query = { code: "test-code", state: invalidState };

      await GET(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.send).toHaveBeenCalledWith("Invalid request: state mismatch");
    });

    it("should redirect to sign-in when provider is missing from session", async () => {
      delete mockSession.b2cProvider;

      await GET(mockReq as Request, mockRes as Response);

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=session_expired");
    });

    it("should redirect to sign-in when token exchange fails", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Invalid grant")
      });

      await GET(mockReq as Request, mockRes as Response);

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=auth_failed");
      expect(cloudNative.trackException).toHaveBeenCalled();
    });

    it("should redirect to sign-in when database update fails", async () => {
      vi.mocked(accountQuery.createOrUpdateUser).mockRejectedValue(new Error("Database error"));

      await GET(mockReq as Request, mockRes as Response);

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=db_error");
      expect(cloudNative.trackException).toHaveBeenCalled();
    });

    it("should redirect to sign-in when passport login fails", async () => {
      mockReq.login = vi.fn((_user, callback: any) => callback(new Error("Login failed")));

      await GET(mockReq as Request, mockRes as Response);

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=login_failed");
    });

    it("should redirect to sign-in when session save fails", async () => {
      mockSession.save = vi.fn((callback) => callback(new Error("Save failed")));

      await GET(mockReq as Request, mockRes as Response);

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should clear B2C session data after successful login", async () => {
      await GET(mockReq as Request, mockRes as Response);

      expect(mockSession.b2cProvider).toBeUndefined();
      expect(mockSession.returnTo).toBeUndefined();
      expect(mockSession.b2cLocale).toBeUndefined();
    });

    it("should set lastActivity timestamp on successful login", async () => {
      await GET(mockReq as Request, mockRes as Response);

      expect(mockSession.lastActivity).toBeDefined();
      expect(typeof mockSession.lastActivity).toBe("number");
    });
  });

  describe("POST handler", () => {
    it("should handle form_post response mode", async () => {
      mockReq.query = {};
      mockReq.body = {
        code: "test-auth-code",
        state: validState
      };

      await POST(mockReq as Request, mockRes as Response);

      expect(mockReq.login).toHaveBeenCalled();
      expect(mockRes.redirect).toHaveBeenCalledWith("/account-home");
    });
  });

  describe("token exchange", () => {
    it("should use CaTH policy for token exchange", async () => {
      mockSession.b2cProvider = "cath";

      await GET(mockReq as Request, mockRes as Response);

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("B2C_1_CathSignIn"), expect.any(Object));
    });

    it("should reject non-cath providers", async () => {
      mockSession.b2cProvider = "hmcts";

      await GET(mockReq as Request, mockRes as Response);

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=auth_failed");
    });

    it("should throw error for invalid provider", async () => {
      mockSession.b2cProvider = "invalid-provider";

      await GET(mockReq as Request, mockRes as Response);

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=auth_failed");
    });
  });

  describe("user profile extraction", () => {
    it("should extract email from emails array", async () => {
      const idTokenWithEmailsArray = createMockIdToken({
        sub: "user-456",
        emails: ["array-email@example.com"],
        name: "Array User"
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "test-access-token",
            id_token: idTokenWithEmailsArray
          })
      });

      await GET(mockReq as Request, mockRes as Response);

      expect(mockReq.login).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "array-email@example.com"
        }),
        expect.any(Function)
      );
    });

    it("should use oid as fallback for id when sub is missing", async () => {
      const idTokenWithOid = createMockIdToken({
        oid: "oid-user-789",
        email: "oid@example.com",
        name: "OID User"
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "test-access-token",
            id_token: idTokenWithOid
          })
      });

      await GET(mockReq as Request, mockRes as Response);

      expect(mockReq.login).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "oid-user-789"
        }),
        expect.any(Function)
      );
    });

    it("should use given_name as fallback for displayName", async () => {
      const idTokenWithGivenName = createMockIdToken({
        sub: "user-name",
        email: "name@example.com",
        given_name: "GivenName"
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "test-access-token",
            id_token: idTokenWithGivenName
          })
      });

      await GET(mockReq as Request, mockRes as Response);

      expect(mockReq.login).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: "GivenName"
        }),
        expect.any(Function)
      );
    });

    it("should extract email from signInNames.emailAddress", async () => {
      const idTokenWithSignInNames = createMockIdToken({
        sub: "user-signin",
        signInNames: { emailAddress: "signin@example.com" },
        name: "SignIn User"
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "test-access-token",
            id_token: idTokenWithSignInNames
          })
      });

      await GET(mockReq as Request, mockRes as Response);

      expect(mockReq.login).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "signin@example.com"
        }),
        expect.any(Function)
      );
    });

    it("should throw error for invalid ID token format", async () => {
      const invalidIdToken = "invalid-token-without-three-parts";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "test-access-token",
            id_token: invalidIdToken
          })
      });

      await GET(mockReq as Request, mockRes as Response);

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=auth_failed");
    });
  });
});

function createMockIdToken(payload: Record<string, any>): string {
  const header = { alg: "RS256", typ: "JWT" };
  const headerBase64 = Buffer.from(JSON.stringify(header)).toString("base64");
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = "mock-signature";
  return `${headerBase64}.${payloadBase64}.${signature}`;
}
