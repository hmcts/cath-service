import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkEmailRateLimit } from "./email-rate-limiter.js";
import { TooManyEmailsException } from "./too-many-emails-exception.js";

vi.mock("../notification/notification-queries.js", () => ({
  countEmailsSentInWindow: vi.fn()
}));

describe("checkEmailRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RATE_LIMIT_SUBSCRIPTION_MAX;
    delete process.env.RATE_LIMIT_SUBSCRIPTION_WINDOW_MS;
    delete process.env.RATE_LIMIT_MEDIA_APPROVAL_MAX;
    delete process.env.RATE_LIMIT_MEDIA_APPROVAL_WINDOW_MS;
    delete process.env.RATE_LIMIT_MEDIA_REJECTION_MAX;
    delete process.env.RATE_LIMIT_MEDIA_REJECTION_WINDOW_MS;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should not throw when count is below limit", async () => {
    const { countEmailsSentInWindow } = await import("../notification/notification-queries.js");
    vi.mocked(countEmailsSentInWindow).mockResolvedValue(50);

    await expect(checkEmailRateLimit("user-1", "user@example.com", "SUBSCRIPTION")).resolves.toBeUndefined();
  });

  it("should throw TooManyEmailsException at limit for a critical type", async () => {
    const { countEmailsSentInWindow } = await import("../notification/notification-queries.js");
    vi.mocked(countEmailsSentInWindow).mockResolvedValue(5);

    await expect(checkEmailRateLimit("user-1", "user@example.com", "MEDIA_APPROVAL")).rejects.toThrow(TooManyEmailsException);
  });

  it("should throw plain Error at limit for a non-critical type", async () => {
    const { countEmailsSentInWindow } = await import("../notification/notification-queries.js");
    vi.mocked(countEmailsSentInWindow).mockResolvedValue(100);

    await expect(checkEmailRateLimit("user-1", "user@example.com", "SUBSCRIPTION")).rejects.toThrow(Error);
    await expect(checkEmailRateLimit("user-1", "user@example.com", "SUBSCRIPTION")).rejects.not.toThrow(TooManyEmailsException);
  });

  it("should derive window start correctly from windowMs", async () => {
    const { countEmailsSentInWindow } = await import("../notification/notification-queries.js");
    vi.mocked(countEmailsSentInWindow).mockResolvedValue(0);

    const before = Date.now();
    await checkEmailRateLimit("user-1", "user@example.com", "SUBSCRIPTION");
    const after = Date.now();

    const [, , windowStart] = vi.mocked(countEmailsSentInWindow).mock.calls[0];
    const windowStartMs = (windowStart as Date).getTime();

    expect(windowStartMs).toBeGreaterThanOrEqual(before - 3600000);
    expect(windowStartMs).toBeLessThanOrEqual(after - 3600000 + 100);
  });

  it("should scope counts per userId and emailType - different user is not blocked", async () => {
    const { countEmailsSentInWindow } = await import("../notification/notification-queries.js");
    vi.mocked(countEmailsSentInWindow).mockResolvedValue(0);

    await expect(checkEmailRateLimit("user-2", "other@example.com", "SUBSCRIPTION")).resolves.toBeUndefined();
    expect(vi.mocked(countEmailsSentInWindow).mock.calls[0][0]).toBe("user-2");
  });

  it("should scope counts per userId and emailType - different type is not blocked", async () => {
    const { countEmailsSentInWindow } = await import("../notification/notification-queries.js");
    vi.mocked(countEmailsSentInWindow).mockResolvedValue(0);

    await expect(checkEmailRateLimit("user-1", "user@example.com", "MEDIA_APPROVAL")).resolves.toBeUndefined();
    expect(vi.mocked(countEmailsSentInWindow).mock.calls[0][1]).toBe("MEDIA_APPROVAL");
  });

  it("should read limit and window from env vars", async () => {
    process.env.RATE_LIMIT_SUBSCRIPTION_MAX = "10";
    process.env.RATE_LIMIT_SUBSCRIPTION_WINDOW_MS = "60000";

    const { countEmailsSentInWindow } = await import("../notification/notification-queries.js");
    vi.mocked(countEmailsSentInWindow).mockResolvedValue(10);

    await expect(checkEmailRateLimit("user-1", "user@example.com", "SUBSCRIPTION")).rejects.toThrow("Limit: 10 per 60000ms");
  });

  it("should fall back to defaults when env vars are absent", async () => {
    const { countEmailsSentInWindow } = await import("../notification/notification-queries.js");
    vi.mocked(countEmailsSentInWindow).mockResolvedValue(100);

    await expect(checkEmailRateLimit("user-1", "user@example.com", "SUBSCRIPTION")).rejects.toThrow("Limit: 100 per 3600000ms");
  });

  it("should fall back to defaults when env vars are invalid (NaN)", async () => {
    process.env.RATE_LIMIT_SUBSCRIPTION_MAX = "not-a-number";
    process.env.RATE_LIMIT_SUBSCRIPTION_WINDOW_MS = "also-invalid";

    const { countEmailsSentInWindow } = await import("../notification/notification-queries.js");
    vi.mocked(countEmailsSentInWindow).mockResolvedValue(100);

    await expect(checkEmailRateLimit("user-1", "user@example.com", "SUBSCRIPTION")).rejects.toThrow("Limit: 100 per 3600000ms");
  });

  it("should mask a standard email address in the error message", async () => {
    const { countEmailsSentInWindow } = await import("../notification/notification-queries.js");
    vi.mocked(countEmailsSentInWindow).mockResolvedValue(100);

    await expect(checkEmailRateLimit("user-1", "test@example.com", "SUBSCRIPTION")).rejects.toThrow("t***@example.com");
  });

  it("should use ***@*** in the error message when the email local part is empty", async () => {
    const { countEmailsSentInWindow } = await import("../notification/notification-queries.js");
    vi.mocked(countEmailsSentInWindow).mockResolvedValue(100);

    await expect(checkEmailRateLimit("user-1", "@domain.com", "SUBSCRIPTION")).rejects.toThrow("***@***");
  });

  it("should use ***@*** in the error message when the email has no @ symbol", async () => {
    const { countEmailsSentInWindow } = await import("../notification/notification-queries.js");
    vi.mocked(countEmailsSentInWindow).mockResolvedValue(100);

    await expect(checkEmailRateLimit("user-1", "nodomain", "SUBSCRIPTION")).rejects.toThrow("***@***");
  });

  it("should return without checking the database for an unknown email type", async () => {
    const { countEmailsSentInWindow } = await import("../notification/notification-queries.js");

    await expect(checkEmailRateLimit("user-1", "user@example.com", "UNKNOWN_TYPE")).resolves.toBeUndefined();
    expect(countEmailsSentInWindow).not.toHaveBeenCalled();
  });
});
