import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessToken } from "./access-token.js";
import { getTokenCredentials, type TokenCredentials } from "./oauth-config.js";

const mockRedisClient = vi.hoisted(() => ({
  getEx: vi.fn(),
  set: vi.fn()
}));

vi.mock("@hmcts/redis", () => ({
  getRedisClient: vi.fn().mockResolvedValue(mockRedisClient)
}));
vi.mock("./oauth-config.js", () => ({ getTokenCredentials: vi.fn() }));

const SUBSCRIBER_NAME = "courtel";
const USER_ID = "user-1";
const CACHE_KEY = `third-party_token-cache:${USER_ID}`;
const NOW = new Date("2026-03-15T10:00:00Z").getTime();
const CONFIG: TokenCredentials = {
  tokenUrl: "https://idp.example/token",
  scope: "api://subscriber/.default",
  clientId: "client-id",
  clientSecret: "super-secret-value"
};

const mockFetch = vi.fn();

function tokenResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("getAccessToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.stubGlobal("fetch", mockFetch);
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockRedisClient.getEx.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue("OK");
    vi.mocked(getTokenCredentials).mockResolvedValue(CONFIG);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("should return the cached token without calling the identity provider when the cache entry is valid", async () => {
    // Arrange
    mockRedisClient.getEx.mockResolvedValue(JSON.stringify({ accessToken: "cached-token", expiry: NOW + 60_000 }));

    // Act
    const result = await getAccessToken(SUBSCRIBER_NAME, USER_ID);

    // Assert
    expect(result).toBe("cached-token");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(getTokenCredentials).not.toHaveBeenCalled();
    expect(mockRedisClient.getEx).toHaveBeenCalledWith(CACHE_KEY, { type: "EX", value: 86_400 });
  });

  it("should request a token with the client_credentials grant and cache it on a miss", async () => {
    // Arrange
    mockFetch.mockResolvedValue(tokenResponse({ access_token: "new-token", expires_in: 3599 }));

    // Act
    const result = await getAccessToken(SUBSCRIBER_NAME, USER_ID);

    // Assert
    expect(result).toBe("new-token");
    expect(getTokenCredentials).toHaveBeenCalledWith(SUBSCRIBER_NAME, USER_ID);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(CONFIG.tokenUrl);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/x-www-form-urlencoded" });
    const body = new URLSearchParams(init.body.toString());
    expect(Object.fromEntries(body)).toEqual({
      grant_type: "client_credentials",
      client_id: "client-id",
      client_secret: "super-secret-value",
      scope: "api://subscriber/.default"
    });
    expect(mockRedisClient.set).toHaveBeenCalledWith(CACHE_KEY, JSON.stringify({ accessToken: "new-token", expiry: NOW + (3599 - 60) * 1000 }), {
      expiration: { type: "EX", value: 86_400 }
    });
  });

  it("should request a new token when the cached expiry has passed", async () => {
    // Arrange
    mockRedisClient.getEx.mockResolvedValue(JSON.stringify({ accessToken: "stale-token", expiry: NOW }));
    mockFetch.mockResolvedValue(tokenResponse({ access_token: "fresh-token", expires_in: 3600 }));

    // Act
    const result = await getAccessToken(SUBSCRIBER_NAME, USER_ID);

    // Assert
    expect(result).toBe("fresh-token");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockRedisClient.set).toHaveBeenCalledWith(CACHE_KEY, JSON.stringify({ accessToken: "fresh-token", expiry: NOW + 3540 * 1000 }), expect.anything());
  });

  it("should treat an unreadable cache entry as a miss", async () => {
    // Arrange
    mockRedisClient.getEx.mockResolvedValue("not-json");
    mockFetch.mockResolvedValue(tokenResponse({ access_token: "fresh-token", expires_in: 3600 }));

    // Act
    const result = await getAccessToken(SUBSCRIBER_NAME, USER_ID);

    // Assert
    expect(result).toBe("fresh-token");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["60", 60],
    ["30", 30],
    ["missing", undefined]
  ])("should store the token with expiry 0 when expires_in is %s", async (_label, expiresIn) => {
    // Arrange
    mockFetch.mockResolvedValue(tokenResponse({ access_token: "short-token", expires_in: expiresIn }));

    // Act
    const result = await getAccessToken(SUBSCRIBER_NAME, USER_ID);

    // Assert
    expect(result).toBe("short-token");
    expect(mockRedisClient.set).toHaveBeenCalledWith(CACHE_KEY, JSON.stringify({ accessToken: "short-token", expiry: 0 }), {
      expiration: { type: "EX", value: 86_400 }
    });
  });

  it("should request again on the next call when the stored expiry is 0", async () => {
    // Arrange
    mockRedisClient.getEx.mockResolvedValue(JSON.stringify({ accessToken: "short-token", expiry: 0 }));
    mockFetch.mockResolvedValue(tokenResponse({ access_token: "next-token", expires_in: 30 }));

    // Act
    const result = await getAccessToken(SUBSCRIBER_NAME, USER_ID);

    // Assert
    expect(result).toBe("next-token");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["the token endpoint returns non-2xx", () => mockFetch.mockResolvedValue(tokenResponse({ error: "invalid_client" }, 401))],
    ["the token request fails at network level", () => mockFetch.mockRejectedValue(new Error("fetch failed"))],
    ["the response has no access_token", () => mockFetch.mockResolvedValue(tokenResponse({ expires_in: 3600 }))]
  ])("should return null, cache nothing and log the user ID when %s", async (_label, arrange) => {
    // Arrange
    arrange();

    // Act
    const result = await getAccessToken(SUBSCRIBER_NAME, USER_ID);

    // Assert
    expect(result).toBeNull();
    expect(mockRedisClient.set).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Failed to obtain OAuth access token"), expect.objectContaining({ userId: USER_ID }));
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).not.toContain(CONFIG.clientSecret);
    expect(logged).not.toContain(CONFIG.tokenUrl);
  });

  it("should return null without requesting a token when the credentials are incomplete", async () => {
    // Arrange
    vi.mocked(getTokenCredentials).mockResolvedValue(null);

    // Act
    const result = await getAccessToken(SUBSCRIBER_NAME, USER_ID);

    // Assert
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockRedisClient.set).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Failed to obtain OAuth access token"), {
      userId: USER_ID,
      reason: "Incomplete OAuth token configuration"
    });
  });

  it("should throw when the credentials are incomplete in health check mode", async () => {
    // Arrange
    vi.mocked(getTokenCredentials).mockResolvedValue(null);

    // Act
    const act = getAccessToken(SUBSCRIBER_NAME, USER_ID, true);

    // Assert
    await expect(act).rejects.toThrow(`Failed to obtain OAuth access token for third-party user ${USER_ID}`);
  });

  it("should throw when the token request fails in health check mode", async () => {
    // Arrange
    mockFetch.mockResolvedValue(tokenResponse({}, 500));

    // Act
    const act = getAccessToken(SUBSCRIBER_NAME, USER_ID, true);

    // Assert
    await expect(act).rejects.toThrow(`Failed to obtain OAuth access token for third-party user ${USER_ID}`);
    expect(mockRedisClient.set).not.toHaveBeenCalled();
  });

  it("should propagate Redis errors", async () => {
    // Arrange
    mockRedisClient.getEx.mockRejectedValue(new Error("Redis down"));

    // Act
    const act = getAccessToken(SUBSCRIBER_NAME, USER_ID);

    // Assert
    await expect(act).rejects.toThrow("Redis down");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
