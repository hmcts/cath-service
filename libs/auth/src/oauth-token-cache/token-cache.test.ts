import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockRedisClient = vi.hoisted(() => ({
  get: vi.fn(),
  setEx: vi.fn()
}));

vi.mock("@hmcts/redis", () => ({
  getRedisClient: vi.fn().mockResolvedValue(mockRedisClient)
}));

import { getCachedAccessToken } from "./token-cache.js";

const NOW = new Date("2026-01-01T10:00:00.000Z").getTime();
const CACHE_NAME = "test-service";
const CACHE_KEY = "oauth:token:test-service";

describe("getCachedAccessToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.setEx.mockResolvedValue("OK");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return the cached token without fetching when the cached entry has not expired", async () => {
    // Arrange
    mockRedisClient.get.mockResolvedValue(JSON.stringify({ accessToken: "cached-token", expiry: NOW + 1000 }));
    const fetchToken = vi.fn();

    // Act
    const result = await getCachedAccessToken(CACHE_NAME, fetchToken);

    // Assert
    expect(result).toBe("cached-token");
    expect(mockRedisClient.get).toHaveBeenCalledWith(CACHE_KEY);
    expect(fetchToken).not.toHaveBeenCalled();
    expect(mockRedisClient.setEx).not.toHaveBeenCalled();
  });

  it("should re-fetch and re-store the token when the cached entry has expired", async () => {
    // Arrange
    mockRedisClient.get.mockResolvedValue(JSON.stringify({ accessToken: "expired-token", expiry: NOW }));
    const fetchToken = vi.fn().mockResolvedValue({ accessToken: "fresh-token", expiresIn: 3600 });

    // Act
    const result = await getCachedAccessToken(CACHE_NAME, fetchToken);

    // Assert
    expect(result).toBe("fresh-token");
    expect(fetchToken).toHaveBeenCalledTimes(1);
    expect(mockRedisClient.setEx).toHaveBeenCalledWith(CACHE_KEY, 3540, expect.any(String));
  });

  it("should fetch and store the token with a buffered TTL and expiry when nothing is cached", async () => {
    // Arrange
    const fetchToken = vi.fn().mockResolvedValue({ accessToken: "new-token", expiresIn: 3599 });

    // Act
    const result = await getCachedAccessToken(CACHE_NAME, fetchToken);

    // Assert
    expect(result).toBe("new-token");
    expect(fetchToken).toHaveBeenCalledTimes(1);
    expect(mockRedisClient.setEx).toHaveBeenCalledWith(CACHE_KEY, 3539, expect.any(String));
    const stored = JSON.parse(mockRedisClient.setEx.mock.calls[0][2]);
    expect(stored).toEqual({ accessToken: "new-token", expiry: NOW + 3539 * 1000 });
  });

  it("should return the fetched token without storing it when expiresIn is 60 seconds or less", async () => {
    // Arrange
    const fetchToken = vi.fn().mockResolvedValue({ accessToken: "short-lived-token", expiresIn: 60 });

    // Act
    const result = await getCachedAccessToken(CACHE_NAME, fetchToken);

    // Assert
    expect(result).toBe("short-lived-token");
    expect(mockRedisClient.setEx).not.toHaveBeenCalled();
  });

  it("should propagate the error and store nothing when the fetcher rejects", async () => {
    // Arrange
    const fetchToken = vi.fn().mockRejectedValue(new Error("Token endpoint unavailable"));

    // Act
    const result = getCachedAccessToken(CACHE_NAME, fetchToken);

    // Assert
    await expect(result).rejects.toThrow("Token endpoint unavailable");
    expect(mockRedisClient.setEx).not.toHaveBeenCalled();
  });
});
