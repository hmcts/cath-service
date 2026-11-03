import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testThirdPartyConnection } from "./connection-test-service.js";

vi.mock("./key-vault-service.js", () => ({
  createKeyVaultSecretName: (userId: string, type: string) => `third-party-${userId}-${type}`,
  getSecret: vi.fn()
}));

import { getSecret } from "./key-vault-service.js";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const CLIENT_SECRET = "s3cr3t-value";
const ACCESS_TOKEN = "tok-abc-123";
const TOKEN_URL = "https://token.example.com/oauth2/token";
const DESTINATION_URL = "https://destination.example.com/third-party";

const SECRETS: Record<string, string> = {
  "destination-url": DESTINATION_URL,
  "token-url": TOKEN_URL,
  scope: "api://scope/.default",
  "client-id": "client-id-value",
  "client-secret": CLIENT_SECRET
};

const fetchMock = vi.fn();
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

function mockSecrets(overrides: Record<string, string | undefined> = {}) {
  const values = { ...SECRETS, ...overrides };
  vi.mocked(getSecret).mockImplementation(async (name: string) => values[name.replace(`third-party-${USER_ID}-`, "")]);
}

function tokenResponse() {
  return new Response(JSON.stringify({ access_token: ACCESS_TOKEN, token_type: "Bearer" }), { status: 200 });
}

function mockFetch(token: () => Promise<Response> | Response, destination: () => Promise<Response> | Response = () => new Response(null, { status: 200 })) {
  fetchMock.mockImplementation(async (url: URL) => (url.toString() === TOKEN_URL ? token() : destination()));
}

function loggedText(): string {
  return JSON.stringify(consoleErrorSpy.mock.calls);
}

describe("testThirdPartyConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockSecrets();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    consoleErrorSpy.mockRestore();
  });

  describe("success", () => {
    it("should get a token then call the destination with a bearer token and return success", async () => {
      mockFetch(tokenResponse);

      const result = await testThirdPartyConnection(USER_ID);

      expect(result).toEqual({ status: "success" });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [tokenCall, destinationCall] = fetchMock.mock.calls;
      expect(tokenCall[0].toString()).toBe(TOKEN_URL);
      expect(tokenCall[1].method).toBe("POST");
      expect(Object.fromEntries(new URLSearchParams(tokenCall[1].body))).toEqual({
        grant_type: "client_credentials",
        client_id: "client-id-value",
        client_secret: CLIENT_SECRET,
        scope: "api://scope/.default"
      });
      expect(destinationCall[0].toString()).toBe(DESTINATION_URL);
      expect(destinationCall[1].method).toBe("GET");
      expect(destinationCall[1].headers).toEqual({ Authorization: `Bearer ${ACCESS_TOKEN}` });
      expect(destinationCall[1].body).toBeUndefined();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should not follow redirects and should pass a signal on both requests", async () => {
      mockFetch(tokenResponse);

      await testThirdPartyConnection(USER_ID);

      for (const [, init] of fetchMock.mock.calls) {
        expect(init.redirect).toBe("manual");
        expect(init.signal).toBeInstanceOf(AbortSignal);
      }
    });

    it.each([200, 204, 299])("should treat a %s destination response as success", async (status) => {
      mockFetch(tokenResponse, () => new Response(null, { status }));

      expect(await testThirdPartyConnection(USER_ID)).toEqual({ status: "success" });
    });

    it("should request a fresh token on every call", async () => {
      mockFetch(tokenResponse);

      await testThirdPartyConnection(USER_ID);
      await testThirdPartyConnection(USER_ID);

      const tokenCalls = fetchMock.mock.calls.filter(([url]) => url.toString() === TOKEN_URL);
      expect(tokenCalls).toHaveLength(2);
    });
  });

  describe("missing configuration", () => {
    it.each(Object.keys(SECRETS))("should return missing-configuration without any request when %s is undefined", async (name) => {
      mockSecrets({ [name]: undefined });

      const result = await testThirdPartyConnection(USER_ID);

      expect(result).toEqual({ status: "missing-configuration" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should return missing-configuration when a value is blank", async () => {
      mockSecrets({ scope: "  " });

      expect(await testThirdPartyConnection(USER_ID)).toEqual({ status: "missing-configuration" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should log the failure with the user id", async () => {
      mockSecrets({ scope: undefined });

      await testThirdPartyConnection(USER_ID);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(`userId=${USER_ID} stage=missing-configuration`));
    });
  });

  describe("token failure", () => {
    it.each([401, 400, 500, 302])("should return token-failure with http-status %s and not call the destination", async (status) => {
      mockFetch(() => new Response("error", { status }));

      const result = await testThirdPartyConnection(USER_ID);

      expect(result).toEqual({ status: "token-failure", reason: { kind: "http-status", status } });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["non-JSON", () => new Response("<html></html>", { status: 200 })],
      ["JSON without access_token", () => new Response("{}", { status: 200 })],
      ["empty access_token", () => new Response(JSON.stringify({ access_token: "" }), { status: 200 })],
      ["non-string access_token", () => new Response(JSON.stringify({ access_token: 42 }), { status: 200 })]
    ])("should return invalid-token-response for %s", async (_label, token) => {
      mockFetch(token);

      const result = await testThirdPartyConnection(USER_ID);

      expect(result).toEqual({ status: "token-failure", reason: { kind: "invalid-token-response" } });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("should return invalid-url for a bad token URL without calling fetch", async () => {
      mockSecrets({ "token-url": "not a url" });

      expect(await testThirdPartyConnection(USER_ID)).toEqual({ status: "token-failure", reason: { kind: "invalid-url" } });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should return connection-failed when the token endpoint is unreachable", async () => {
      fetchMock.mockRejectedValue(new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } }));

      expect(await testThirdPartyConnection(USER_ID)).toEqual({ status: "token-failure", reason: { kind: "connection-failed" } });
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("stage=token reason=connection-failed code=ECONNREFUSED"));
    });

    it("should log the stage, reason and user id", async () => {
      mockFetch(() => new Response("error", { status: 401 }));

      await testThirdPartyConnection(USER_ID);

      expect(consoleErrorSpy).toHaveBeenCalledWith(`Third party connection test failed: userId=${USER_ID} stage=token reason=http-status-401`);
    });
  });

  describe("destination failure", () => {
    it.each([403, 500, 302, 404])("should return destination-failure with http-status %s", async (status) => {
      mockFetch(tokenResponse, () => new Response(null, { status }));

      expect(await testThirdPartyConnection(USER_ID)).toEqual({ status: "destination-failure", reason: { kind: "http-status", status } });
    });

    it.each(["ftp://destination.example.com", "data:text/plain,ok", "not a url", "https://user:pass@destination.example.com"])(
      "should return invalid-url for destination %s without calling the destination",
      async (destinationUrl) => {
        mockSecrets({ "destination-url": destinationUrl });
        mockFetch(tokenResponse);

        const result = await testThirdPartyConnection(USER_ID);

        expect(result).toEqual({ status: "destination-failure", reason: { kind: "invalid-url" } });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      }
    );

    it("should return connection-failed when the destination is unreachable", async () => {
      mockFetch(tokenResponse, () => {
        throw new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } });
      });

      expect(await testThirdPartyConnection(USER_ID)).toEqual({ status: "destination-failure", reason: { kind: "connection-failed" } });
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("stage=destination reason=connection-failed"));
    });
  });

  describe("timeout and unexpected errors", () => {
    it("should return error when the token request times out", async () => {
      mockFetch(() => {
        throw new DOMException("timeout", "TimeoutError");
      });

      expect(await testThirdPartyConnection(USER_ID)).toEqual({ status: "error" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("stage=token reason=timeout"));
    });

    it("should return error when the destination request times out", async () => {
      mockFetch(tokenResponse, () => {
        throw new DOMException("timeout", "TimeoutError");
      });

      expect(await testThirdPartyConnection(USER_ID)).toEqual({ status: "error" });
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("stage=destination reason=timeout"));
    });

    it("should return error when reading the token body times out", async () => {
      const response = new Response("{}", { status: 200 });
      vi.spyOn(response, "json").mockRejectedValue(new DOMException("timeout", "TimeoutError"));
      mockFetch(() => response);

      expect(await testThirdPartyConnection(USER_ID)).toEqual({ status: "error" });
    });

    it("should return error without rethrowing when reading the config fails", async () => {
      vi.mocked(getSecret).mockRejectedValue(new Error(`database password=${CLIENT_SECRET}`));

      const result = await testThirdPartyConnection(USER_ID);

      expect(result).toEqual({ status: "error" });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(`Third party connection test failed: userId=${USER_ID} stage=error reason=unexpected code=Error`);
    });
  });

  describe("secret safety", () => {
    const LEAKY_URL_USERINFO = "https://admin:hunter2@token.example.com/oauth2/token";

    function expectNoSecrets(text: string) {
      for (const secret of [CLIENT_SECRET, ACCESS_TOKEN, "hunter2", "client-id-value", "api://scope", "destination.example.com", "token.example.com"]) {
        expect(text).not.toContain(secret);
      }
    }

    it("should not leak secrets from a failing token endpoint body", async () => {
      mockFetch(() => new Response(`invalid client ${CLIENT_SECRET} ${ACCESS_TOKEN}`, { status: 401 }));

      const result = await testThirdPartyConnection(USER_ID);

      expectNoSecrets(JSON.stringify(result));
      expectNoSecrets(loggedText());
      expect(loggedText()).toContain(USER_ID);
    });

    it("should not leak secrets from a failing destination body", async () => {
      mockFetch(tokenResponse, () => new Response(`denied for ${ACCESS_TOKEN}`, { status: 403 }));

      const result = await testThirdPartyConnection(USER_ID);

      expectNoSecrets(JSON.stringify(result));
      expectNoSecrets(loggedText());
    });

    it.each(["token", "destination"])("should not leak secrets from rejected fetch messages at the %s stage", async (stage) => {
      const error = new TypeError(`fetch failed ${CLIENT_SECRET} ${ACCESS_TOKEN} ${LEAKY_URL_USERINFO}`, {
        cause: Object.assign(new Error(`connect failed ${CLIENT_SECRET}`), { code: `ECONNREFUSED ${CLIENT_SECRET}` })
      });
      if (stage === "token") {
        fetchMock.mockRejectedValue(error);
      } else {
        mockFetch(tokenResponse, () => {
          throw error;
        });
      }

      const result = await testThirdPartyConnection(USER_ID);

      expectNoSecrets(JSON.stringify(result));
      expectNoSecrets(loggedText());
    });

    it("should not leak secrets from a URL with embedded credentials", async () => {
      mockSecrets({ "token-url": LEAKY_URL_USERINFO });

      const result = await testThirdPartyConnection(USER_ID);

      expect(result).toEqual({ status: "token-failure", reason: { kind: "invalid-url" } });
      expectNoSecrets(JSON.stringify(result));
      expectNoSecrets(loggedText());
    });

    it("should not leak secrets from an unexpected error", async () => {
      vi.mocked(getSecret).mockRejectedValue(new Error(`vault error ${CLIENT_SECRET} ${LEAKY_URL_USERINFO}`));

      const result = await testThirdPartyConnection(USER_ID);

      expectNoSecrets(JSON.stringify(result));
      expectNoSecrets(loggedText());
    });
  });
});
