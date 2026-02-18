import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNotificationAuditLog, getNotificationByGovNotifyId, getNotificationsByPublicationId, updateNotificationStatus } from "./notification-queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    notificationAuditLog: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

describe("notification-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create notification audit log", async () => {
    const mockNotification = {
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      status: "Pending",
      errorMessage: null,
      createdAt: new Date(),
      sentAt: null
    };

    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.notificationAuditLog.create).mockResolvedValue(mockNotification as never);

    const result = await createNotificationAuditLog({
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1"
    });

    expect(result.notificationId).toBe("notif-1");
    expect(result.status).toBe("Pending");
  });

  it("should create notification audit log with default status", async () => {
    const mockNotification = {
      notificationId: "notif-2",
      subscriptionId: "sub-2",
      userId: "user-2",
      publicationId: "pub-2",
      status: "Pending",
      errorMessage: null,
      govNotifyId: null,
      createdAt: new Date(),
      sentAt: null
    };

    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.notificationAuditLog.create).mockResolvedValue(mockNotification as never);

    const result = await createNotificationAuditLog({
      subscriptionId: "sub-2",
      userId: "user-2",
      publicationId: "pub-2"
    });

    expect(prisma.notificationAuditLog.create).toHaveBeenCalledWith({
      data: {
        subscriptionId: "sub-2",
        userId: "user-2",
        publicationId: "pub-2",
        status: "Pending",
        errorMessage: undefined
      }
    });
    expect(result.status).toBe("Pending");
  });

  it("should create notification audit log with custom status", async () => {
    const mockNotification = {
      notificationId: "notif-3",
      subscriptionId: "sub-3",
      userId: "user-3",
      publicationId: "pub-3",
      status: "Skipped",
      errorMessage: "Test error",
      govNotifyId: null,
      createdAt: new Date(),
      sentAt: null
    };

    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.notificationAuditLog.create).mockResolvedValue(mockNotification as never);

    const result = await createNotificationAuditLog({
      subscriptionId: "sub-3",
      userId: "user-3",
      publicationId: "pub-3",
      status: "Skipped",
      errorMessage: "Test error"
    });

    expect(prisma.notificationAuditLog.create).toHaveBeenCalledWith({
      data: {
        subscriptionId: "sub-3",
        userId: "user-3",
        publicationId: "pub-3",
        status: "Skipped",
        errorMessage: "Test error"
      }
    });
    expect(result.status).toBe("Skipped");
    expect(result.errorMessage).toBe("Test error");
  });

  it("should update notification status to Sent", async () => {
    const { prisma } = await import("@hmcts/postgres");
    const sentAt = new Date();

    await updateNotificationStatus("notif-1", "Sent", sentAt);

    expect(prisma.notificationAuditLog.update).toHaveBeenCalledWith({
      where: { notificationId: "notif-1" },
      data: {
        status: "Sent",
        sentAt,
        errorMessage: undefined,
        govNotifyId: undefined
      }
    });
  });

  it("should update notification status to Failed with error message", async () => {
    const { prisma } = await import("@hmcts/postgres");

    await updateNotificationStatus("notif-2", "Failed", undefined, "API Error");

    expect(prisma.notificationAuditLog.update).toHaveBeenCalledWith({
      where: { notificationId: "notif-2" },
      data: {
        status: "Failed",
        sentAt: undefined,
        errorMessage: "API Error",
        govNotifyId: undefined
      }
    });
  });

  it("should update notification status with govNotifyId", async () => {
    const { prisma } = await import("@hmcts/postgres");
    const sentAt = new Date();

    await updateNotificationStatus("notif-3", "Sent", sentAt, undefined, "gov-notify-123");

    expect(prisma.notificationAuditLog.update).toHaveBeenCalledWith({
      where: { notificationId: "notif-3" },
      data: {
        status: "Sent",
        sentAt,
        errorMessage: undefined,
        govNotifyId: "gov-notify-123"
      }
    });
  });

  it("should update notification status to Skipped", async () => {
    const { prisma } = await import("@hmcts/postgres");

    await updateNotificationStatus("notif-4", "Skipped", undefined, "No email address");

    expect(prisma.notificationAuditLog.update).toHaveBeenCalledWith({
      where: { notificationId: "notif-4" },
      data: {
        status: "Skipped",
        sentAt: undefined,
        errorMessage: "No email address",
        govNotifyId: undefined
      }
    });
  });

  it("should get notification by govNotifyId", async () => {
    const mockNotification = {
      notificationId: "notif-5",
      subscriptionId: "sub-5",
      userId: "user-5",
      publicationId: "pub-5",
      govNotifyId: "gov-notify-456",
      status: "Sent",
      errorMessage: null,
      createdAt: new Date(),
      sentAt: new Date()
    };

    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.notificationAuditLog.findFirst).mockResolvedValue(mockNotification as never);

    const result = await getNotificationByGovNotifyId("gov-notify-456");

    expect(prisma.notificationAuditLog.findFirst).toHaveBeenCalledWith({
      where: { govNotifyId: "gov-notify-456" }
    });
    expect(result).toEqual(mockNotification);
  });

  it("should return null when notification not found by govNotifyId", async () => {
    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.notificationAuditLog.findFirst).mockResolvedValue(null);

    const result = await getNotificationByGovNotifyId("non-existent");

    expect(result).toBeNull();
  });

  it("should get notifications by publicationId", async () => {
    const mockNotifications = [
      {
        notificationId: "notif-6",
        subscriptionId: "sub-6",
        userId: "user-6",
        publicationId: "pub-6",
        govNotifyId: "gov-notify-789",
        status: "Sent",
        errorMessage: null,
        createdAt: new Date(),
        sentAt: new Date()
      },
      {
        notificationId: "notif-7",
        subscriptionId: "sub-7",
        userId: "user-7",
        publicationId: "pub-6",
        govNotifyId: "gov-notify-890",
        status: "Sent",
        errorMessage: null,
        createdAt: new Date(),
        sentAt: new Date()
      }
    ];

    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.notificationAuditLog.findMany).mockResolvedValue(mockNotifications as never);

    const result = await getNotificationsByPublicationId("pub-6");

    expect(prisma.notificationAuditLog.findMany).toHaveBeenCalledWith({
      where: { publicationId: "pub-6" }
    });
    expect(result).toHaveLength(2);
    expect(result[0].notificationId).toBe("notif-6");
    expect(result[1].notificationId).toBe("notif-7");
  });

  it("should return empty array when no notifications found for publicationId", async () => {
    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.notificationAuditLog.findMany).mockResolvedValue([]);

    const result = await getNotificationsByPublicationId("pub-999");

    expect(result).toEqual([]);
  });
});
