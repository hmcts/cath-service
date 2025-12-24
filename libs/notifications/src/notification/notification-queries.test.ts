import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNotificationAuditLog, updateNotificationStatus } from "./notification-queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    notificationAuditLog: {
      create: vi.fn(),
      update: vi.fn()
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

  it("should update notification status", async () => {
    const { prisma } = await import("@hmcts/postgres");
    const sentAt = new Date();

    await updateNotificationStatus("notif-1", "Sent", sentAt);

    expect(prisma.notificationAuditLog.update).toHaveBeenCalledWith({
      where: { notificationId: "notif-1" },
      data: {
        status: "Sent",
        sentAt,
        errorMessage: undefined
      }
    });
  });
});
