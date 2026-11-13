import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestAccessToken } from "./access-token.js";
import type { OauthConfig } from "./oauth-config.js";

const fetchMock = vi.fn();

const CONFIG: OauthConfig = {
  destinationUrl: "https://destination.example.com/health",
  tokenUrl: "https://token.example.com/oauth2/token",
  scope: "api://scope/.default",
  clientId: "client-id-value",
  clientSecret: "client-secret-value"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("requestAccessToken", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("should send a client credentials request and return the token", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ access_token: "token-value", token_type: "Bearer", expires_in: 3600 }));

    const result = await requestAccessToken(CONFIG);

    expect(result).toEqual({ kind: "token", accessToken: "token-value" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url.toString()).toBe(CONFIG.tokenUrl);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" });
    const form = new URLSearchParams(init.body);
    expect(Object.fromEntries(form)).toEqual({
      grant_type: "client_credentials",
      client_id: "client-id-value",
      client_secret: "client-secret-value",
      scope: "api://scope/.default"
    });
  });

  it("should url-encode special characters in credentials", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ access_token: "t" }));

    await requestAccessToken({ ...CONFIG, clientSecret: "a&b=c d" });

    const body: string = fetchMock.mock.calls[0][1].body;
    expect(body).not.toContain("a&b=c d");
    expect(new URLSearchParams(body).get("client_secret")).toBe("a&b=c d");
  });

  it.each([400, 401, 500, 302])("should return http-status for a %s response", async (status) => {
    fetchMock.mockResolvedValue(new Response("error body", { status }));

    expect(await requestAccessToken(CONFIG)).toEqual({ kind: "http-status", status });
  });

  it("should return invalid-token-response for a non-JSON 200", async () => {
    fetchMock.mockResolvedValue(new Response("<html>login</html>", { status: 200 }));

    expect(await requestAccessToken(CONFIG)).toEqual({ kind: "invalid-token-response" });
  });

  it.each([
    ["missing", {}],
    ["empty", { access_token: "" }],
    ["a number", { access_token: 123 }],
    ["an object", { access_token: { a: 1 } }],
    ["null", { access_token: null }]
  ])("should return invalid-token-response when access_token is %s", async (_label, body) => {
    fetchMock.mockResolvedValue(jsonResponse(body));

    expect(await requestAccessToken(CONFIG)).toEqual({ kind: "invalid-token-response" });
  });

  it.each([
    ["null", null],
    ["an array", []],
    ["a string", "text"]
  ])("should return invalid-token-response when the body is %s", async (_label, body) => {
    fetchMock.mockResolvedValue(jsonResponse(body));

    expect(await requestAccessToken(CONFIG)).toEqual({ kind: "invalid-token-response" });
  });

  it("should return timeout when the request times out", async () => {
    fetchMock.mockRejectedValue(new DOMException("timeout", "TimeoutError"));

    expect(await requestAccessToken(CONFIG)).toEqual({ kind: "timeout" });
  });

  it("should return timeout when reading the body times out", async () => {
    const response = new Response("{}", { status: 200 });
    vi.spyOn(response, "json").mockRejectedValue(new DOMException("timeout", "TimeoutError"));
    fetchMock.mockResolvedValue(response);

    expect(await requestAccessToken(CONFIG)).toEqual({ kind: "timeout" });
  });

  it("should return network-error when the connection fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } }));

    expect(await requestAccessToken(CONFIG)).toEqual({ kind: "network-error", code: "ENOTFOUND" });
  });

  it("should return invalid-url without calling fetch for a bad token URL", async () => {
    expect(await requestAccessToken({ ...CONFIG, tokenUrl: "not a url" })).toEqual({ kind: "invalid-url" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
