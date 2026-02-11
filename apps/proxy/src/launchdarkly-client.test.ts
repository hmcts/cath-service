import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeLaunchDarklyClient, getLaunchDarklyClient, initLaunchDarklyClient } from "./launchdarkly-client.js";

const mockClient = {
  waitForInitialization: vi.fn(),
  flush: vi.fn(),
  close: vi.fn()
};

vi.mock("@launchdarkly/node-server-sdk", () => ({
  init: vi.fn(() => mockClient)
}));

describe("launchdarkly-client", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockClient.waitForInitialization.mockResolvedValue(undefined);
    mockClient.flush.mockResolvedValue(undefined);
    await closeLaunchDarklyClient();
  });

  it("should return null before initialization", () => {
    // Assert
    expect(getLaunchDarklyClient()).toBeNull();
  });

  it("should initialize and return the client", async () => {
    // Act
    await initLaunchDarklyClient("sdk-key-123");

    // Assert
    expect(getLaunchDarklyClient()).toBe(mockClient);
    expect(mockClient.waitForInitialization).toHaveBeenCalledWith({
      timeout: 10
    });
  });

  it("should flush and close the client", async () => {
    // Arrange
    await initLaunchDarklyClient("sdk-key-123");

    // Act
    await closeLaunchDarklyClient();

    // Assert
    expect(mockClient.flush).toHaveBeenCalled();
    expect(mockClient.close).toHaveBeenCalled();
    expect(getLaunchDarklyClient()).toBeNull();
  });

  it("should handle close when no client exists", async () => {
    // Act & Assert - should not throw
    await closeLaunchDarklyClient();
    expect(mockClient.flush).not.toHaveBeenCalled();
  });
});
