import { prisma } from "@hmcts/postgres-prisma";
import { closeRedisClient } from "@hmcts/redis";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeConnections } from "./close-connections.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: { $disconnect: vi.fn() }
}));

vi.mock("@hmcts/redis", () => ({
  closeRedisClient: vi.fn()
}));

describe("closeConnections", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(closeRedisClient).mockResolvedValue(undefined);
    vi.mocked(prisma.$disconnect).mockResolvedValue(undefined);
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should close Redis and disconnect Prisma", async () => {
    // Act
    await closeConnections();

    // Assert
    expect(closeRedisClient).toHaveBeenCalledTimes(1);
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("should still disconnect Prisma and resolve when closing Redis fails", async () => {
    // Arrange
    vi.mocked(closeRedisClient).mockRejectedValue(new Error("Socket closed unexpectedly"));

    // Act
    const result = closeConnections();

    // Assert
    await expect(result).resolves.toBeUndefined();
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith("[SubscriptionSchedule] Failed to close connection:", {
      error: "Socket closed unexpectedly"
    });
  });

  it("should resolve and log a non-Error rejection as a string when disconnecting Prisma fails", async () => {
    // Arrange
    vi.mocked(prisma.$disconnect).mockRejectedValue("connection reset");

    // Act
    const result = closeConnections();

    // Assert
    await expect(result).resolves.toBeUndefined();
    expect(closeRedisClient).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith("[SubscriptionSchedule] Failed to close connection:", {
      error: "connection reset"
    });
  });
});
