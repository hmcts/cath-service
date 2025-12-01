import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@hmcts/account/repository/query", () => ({
  findUserById: vi.fn()
}));

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

vi.mock("@hmcts/subscriptions", () => ({
  findSubscriptionsByLocationId: vi.fn()
}));

vi.mock("@hmcts/list-types-common", () => ({
  mockListTypes: [
    {
      id: 8,
      name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
      englishFriendlyName: "Civil and Family Daily Cause List",
      welshFriendlyName: "Rhestr Achos Dyddiol Sifil a Theulu"
    }
  ]
}));

vi.mock("./repository/queries.js", () => ({
  createNotificationLog: vi.fn(),
  updateNotificationLogSent: vi.fn(),
  updateNotificationLogFailed: vi.fn()
}));

// Mock NotifyClient - needs to handle dynamic import
const mockSendEmail = vi.fn();
vi.mock("notifications-node-client", () => ({
  default: {
    NotifyClient: vi.fn().mockImplementation(() => ({
      sendEmail: mockSendEmail
    }))
  },
  NotifyClient: vi.fn().mockImplementation(() => ({
    sendEmail: mockSendEmail
  }))
}));

describe("notification-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendPublicationNotifications", () => {
    it("should send notifications successfully to subscribers", async () => {
      const { sendPublicationNotifications } = await import("./notification-service.js");
      const { findUserById } = await import("@hmcts/account/repository/query");
      const { getLocationById } = await import("@hmcts/location");
      const { findSubscriptionsByLocationId } = await import("@hmcts/subscriptions");
      const { createNotificationLog, updateNotificationLogSent } = await import("./repository/queries.js");

      // Setup mocks
      (findSubscriptionsByLocationId as Mock).mockResolvedValue([
        {
          subscriptionId: "sub-123",
          userId: "user-123",
          locationId: 1
        }
      ]);

      (getLocationById as Mock).mockResolvedValue({
        locationId: 1,
        name: "Oxford Combined Court Centre",
        welshName: "Canolfan Llysoedd Cyfun Rhydychen"
      });

      (findUserById as Mock).mockResolvedValue({
        userId: "user-123",
        email: "test@example.com",
        firstName: "Test",
        surname: "User"
      });

      (createNotificationLog as Mock).mockResolvedValue("notif-123");

      mockSendEmail.mockResolvedValue({
        data: {
          id: "notify-123",
          reference: "pub-123-sub-123",
          uri: "https://api.notifications.service.gov.uk/v2/notifications/notify-123",
          template: {
            id: "template-123",
            version: 1
          }
        }
      });

      // Execute
      const result = await sendPublicationNotifications({
        publicationId: "pub-123",
        locationId: "1",
        hearingListName: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
        publicationDate: "2025-11-25T00:00:00.000Z"
      });

      // Verify
      expect(result).toEqual({
        success: true,
        totalSubscribers: 1,
        sentCount: 1,
        failedCount: 0,
        skippedCount: 0,
        errors: []
      });

      expect(findSubscriptionsByLocationId).toHaveBeenCalledWith(1);
      expect(getLocationById).toHaveBeenCalledWith(1);
      expect(findUserById).toHaveBeenCalledWith("user-123");
      expect(createNotificationLog).toHaveBeenCalled();
      expect(updateNotificationLogSent).toHaveBeenCalled();

      // Verify email was sent with correct personalisation
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.any(String),
        "test@example.com",
        expect.objectContaining({
          personalisation: expect.objectContaining({
            ListType: "Civil and Family Daily Cause List",
            content_date: "25/11/2025",
            locations: "Oxford Combined Court Centre",
            start_page_link: expect.any(String),
            subscription_page_link: expect.any(String)
          })
        })
      );
    });

    it("should handle no subscribers gracefully", async () => {
      const { sendPublicationNotifications } = await import("./notification-service.js");
      const { findSubscriptionsByLocationId } = await import("@hmcts/subscriptions");
      const { getLocationById } = await import("@hmcts/location");

      (findSubscriptionsByLocationId as Mock).mockResolvedValue([]);
      (getLocationById as Mock).mockResolvedValue({
        locationId: 1,
        name: "Oxford Combined Court Centre"
      });

      const result = await sendPublicationNotifications({
        publicationId: "pub-123",
        locationId: "1",
        hearingListName: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
        publicationDate: "2025-11-25T00:00:00.000Z"
      });

      expect(result).toEqual({
        success: true,
        totalSubscribers: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        errors: []
      });

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should skip notification when user email is not found", async () => {
      const { sendPublicationNotifications } = await import("./notification-service.js");
      const { findUserById } = await import("@hmcts/account/repository/query");
      const { getLocationById } = await import("@hmcts/location");
      const { findSubscriptionsByLocationId } = await import("@hmcts/subscriptions");
      const { createNotificationLog, updateNotificationLogFailed } = await import("./repository/queries.js");

      (findSubscriptionsByLocationId as Mock).mockResolvedValue([
        {
          subscriptionId: "sub-123",
          userId: "user-123",
          locationId: 1
        }
      ]);

      (getLocationById as Mock).mockResolvedValue({
        locationId: 1,
        name: "Oxford Combined Court Centre"
      });

      (findUserById as Mock).mockResolvedValue(null);
      (createNotificationLog as Mock).mockResolvedValue("notif-123");

      const result = await sendPublicationNotifications({
        publicationId: "pub-123",
        locationId: "1",
        hearingListName: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
        publicationDate: "2025-11-25T00:00:00.000Z"
      });

      expect(result.skippedCount).toBe(1);
      expect(result.sentCount).toBe(0);
      expect(mockSendEmail).not.toHaveBeenCalled();
      expect(updateNotificationLogFailed).toHaveBeenCalled();
    });

    it("should handle GOV.UK Notify API errors", async () => {
      const { sendPublicationNotifications } = await import("./notification-service.js");
      const { findUserById } = await import("@hmcts/account/repository/query");
      const { getLocationById } = await import("@hmcts/location");
      const { findSubscriptionsByLocationId } = await import("@hmcts/subscriptions");
      const { createNotificationLog, updateNotificationLogFailed } = await import("./repository/queries.js");

      (findSubscriptionsByLocationId as Mock).mockResolvedValue([
        {
          subscriptionId: "sub-123",
          userId: "user-123",
          locationId: 1
        }
      ]);

      (getLocationById as Mock).mockResolvedValue({
        locationId: 1,
        name: "Oxford Combined Court Centre"
      });

      (findUserById as Mock).mockResolvedValue({
        userId: "user-123",
        email: "test@example.com",
        firstName: "Test",
        surname: "User"
      });

      (createNotificationLog as Mock).mockResolvedValue("notif-123");

      mockSendEmail.mockRejectedValue(new Error("API Error"));

      const result = await sendPublicationNotifications({
        publicationId: "pub-123",
        locationId: "1",
        hearingListName: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
        publicationDate: "2025-11-25T00:00:00.000Z"
      });

      expect(result.failedCount).toBe(1);
      expect(result.sentCount).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        userId: "user-123",
        error: "API Error"
      });
      expect(updateNotificationLogFailed).toHaveBeenCalledWith("notif-123", "API Error");
    });

    it("should format date correctly to dd/mm/yyyy", async () => {
      const { sendPublicationNotifications } = await import("./notification-service.js");
      const { findUserById } = await import("@hmcts/account/repository/query");
      const { getLocationById } = await import("@hmcts/location");
      const { findSubscriptionsByLocationId } = await import("@hmcts/subscriptions");
      const { createNotificationLog } = await import("./repository/queries.js");

      (findSubscriptionsByLocationId as Mock).mockResolvedValue([
        {
          subscriptionId: "sub-123",
          userId: "user-123",
          locationId: 1
        }
      ]);

      (getLocationById as Mock).mockResolvedValue({
        locationId: 1,
        name: "Oxford Combined Court Centre"
      });

      (findUserById as Mock).mockResolvedValue({
        userId: "user-123",
        email: "test@example.com",
        firstName: "Test",
        surname: "User"
      });

      (createNotificationLog as Mock).mockResolvedValue("notif-123");

      mockSendEmail.mockResolvedValue({
        data: {
          id: "notify-123",
          reference: "pub-123-sub-123",
          uri: "https://api.notifications.service.gov.uk/v2/notifications/notify-123",
          template: { id: "template-123", version: 1 }
        }
      });

      await sendPublicationNotifications({
        publicationId: "pub-123",
        locationId: "1",
        hearingListName: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
        publicationDate: "2025-01-05T00:00:00.000Z"
      });

      const emailCall = mockSendEmail.mock.calls[0];
      expect(emailCall[2].personalisation.content_date).toBe("05/01/2025");
    });

    it("should convert list type to friendly name", async () => {
      const { sendPublicationNotifications } = await import("./notification-service.js");
      const { findUserById } = await import("@hmcts/account/repository/query");
      const { getLocationById } = await import("@hmcts/location");
      const { findSubscriptionsByLocationId } = await import("@hmcts/subscriptions");
      const { createNotificationLog } = await import("./repository/queries.js");

      (findSubscriptionsByLocationId as Mock).mockResolvedValue([
        {
          subscriptionId: "sub-123",
          userId: "user-123",
          locationId: 1
        }
      ]);

      (getLocationById as Mock).mockResolvedValue({
        locationId: 1,
        name: "Oxford Combined Court Centre"
      });

      (findUserById as Mock).mockResolvedValue({
        userId: "user-123",
        email: "test@example.com"
      });

      (createNotificationLog as Mock).mockResolvedValue("notif-123");

      mockSendEmail.mockResolvedValue({
        data: {
          id: "notify-123",
          reference: "pub-123-sub-123",
          uri: "https://api.notifications.service.gov.uk/v2/notifications/notify-123",
          template: { id: "template-123", version: 1 }
        }
      });

      await sendPublicationNotifications({
        publicationId: "pub-123",
        locationId: "1",
        hearingListName: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
        publicationDate: "2025-11-25T00:00:00.000Z"
      });

      const emailCall = mockSendEmail.mock.calls[0];
      expect(emailCall[2].personalisation.ListType).toBe("Civil and Family Daily Cause List");
    });
  });
});
