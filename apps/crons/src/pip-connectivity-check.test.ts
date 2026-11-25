import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configValues: {} as Record<string, string | undefined>
}));

vi.mock("config", () => ({
  default: {
    has: (key: string) => mocks.configValues[key] !== undefined,
    get: (key: string) => mocks.configValues[key]
  }
}));

import pipConnectivityCheck from "./pip-connectivity-check.js";

const PIP_API_URL = "https://sds-api.staging.example.net";
const CLIENT_SECRET = "super-secret-value";
const ACCESS_TOKEN = "eyJ.access.token";

const PIP_ENV = {
  PIP_API_CHECK_PATH: "/publications",
  AZURE_TENANT_ID: "tenant-id",
  CATH_SERVICE_API_CLIENT_ID: "client-id",
  CATH_SERVICE_API_CLIENT_SECRET: CLIENT_SECRET,
  CATH_SERVICE_API_CLIENT_SCOPE: "api://client-id/.default"
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function tokenResponse() {
  return jsonResponse(200, { access_token: ACCESS_TOKEN, expires_in: 3599 });
}

function codedError(code: string) {
  return Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new Error(code), { code }) });
}

describe("pipConnectivityCheck", () => {
  const originalEnv = process.env;
  let fetchMock: ReturnType<typeof vi.fn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = { ...originalEnv, ...PIP_ENV };
    mocks.configValues = { "pipApi.url": PIP_API_URL };
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("success", () => {
    it("should request a client-credentials token from the tenant's Entra endpoint", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse(200, []));

      // Act
      await pipConnectivityCheck();

      // Assert
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token");
      expect(init.method).toBe("POST");
      expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
        grant_type: "client_credentials",
        client_id: "client-id",
        client_secret: CLIENT_SECRET,
        scope: "api://client-id/.default"
      });
    });

    it("should call the SDS endpoint with the bearer token", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse(200, []));

      // Act
      await pipConnectivityCheck();

      // Assert
      const [url, init] = fetchMock.mock.calls[1];
      expect(String(url)).toBe(`${PIP_API_URL}/publications`);
      expect(init.headers).toEqual({ Authorization: `Bearer ${ACCESS_TOKEN}`, Accept: "application/json" });
    });

    it("should log the status and item count only", async () => {
      // Arrange
      fetchMock
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(200, [{ email: "person@example.com" }, { email: "other@example.com" }]));

      // Act
      await pipConnectivityCheck();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith("PIP SDS API read OK", { status: 200, itemCount: 2, durationMs: expect.any(Number) });
      const logged = JSON.stringify(consoleLogSpy.mock.calls);
      expect(logged).not.toContain("person@example.com");
      expect(logged).not.toContain(ACCESS_TOKEN);
      expect(logged).not.toContain(CLIENT_SECRET);
    });

    it("should log no item count when the response is not an array", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse(200, { status: "UP" }));

      // Act
      await pipConnectivityCheck();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith("PIP SDS API read OK", { status: 200, itemCount: undefined, durationMs: expect.any(Number) });
    });
  });

  describe("configuration", () => {
    it.each(["PIP_API_CHECK_PATH", "AZURE_TENANT_ID", "CATH_SERVICE_API_CLIENT_ID", "CATH_SERVICE_API_CLIENT_SECRET", "CATH_SERVICE_API_CLIENT_SCOPE"])(
      "should fail with a CONFIG error when %s is missing",
      async (name) => {
        // Arrange
        delete process.env[name];

        // Act & Assert
        await expect(pipConnectivityCheck()).rejects.toThrow(`[CONFIG]: ${name} is required`);
        expect(fetchMock).not.toHaveBeenCalled();
      }
    );

    it("should fail with a CONFIG error when PIP_API_URL is not configured", async () => {
      // Arrange
      mocks.configValues = {};

      // Act & Assert
      await expect(pipConnectivityCheck()).rejects.toThrow("[CONFIG]: PIP_API_URL is required");
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("token step", () => {
    it("should fail with a TOKEN error and the Entra error code when Entra rejects the client", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: "invalid_client", error_codes: [7000215], error_description: "Invalid secret" }));

      // Act & Assert
      await expect(pipConnectivityCheck()).rejects.toThrow("PIP TOKEN step failed [TOKEN]: Token endpoint returned status 401 (invalid_client AADSTS7000215)");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("should fail with a TOKEN error when the error body is not JSON", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(new Response("Bad Request", { status: 400 }));

      // Act & Assert
      await expect(pipConnectivityCheck()).rejects.toThrow("PIP TOKEN step failed [TOKEN]: Token endpoint returned status 400");
    });

    it("should fail with a TOKEN error when the response has no access token", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { token_type: "Bearer" }));

      // Act & Assert
      await expect(pipConnectivityCheck()).rejects.toThrow("PIP TOKEN step failed [TOKEN]: Token response did not contain an access token");
    });

    it("should fail with a DNS error when the token endpoint cannot be resolved", async () => {
      // Arrange
      fetchMock.mockRejectedValueOnce(codedError("ENOTFOUND"));

      // Act & Assert
      await expect(pipConnectivityCheck()).rejects.toThrow("PIP TOKEN step failed [DNS]: ENOTFOUND fetch failed");
    });

    it("should never include the client secret in the error", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: "invalid_client" }));

      // Act
      const error = await pipConnectivityCheck().catch((caught: unknown) => caught as Error);

      // Assert
      expect(error.message).not.toContain(CLIENT_SECRET);
      expect(error.cause).toBeUndefined();
    });
  });

  describe("API step", () => {
    it.each([
      [401, "AUTH_DENIED"],
      [403, "FORBIDDEN"],
      [429, "RATE_LIMITED"],
      [503, "UPSTREAM"],
      [404, "UNKNOWN"]
    ])("should fail when the SDS API returns %i with category %s", async (status, category) => {
      // Arrange
      fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse(status, { message: "nope" }));

      // Act & Assert
      await expect(pipConnectivityCheck()).rejects.toThrow(`PIP API step failed [${category}]: SDS API returned status ${status}`);
    });

    it.each([
      ["ENOTFOUND", "DNS"],
      ["ECONNREFUSED", "CONNECTION"],
      ["UND_ERR_CONNECT_TIMEOUT", "CONNECTION"]
    ])("should fail when the network error is %s with category %s", async (code, category) => {
      // Arrange
      fetchMock.mockResolvedValueOnce(tokenResponse()).mockRejectedValueOnce(codedError(code));

      // Act & Assert
      await expect(pipConnectivityCheck()).rejects.toThrow(`PIP API step failed [${category}]: ${code} fetch failed`);
    });

    it("should fail with a CONNECTION error when the request times out", async () => {
      // Arrange
      const timeout = new DOMException("The operation was aborted due to timeout", "TimeoutError");
      fetchMock.mockResolvedValueOnce(tokenResponse()).mockRejectedValueOnce(timeout);

      // Act & Assert
      await expect(pipConnectivityCheck()).rejects.toThrow("PIP API step failed [CONNECTION]");
    });

    it("should fail with an UNKNOWN error when the response is not JSON", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(new Response("<html>", { status: 200 }));

      // Act & Assert
      await expect(pipConnectivityCheck()).rejects.toThrow("PIP API step failed [UNKNOWN]");
    });

    it("should never include the access token in the error", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse(403, {}));

      // Act
      const error = await pipConnectivityCheck().catch((caught: unknown) => caught as Error);

      // Assert
      expect(error.message).not.toContain(ACCESS_TOKEN);
    });
  });
});
