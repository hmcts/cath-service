import { requestAccessToken, sendOutboundRequest } from "@hmcts/third-party-user";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkPipConnection, isPipConnectionCheckConfigured } from "./connection-check.js";

vi.mock("@hmcts/third-party-user", () => ({
  requestAccessToken: vi.fn(),
  sendOutboundRequest: vi.fn()
}));

const ACCESS_TOKEN = "eyJ.access.token";
const CLIENT_SECRET = "super-secret-value";
const TARGET = new URL("https://pip-data-management.staging.platform.hmcts.net/locations/111?caseRef=ABC123");

const DATA_MANAGEMENT_URI = "api://data-management-app-id";

const TOKEN_ENV = {
  AZURE_TENANT_ID: "tenant-id",
  PIP_API_CLIENT_ID: "client-id",
  PIP_API_CLIENT_SECRET: CLIENT_SECRET
};

const HOSTS_ENV = {
  PIP_DATA_MANAGEMENT_SCOPE: DATA_MANAGEMENT_URI,
  PIP_ACCOUNT_MANAGEMENT_SCOPE: "api://account-management-app-id"
};

function okResponse(status = 200) {
  const response = new Response("{}", { status });
  return { kind: "response" as const, status, response };
}

describe("connection-check", () => {
  const originalEnv = process.env;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, ...TOKEN_ENV, ...HOSTS_ENV };
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requestAccessToken).mockResolvedValue({ kind: "token", accessToken: ACCESS_TOKEN });
    vi.mocked(sendOutboundRequest).mockResolvedValue(okResponse());
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleErrorSpy.mockRestore();
  });

  describe("isPipConnectionCheckConfigured", () => {
    it("should return true when the tenant, client ID and client secret are present", () => {
      // Act & Assert
      expect(isPipConnectionCheckConfigured()).toBe(true);
    });

    it.each(Object.keys(TOKEN_ENV))("should return false when %s is missing", (name) => {
      // Arrange
      delete process.env[name];

      // Act & Assert
      expect(isPipConnectionCheckConfigured()).toBe(false);
    });

    it("should return false when a setting is only whitespace", () => {
      // Arrange
      process.env.PIP_API_CLIENT_SECRET = "   ";

      // Act & Assert
      expect(isPipConnectionCheckConfigured()).toBe(false);
    });
  });

  describe("checkPipConnection", () => {
    it("should return not-configured and send nothing when a token setting is missing", async () => {
      // Arrange
      delete process.env.PIP_API_CLIENT_SECRET;

      // Act
      const result = await checkPipConnection(TARGET);

      // Assert
      expect(result).toEqual({ kind: "not-configured" });
      expect(requestAccessToken).not.toHaveBeenCalled();
      expect(sendOutboundRequest).not.toHaveBeenCalled();
    });

    it("should request a client-credentials token from the tenant's Entra endpoint", async () => {
      // Act
      await checkPipConnection(TARGET);

      // Assert
      expect(requestAccessToken).toHaveBeenCalledWith({
        tokenUrl: "https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token",
        clientId: "client-id",
        clientSecret: CLIENT_SECRET,
        scope: `${DATA_MANAGEMENT_URI}/.default`
      });
    });

    it("should request the token for the app ID URI of the host being called", async () => {
      // Arrange
      const accountManagement = new URL("https://pip-account-management.staging.platform.hmcts.net/account/1");

      // Act
      await checkPipConnection(accountManagement);

      // Assert
      expect(requestAccessToken).toHaveBeenCalledWith(expect.objectContaining({ scope: "api://account-management-app-id/.default" }));
    });

    it.each([DATA_MANAGEMENT_URI, `${DATA_MANAGEMENT_URI}/`, `${DATA_MANAGEMENT_URI}/.default`])(
      "should request <app ID URI>/.default when the configured value is %s",
      async (appIdUri) => {
        // Arrange
        process.env.PIP_DATA_MANAGEMENT_SCOPE = appIdUri;

        // Act
        await checkPipConnection(TARGET);

        // Assert
        expect(requestAccessToken).toHaveBeenCalledWith(expect.objectContaining({ scope: `${DATA_MANAGEMENT_URI}/.default` }));
      }
    );

    it("should return not-configured and send nothing when the host has no scope", async () => {
      // Arrange
      delete process.env.PIP_DATA_MANAGEMENT_SCOPE;

      // Act
      const result = await checkPipConnection(TARGET);

      // Assert
      expect(result).toEqual({ kind: "not-configured" });
      expect(requestAccessToken).not.toHaveBeenCalled();
      expect(sendOutboundRequest).not.toHaveBeenCalled();
    });

    it("should send a GET with the bearer token to the URL", async () => {
      // Act
      await checkPipConnection(TARGET);

      // Assert
      expect(sendOutboundRequest).toHaveBeenCalledWith(TARGET.toString(), {
        method: "GET",
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, Accept: "application/json" }
      });
    });

    it.each([200, 302, 401, 403, 404, 429, 503])("should return the status and duration when the PIP API responds with %i", async (status) => {
      // Arrange
      const outbound = okResponse(status);
      vi.mocked(sendOutboundRequest).mockResolvedValue(outbound);

      // Act
      const result = await checkPipConnection(TARGET);

      // Assert
      expect(result).toEqual({ kind: "response", status, durationMs: expect.any(Number), bodyPreview: undefined });
    });

    it("should return a masked preview of a JSON response body", async () => {
      // Arrange
      const response = new Response('{"name":"Jane Doe","locationId":111}', { status: 200, headers: { "Content-Type": "application/json" } });
      vi.mocked(sendOutboundRequest).mockResolvedValue({ kind: "response", status: 200, response });

      // Act
      const result = await checkPipConnection(TARGET);

      // Assert
      expect(result).toEqual({ kind: "response", status: 200, durationMs: expect.any(Number), bodyPreview: '{"name":"***","locationId":111}' });
    });

    it.each([
      [
        { kind: "http-status" as const, status: 401 },
        { kind: "http-status", status: 401 }
      ],
      [{ kind: "invalid-token-response" as const }, { kind: "invalid-token-response" }],
      [{ kind: "network-error" as const, code: "ENOTFOUND" }, { kind: "network-error" }],
      [{ kind: "timeout" as const }, { kind: "timeout" }]
    ])("should return token-failure and not call the PIP API when the token request fails with %o", async (tokenResult, reason) => {
      // Arrange
      vi.mocked(requestAccessToken).mockResolvedValue(tokenResult);

      // Act
      const result = await checkPipConnection(TARGET);

      // Assert
      expect(result).toEqual({ kind: "token-failure", reason });
      expect(sendOutboundRequest).not.toHaveBeenCalled();
    });

    it("should return the network error code when the PIP API cannot be reached", async () => {
      // Arrange
      vi.mocked(sendOutboundRequest).mockResolvedValue({ kind: "network-error", code: "ECONNREFUSED" });

      // Act
      const result = await checkPipConnection(TARGET);

      // Assert
      expect(result).toEqual({ kind: "network-error", code: "ECONNREFUSED", durationMs: expect.any(Number) });
    });

    it("should return timeout when the PIP API does not respond in time", async () => {
      // Arrange
      vi.mocked(sendOutboundRequest).mockResolvedValue({ kind: "timeout" });

      // Act
      const result = await checkPipConnection(TARGET);

      // Assert
      expect(result).toEqual({ kind: "timeout", durationMs: expect.any(Number) });
    });

    it("should treat an invalid-url outbound result as a network error", async () => {
      // Arrange
      vi.mocked(sendOutboundRequest).mockResolvedValue({ kind: "invalid-url" });

      // Act
      const result = await checkPipConnection(TARGET);

      // Assert
      expect(result).toEqual({ kind: "network-error", durationMs: expect.any(Number) });
    });

    it("should log only the host, stage and reason on failure", async () => {
      // Arrange
      vi.mocked(sendOutboundRequest).mockResolvedValue({ kind: "network-error", code: "ENOTFOUND" });

      // Act
      await checkPipConnection(TARGET);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "PIP connection check failed: host=pip-data-management.staging.platform.hmcts.net stage=request reason=network-error code=ENOTFOUND"
      );
    });

    it("should never log the token, the client secret, the path or the query string", async () => {
      // Arrange
      vi.mocked(requestAccessToken).mockResolvedValue({ kind: "http-status", status: 401 });

      // Act
      await checkPipConnection(TARGET);

      // Assert
      const logged = JSON.stringify(consoleErrorSpy.mock.calls);
      expect(logged).toContain("stage=token reason=http-status-401");
      expect(logged).not.toContain(CLIENT_SECRET);
      expect(logged).not.toContain(ACCESS_TOKEN);
      expect(logged).not.toContain("locations/111");
      expect(logged).not.toContain("ABC123");
    });
  });
});
