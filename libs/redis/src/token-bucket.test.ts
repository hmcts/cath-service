import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEval = vi.fn();

vi.mock("./redis-client.js", () => ({
  getRedisClient: vi.fn(async () => ({ eval: mockEval }))
}));

import { tryConsumeToken } from "./token-bucket.js";

describe("tryConsumeToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when Redis allows the token to be consumed", async () => {
    mockEval.mockResolvedValue(1);

    const result = await tryConsumeToken("bucket-key", { capacity: 10, refillPeriodMs: 1_800_000 });

    expect(result).toBe(true);
  });

  it("should return false when the bucket is empty", async () => {
    mockEval.mockResolvedValue(0);

    const result = await tryConsumeToken("bucket-key", { capacity: 10, refillPeriodMs: 1_800_000 });

    expect(result).toBe(false);
  });

  it("should pass the key, capacity and refill period to the script", async () => {
    mockEval.mockResolvedValue(1);

    await tryConsumeToken("bucket-key", { capacity: 200, refillPeriodMs: 60_000 });

    expect(mockEval).toHaveBeenCalledWith(expect.any(String), {
      keys: ["bucket-key"],
      arguments: ["200", "60000"]
    });
  });

  it("should propagate Redis errors", async () => {
    mockEval.mockRejectedValue(new Error("Redis unavailable"));

    await expect(tryConsumeToken("bucket-key", { capacity: 10, refillPeriodMs: 1_800_000 })).rejects.toThrow("Redis unavailable");
  });
});
