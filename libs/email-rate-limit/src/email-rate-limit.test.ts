import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockTryConsumeToken } = vi.hoisted(() => ({ mockTryConsumeToken: vi.fn() }));

vi.mock("@hmcts/redis", () => ({
  tryConsumeToken: mockTryConsumeToken
}));

import { validateEmailRateLimit } from "./email-rate-limit.js";

describe("validateEmailRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTryConsumeToken.mockResolvedValue(true);
  });

  afterEach(() => {
    delete process.env.STANDARD_MAX_EMAILS;
    delete process.env.HIGH_CAPACITY_MAX_EMAILS;
    delete process.env.EMAIL_RATE_LIMIT_INTERVAL;
  });

  it("should resolve when the email is within the limit", async () => {
    await expect(validateEmailRateLimit("user@example.com", "STANDARD", "Test email")).resolves.toBeUndefined();
  });

  it("should throw with a masked email when the limit is exceeded", async () => {
    mockTryConsumeToken.mockResolvedValue(false);

    await expect(validateEmailRateLimit("john.smith@example.com", "STANDARD", "Media account rejection email")).rejects.toThrow(
      "Rate limit has been exceeded. Media account rejection email failed to be sent to j*********@example.com"
    );
  });

  it("should use 10 emails per 30 minutes for the standard limit by default", async () => {
    await validateEmailRateLimit("user@example.com", "STANDARD", "Test email");

    expect(mockTryConsumeToken).toHaveBeenCalledWith("email-rate-limit:1::user@example.com", { capacity: 10, refillPeriodMs: 1_800_000 });
  });

  it("should use 200 emails per 30 minutes for the high limit by default", async () => {
    await validateEmailRateLimit("user@example.com", "HIGH", "Test email");

    expect(mockTryConsumeToken).toHaveBeenCalledWith("email-rate-limit:2::user@example.com", { capacity: 200, refillPeriodMs: 1_800_000 });
  });

  it("should allow the capacities and interval to be overridden by environment variables", async () => {
    process.env.STANDARD_MAX_EMAILS = "3";
    process.env.HIGH_CAPACITY_MAX_EMAILS = "50";
    process.env.EMAIL_RATE_LIMIT_INTERVAL = "5";

    await validateEmailRateLimit("user@example.com", "STANDARD", "Test email");
    await validateEmailRateLimit("user@example.com", "HIGH", "Test email");

    expect(mockTryConsumeToken).toHaveBeenNthCalledWith(1, expect.any(String), { capacity: 3, refillPeriodMs: 300_000 });
    expect(mockTryConsumeToken).toHaveBeenNthCalledWith(2, expect.any(String), { capacity: 50, refillPeriodMs: 300_000 });
  });

  it("should fall back to defaults when environment variables are invalid", async () => {
    process.env.STANDARD_MAX_EMAILS = "not-a-number";
    process.env.EMAIL_RATE_LIMIT_INTERVAL = "0";

    await validateEmailRateLimit("user@example.com", "STANDARD", "Test email");

    expect(mockTryConsumeToken).toHaveBeenCalledWith(expect.any(String), { capacity: 10, refillPeriodMs: 1_800_000 });
  });

  it("should track the same bucket regardless of email casing", async () => {
    await validateEmailRateLimit("User@Example.com", "STANDARD", "Test email");

    expect(mockTryConsumeToken).toHaveBeenCalledWith("email-rate-limit:1::user@example.com", expect.any(Object));
  });

  it("should keep separate buckets for the standard and high limits", async () => {
    await validateEmailRateLimit("user@example.com", "STANDARD", "Test email");
    await validateEmailRateLimit("user@example.com", "HIGH", "Test email");

    const keys = mockTryConsumeToken.mock.calls.map(([key]) => key);
    expect(new Set(keys).size).toBe(2);
  });

  it("should propagate Redis errors", async () => {
    mockTryConsumeToken.mockRejectedValue(new Error("Redis unavailable"));

    await expect(validateEmailRateLimit("user@example.com", "STANDARD", "Test email")).rejects.toThrow("Redis unavailable");
  });
});
