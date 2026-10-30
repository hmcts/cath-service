import { triggerDisplayFromSubscriptions } from "@hmcts/publication";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeConnections } from "./close-connections.js";
import displayFromSubscriptions from "./display-from-subscriptions.js";

vi.mock("@hmcts/publication", () => ({
  triggerDisplayFromSubscriptions: vi.fn()
}));

vi.mock("./close-connections.js", () => ({
  closeConnections: vi.fn().mockResolvedValue(undefined)
}));

describe("displayFromSubscriptions", () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("should trigger subscriptions, log the summary and close connections", async () => {
    // Arrange
    const summary = { total: 3, succeeded: 2, failed: 1 };
    vi.mocked(triggerDisplayFromSubscriptions).mockResolvedValue(summary);

    // Act
    await displayFromSubscriptions();

    // Assert
    expect(triggerDisplayFromSubscriptions).toHaveBeenCalledTimes(1);
    expect(consoleInfoSpy).toHaveBeenCalledWith("[SubscriptionSchedule] display-from run complete:", summary);
    expect(closeConnections).toHaveBeenCalledTimes(1);
  });

  it("should propagate a trigger failure and still close connections", async () => {
    // Arrange
    vi.mocked(triggerDisplayFromSubscriptions).mockRejectedValue(new Error("Database unavailable"));

    // Act
    const result = displayFromSubscriptions();

    // Assert
    await expect(result).rejects.toThrow("Database unavailable");
    expect(consoleInfoSpy).not.toHaveBeenCalled();
    expect(closeConnections).toHaveBeenCalledTimes(1);
  });
});
