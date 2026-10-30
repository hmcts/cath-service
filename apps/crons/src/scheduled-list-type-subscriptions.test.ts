import { triggerScheduledListTypeSubscriptions } from "@hmcts/publication";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeConnections } from "./close-connections.js";
import scheduledListTypeSubscriptions from "./scheduled-list-type-subscriptions.js";

vi.mock("@hmcts/publication", () => ({
  triggerScheduledListTypeSubscriptions: vi.fn()
}));

vi.mock("./close-connections.js", () => ({
  closeConnections: vi.fn().mockResolvedValue(undefined)
}));

describe("scheduledListTypeSubscriptions", () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("should trigger subscriptions, log the summary and close connections", async () => {
    // Arrange
    const summary = { total: 3, succeeded: 2, failed: 1 };
    vi.mocked(triggerScheduledListTypeSubscriptions).mockResolvedValue(summary);

    // Act
    await scheduledListTypeSubscriptions();

    // Assert
    expect(triggerScheduledListTypeSubscriptions).toHaveBeenCalledTimes(1);
    expect(consoleInfoSpy).toHaveBeenCalledWith("[SubscriptionSchedule] scheduled list type run complete:", summary);
    expect(closeConnections).toHaveBeenCalledTimes(1);
  });

  it("should propagate a trigger failure and still close connections", async () => {
    // Arrange
    vi.mocked(triggerScheduledListTypeSubscriptions).mockRejectedValue(new Error("Database unavailable"));

    // Act
    const result = scheduledListTypeSubscriptions();

    // Assert
    await expect(result).rejects.toThrow("Database unavailable");
    expect(consoleInfoSpy).not.toHaveBeenCalled();
    expect(closeConnections).toHaveBeenCalledTimes(1);
  });
});
