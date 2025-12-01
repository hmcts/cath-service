import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    notificationLog: {
      create: mockCreate,
      update: mockUpdate
    }
  }
}));

describe("notification queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createNotificationLog", () => {
    it("should create a notification log with correct data", async () => {
      const { createNotificationLog } = await import("./queries.js");

      mockCreate.mockResolvedValue({
        notificationId: "test-notification-id"
      });

      const result = await createNotificationLog({
        subscriptionId: "sub-123",
        userId: "user-123",
        publicationId: "pub-123",
        locationId: "1",
        status: "PENDING"
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          notificationId: expect.any(String),
          subscriptionId: "sub-123",
          userId: "user-123",
          publicationId: "pub-123",
          locationId: "1",
          status: "PENDING",
          createdAt: expect.any(Date)
        }
      });

      expect(result).toEqual(expect.any(String));
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe("updateNotificationLogSent", () => {
    it("should update notification log status to SENT", async () => {
      const { updateNotificationLogSent } = await import("./queries.js");

      mockUpdate.mockResolvedValue({
        notificationId: "test-notification-id",
        status: "SENT"
      });

      await updateNotificationLogSent("test-notification-id");

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { notificationId: "test-notification-id" },
        data: {
          status: "SENT",
          sentAt: expect.any(Date)
        }
      });
    });
  });

  describe("updateNotificationLogFailed", () => {
    it("should update notification log status to FAILED with error message", async () => {
      const { updateNotificationLogFailed } = await import("./queries.js");

      mockUpdate.mockResolvedValue({
        notificationId: "test-notification-id",
        status: "FAILED"
      });

      await updateNotificationLogFailed("test-notification-id", "API Error");

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { notificationId: "test-notification-id" },
        data: {
          status: "FAILED",
          errorMessage: "API Error",
          failedAt: expect.any(Date)
        }
      });
    });
  });
});
