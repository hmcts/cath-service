import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withRetry } from "./retry.js";

const LOG_CONTEXT = "[Test]";

async function runWithTimers(promise: Promise<boolean>): Promise<boolean> {
  await vi.runAllTimersAsync();
  return promise;
}

function setTimeoutDelays(): number[] {
  return vi
    .mocked(setTimeout)
    .mock.calls.map((call) => call[1] as number)
    .filter((ms) => ms !== undefined);
}

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "setTimeout");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should call the operation once and return true when the first attempt succeeds", async () => {
    // Arrange
    const operation = vi.fn().mockResolvedValue(undefined);

    // Act
    const result = await runWithTimers(withRetry(operation, LOG_CONTEXT));

    // Assert
    expect(result).toBe(true);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("should return true when the second attempt succeeds", async () => {
    // Arrange
    vi.spyOn(Math, "random").mockReturnValue(0);
    const operation = vi.fn().mockRejectedValueOnce(new Error("Third-party API returned status 503")).mockResolvedValue(undefined);

    // Act
    const result = await runWithTimers(withRetry(operation, LOG_CONTEXT));

    // Assert
    expect(result).toBe(true);
    expect(operation).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledWith("[Test] Attempt 1 failed (Third-party API returned status 503), retrying in 2000ms");
  });

  it.each([
    ["4xx", new Error("Third-party API returned status 400")],
    ["5xx", new Error("Third-party API returned status 500")],
    ["network", new Error("fetch failed")]
  ])("should retry %s errors", async (_label, error) => {
    // Arrange
    const operation = vi.fn().mockRejectedValueOnce(error).mockResolvedValue(undefined);

    // Act
    const result = await runWithTimers(withRetry(operation, LOG_CONTEXT));

    // Assert
    expect(result).toBe(true);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("should return false without throwing after four failed attempts", async () => {
    // Arrange
    const operation = vi.fn().mockRejectedValue(new Error("Third-party API returned status 500"));

    // Act
    const result = await runWithTimers(withRetry(operation, LOG_CONTEXT));

    // Assert
    expect(result).toBe(false);
    expect(operation).toHaveBeenCalledTimes(4);
    expect(console.warn).toHaveBeenCalledTimes(3);
  });

  it("should use the base delays of 2s, 4s and 8s when the jitter is at its midpoint", async () => {
    // Arrange
    const operation = vi.fn().mockRejectedValue("non-error rejection");
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValueOnce(0.5);

    // Act
    await runWithTimers(withRetry(operation, LOG_CONTEXT));

    // Assert
    expect(setTimeoutDelays()).toEqual([2000, 4000, 8000]);
    expect(console.warn).toHaveBeenCalledWith("[Test] Attempt 1 failed (non-error rejection), retrying in 2000ms");
  });

  it("should keep the delays within the jitter bounds", async () => {
    // Arrange
    const lowOperation = vi.fn().mockRejectedValue(new Error("fail"));
    const highOperation = vi.fn().mockRejectedValue(new Error("fail"));
    const random = vi.spyOn(Math, "random");

    // Act
    random.mockReturnValue(0);
    await runWithTimers(withRetry(lowOperation, LOG_CONTEXT));
    const lowDelays = setTimeoutDelays();
    vi.mocked(setTimeout).mockClear();
    random.mockReturnValue(1);
    await runWithTimers(withRetry(highOperation, LOG_CONTEXT));
    const highDelays = setTimeoutDelays();

    // Assert
    expect(lowDelays).toEqual([2000, 2000, 4000]);
    expect(highDelays).toEqual([3000, 6000, 12000]);
  });
});
