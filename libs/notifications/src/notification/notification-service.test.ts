import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendPublicationNotifications } from "./notification-service.js";

vi.mock("../govnotify/govnotify-client.js", () => ({
  sendEmail: vi.fn().mockResolvedValue({
    success: true,
    notificationId: "notif-123"
  })
}));

vi.mock("@hmcts/subscriptions", () => ({
  findActiveSubscriptionsByLocation: vi.fn(),
  findActiveSubscriptionsByCaseNumbers: vi.fn().mockResolvedValue([]),
  findActiveSubscriptionsByCaseNames: vi.fn().mockResolvedValue([])
}));

vi.mock("./notification-queries.js", () => ({
  createNotificationAuditLog: vi.fn(),
  updateNotificationStatus: vi.fn()
}));

vi.mock("@hmcts/publication", () => ({
  findAllArtefactSearchByArtefactId: vi.fn().mockResolvedValue([])
}));

describe("notification-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send notifications to all subscribed users", async () => {
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: "user-1",
        searchType: "LOCATION_ID",
        searchValue: "1",
        user: {
          email: "user1@example.com",
          firstName: "John",
          surname: "Doe"
        }
      },
      {
        subscriptionId: "sub-2",
        userId: "user-2",
        searchType: "LOCATION_ID",
        searchValue: "1",
        user: {
          email: "user2@example.com",
          firstName: "Jane",
          surname: "Smith"
        }
      }
    ];

    const { findActiveSubscriptionsByLocation } = await import("@hmcts/subscriptions");
    const { createNotificationAuditLog } = await import("./notification-queries.js");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue(mockSubscriptions);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      status: "Pending",
      errorMessage: null,
      createdAt: new Date(),
      sentAt: null
    });

    const result = await sendPublicationNotifications({
      publicationId: "pub-1",
      locationId: "1",
      locationName: "Test Court",
      hearingListName: "Daily Cause List",
      publicationDate: new Date("2024-12-01")
    });

    expect(result.totalSubscriptions).toBe(2);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it("should skip users with invalid email", async () => {
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: "user-1",
        searchType: "LOCATION_ID",
        searchValue: "1",
        user: {
          email: "invalid-email",
          firstName: "John",
          surname: "Doe"
        }
      }
    ];

    const { findActiveSubscriptionsByLocation } = await import("@hmcts/subscriptions");
    const { createNotificationAuditLog } = await import("./notification-queries.js");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue(mockSubscriptions);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      status: "Skipped",
      errorMessage: null,
      createdAt: new Date(),
      sentAt: null
    });

    const result = await sendPublicationNotifications({
      publicationId: "pub-1",
      locationId: "1",
      locationName: "Test Court",
      hearingListName: "Daily Cause List",
      publicationDate: new Date("2024-12-01")
    });

    expect(result.totalSubscriptions).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(0);
  });

  it("should return empty result when no subscriptions exist", async () => {
    const { findActiveSubscriptionsByLocation } = await import("@hmcts/subscriptions");
    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue([]);

    const result = await sendPublicationNotifications({
      publicationId: "pub-1",
      locationId: "1",
      locationName: "Test Court",
      hearingListName: "Daily Cause List",
      publicationDate: new Date("2024-12-01")
    });

    expect(result.totalSubscriptions).toBe(0);
    expect(result.sent).toBe(0);
  });

  it("should throw error for invalid publication event", async () => {
    await expect(
      sendPublicationNotifications({
        publicationId: "",
        locationId: "",
        locationName: "",
        hearingListName: "",
        publicationDate: null as unknown as Date
      })
    ).rejects.toThrow("Invalid publication event");
  });

  it("should throw error for invalid location ID", async () => {
    await expect(
      sendPublicationNotifications({
        publicationId: "pub-1",
        locationId: "invalid-id",
        locationName: "Test Court",
        hearingListName: "Daily Cause List",
        publicationDate: new Date("2024-12-01")
      })
    ).rejects.toThrow("Invalid location ID");
  });

  it("should skip users with no email address", async () => {
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: "user-1",
        searchType: "LOCATION_ID",
        searchValue: "1",
        user: {
          email: null,
          firstName: "John",
          surname: "Doe"
        }
      }
    ];

    const { findActiveSubscriptionsByLocation } = await import("@hmcts/subscriptions");
    const { createNotificationAuditLog, updateNotificationStatus } = await import("./notification-queries.js");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue(mockSubscriptions);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      status: "Skipped",
      errorMessage: null,
      createdAt: new Date(),
      sentAt: null
    });

    const result = await sendPublicationNotifications({
      publicationId: "pub-1",
      locationId: "1",
      locationName: "Test Court",
      hearingListName: "Daily Cause List",
      publicationDate: new Date("2024-12-01")
    });

    expect(result.totalSubscriptions).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(0);
    expect(updateNotificationStatus).toHaveBeenCalledWith("notif-1", "Skipped", undefined, "No email address");
  });

  it("should handle email sending failure", async () => {
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: "user-1",
        searchType: "LOCATION_ID",
        searchValue: "1",
        user: {
          email: "user1@example.com",
          firstName: "John",
          surname: "Doe"
        }
      }
    ];

    const { findActiveSubscriptionsByLocation } = await import("@hmcts/subscriptions");
    const { createNotificationAuditLog, updateNotificationStatus } = await import("./notification-queries.js");
    const { sendEmail } = await import("../govnotify/govnotify-client.js");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue(mockSubscriptions);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      status: "Pending",
      errorMessage: null,
      createdAt: new Date(),
      sentAt: null
    });
    vi.mocked(sendEmail).mockResolvedValue({
      success: false,
      error: "API Error"
    });

    const result = await sendPublicationNotifications({
      publicationId: "pub-1",
      locationId: "1",
      locationName: "Test Court",
      hearingListName: "Daily Cause List",
      publicationDate: new Date("2024-12-01")
    });

    expect(result.totalSubscriptions).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.errors).toContain("User user-1: API Error");
    expect(updateNotificationStatus).toHaveBeenCalledWith("notif-1", "Failed", undefined, "API Error");
  });

  it("should handle exceptions during notification processing", async () => {
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: "user-1",
        searchType: "LOCATION_ID",
        searchValue: "1",
        user: {
          email: "user1@example.com",
          firstName: "John",
          surname: "Doe"
        }
      }
    ];

    const { findActiveSubscriptionsByLocation } = await import("@hmcts/subscriptions");
    const { createNotificationAuditLog } = await import("./notification-queries.js");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue(mockSubscriptions);
    vi.mocked(createNotificationAuditLog).mockRejectedValue(new Error("Database connection error"));

    const result = await sendPublicationNotifications({
      publicationId: "pub-1",
      locationId: "1",
      locationName: "Test Court",
      hearingListName: "Daily Cause List",
      publicationDate: new Date("2024-12-01")
    });

    expect(result.totalSubscriptions).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.errors).toContain("User user-1: Database connection error");
  });
});
