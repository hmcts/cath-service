import { beforeEach, describe, expect, it, vi } from "vitest";
import { countEmailsSentInWindow, createNotificationAuditLog, updateNotificationStatus } from "./notification-queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    notificationAuditLog: {
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn()
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
      emailType: "SUBSCRIPTION",
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

  it("should persist emailType when creating notification audit log", async () => {
    const mockNotification = {
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      status: "Pending",
      errorMessage: null,
      emailType: "MEDIA_APPROVAL",
      createdAt: new Date(),
      sentAt: null
    };

    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.notificationAuditLog.create).mockResolvedValue(mockNotification as never);

    await createNotificationAuditLog({
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      emailType: "MEDIA_APPROVAL"
    });

    expect(prisma.notificationAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        emailType: "MEDIA_APPROVAL"
      })
    });
  });

  it("should default emailType to SUBSCRIPTION when not provided", async () => {
    const mockNotification = {
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      status: "Pending",
      errorMessage: null,
      emailType: "SUBSCRIPTION",
      createdAt: new Date(),
      sentAt: null
    };

    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.notificationAuditLog.create).mockResolvedValue(mockNotification as never);

    await createNotificationAuditLog({
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1"
    });

    expect(prisma.notificationAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        emailType: "SUBSCRIPTION"
      })
    });
  });

  it("should update notification status", async () => {
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

  it("should count emails sent in window with correct filters", async () => {
    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.notificationAuditLog.count).mockResolvedValue(42 as never);

    const windowStart = new Date("2025-01-01T00:00:00.000Z");
    const result = await countEmailsSentInWindow("user-1", "SUBSCRIPTION", windowStart);

    expect(result).toBe(42);
    expect(prisma.notificationAuditLog.count).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        emailType: "SUBSCRIPTION",
        status: "Sent",
        createdAt: {
          gte: windowStart
        }
      }
    });
  });

  it("should scope countEmailsSentInWindow to the provided userId and emailType", async () => {
    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.notificationAuditLog.count).mockResolvedValue(3 as never);

    const windowStart = new Date();
    await countEmailsSentInWindow("user-99", "MEDIA_APPROVAL", windowStart);

    expect(prisma.notificationAuditLog.count).toHaveBeenCalledWith({
      where: {
        userId: "user-99",
        emailType: "MEDIA_APPROVAL",
        status: "Sent",
        createdAt: { gte: windowStart }
      }
    });
  });
});
