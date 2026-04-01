import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendPublicationNotifications } from "./notification-service.js";

vi.mock("node:fs/promises", () => ({
  default: {
    stat: vi.fn(),
    readFile: vi.fn()
  }
}));

vi.mock("@hmcts/civil-and-family-daily-cause-list", () => ({
  extractCaseSummary: vi.fn().mockReturnValue([{ caseReference: "123", parties: "Smith v Jones" }]),
  formatCaseSummaryForEmail: vi.fn().mockReturnValue("Case 123 - Smith v Jones")
}));

vi.mock("../govnotify/govnotify-client.js", () => ({
  sendEmail: vi.fn().mockResolvedValue({
    success: true,
    notificationId: "notif-123"
  })
}));

vi.mock("../govnotify/template-config.js", () => ({
  buildTemplateParameters: vi.fn().mockReturnValue({
    locations: "Test Court",
    ListType: "Daily Cause List",
    content_date: "1 January 2025",
    start_page_link: "https://example.com",
    subscription_page_link: "https://example.com"
  }),
  buildEnhancedTemplateParameters: vi.fn().mockReturnValue({
    locations: "Test Court",
    ListType: "Civil And Family Daily Cause List",
    content_date: "1 January 2025",
    start_page_link: "https://example.com",
    subscription_page_link: "https://example.com",
    display_summary: "yes",
    summary_of_cases: "Case 123 - Smith v Jones"
  }),
  getSubscriptionTemplateIdForListType: vi.fn().mockReturnValue("template-id-123")
}));

vi.mock("./subscription-queries.js", () => ({
  findActiveSubscriptionsByLocation: vi.fn()
}));

vi.mock("./notification-queries.js", () => ({
  createNotificationAuditLog: vi.fn(),
  updateNotificationStatus: vi.fn()
}));

vi.mock("../rate-limiting/email-rate-limiter.js", () => ({
  checkEmailRateLimit: vi.fn()
}));

describe("notification-service", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mocks to default values after clearAllMocks
    const { sendEmail } = await import("../govnotify/govnotify-client.js");
    vi.mocked(sendEmail).mockResolvedValue({ success: true, notificationId: "notif-123" });

    const { extractCaseSummary, formatCaseSummaryForEmail } = await import("@hmcts/civil-and-family-daily-cause-list");
    vi.mocked(extractCaseSummary).mockReturnValue([{ caseReference: "123", parties: "Smith v Jones" }] as any);
    vi.mocked(formatCaseSummaryForEmail).mockReturnValue("Case 123 - Smith v Jones");

    const { checkEmailRateLimit } = await import("../rate-limiting/email-rate-limiter.js");
    vi.mocked(checkEmailRateLimit).mockResolvedValue(undefined);

    const { buildTemplateParameters, buildEnhancedTemplateParameters, getSubscriptionTemplateIdForListType } = await import("../govnotify/template-config.js");
    vi.mocked(buildTemplateParameters).mockReturnValue({
      locations: "Test Court",
      ListType: "Daily Cause List",
      content_date: "1 January 2025",
      start_page_link: "https://example.com",
      subscription_page_link: "https://example.com"
    });
    vi.mocked(buildEnhancedTemplateParameters).mockReturnValue({
      locations: "Test Court",
      ListType: "Civil And Family Daily Cause List",
      content_date: "1 January 2025",
      start_page_link: "https://example.com",
      subscription_page_link: "https://example.com",
      display_summary: "yes",
      summary_of_cases: "Case 123 - Smith v Jones"
    });
    vi.mocked(getSubscriptionTemplateIdForListType).mockReturnValue("template-id-123");
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

    const { findActiveSubscriptionsByLocation } = await import("./subscription-queries.js");
    const { createNotificationAuditLog } = await import("./notification-queries.js");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue(mockSubscriptions);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      govNotifyId: null,
      status: "Pending",
      errorMessage: null,
      emailType: "SUBSCRIPTION",
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

  it("should send email to users with a non-null email address regardless of format", async () => {
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

    const { findActiveSubscriptionsByLocation } = await import("./subscription-queries.js");
    const { createNotificationAuditLog } = await import("./notification-queries.js");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue(mockSubscriptions);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      govNotifyId: null,
      status: "Skipped",
      errorMessage: null,
      emailType: "SUBSCRIPTION",
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
    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it("should return empty result when no subscriptions exist", async () => {
    const { findActiveSubscriptionsByLocation } = await import("./subscription-queries.js");
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

    const { findActiveSubscriptionsByLocation } = await import("./subscription-queries.js");
    const { createNotificationAuditLog, updateNotificationStatus } = await import("./notification-queries.js");
    const { sendEmail } = await import("../govnotify/govnotify-client.js");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue(mockSubscriptions);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      govNotifyId: null,
      status: "Pending",
      errorMessage: null,
      emailType: "SUBSCRIPTION",
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

    const { findActiveSubscriptionsByLocation } = await import("./subscription-queries.js");
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

  it("should use enhanced template for Civil and Family list with JSON data and PDF", async () => {
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: "user-1",
        locationId: 1,
        user: {
          email: "user1@example.com",
          firstName: "John",
          surname: "Doe"
        }
      }
    ];

    const { findActiveSubscriptionsByLocation } = await import("./subscription-queries.js");
    const { createNotificationAuditLog } = await import("./notification-queries.js");
    const { sendEmail } = await import("../govnotify/govnotify-client.js");
    const { getSubscriptionTemplateIdForListType, buildEnhancedTemplateParameters } = await import("../govnotify/template-config.js");
    const fs = await import("node:fs/promises");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue(mockSubscriptions);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      govNotifyId: null,
      status: "Pending",
      errorMessage: null,
      emailType: "SUBSCRIPTION",
      createdAt: new Date(),
      sentAt: null
    });
    vi.mocked(fs.default.stat).mockResolvedValue({ size: 1024 * 1024 } as any);
    vi.mocked(fs.default.readFile).mockResolvedValue(Buffer.from("PDF content"));

    const result = await sendPublicationNotifications({
      publicationId: "pub-1",
      locationId: "1",
      locationName: "Test Court",
      hearingListName: "Civil And Family Daily Cause List",
      publicationDate: new Date("2025-01-01"),
      listTypeId: 8,
      jsonData: { courtLists: [] },
      pdfFilePath: "/path/to/pdf.pdf"
    });

    expect(result.sent).toBe(1);
    expect(getSubscriptionTemplateIdForListType).toHaveBeenCalledWith(8, true, true);
    expect(buildEnhancedTemplateParameters).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "template-id-123",
        pdfBuffer: expect.any(Buffer)
      })
    );
  });

  it("should use summary-only template for Civil and Family list without PDF", async () => {
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: "user-1",
        locationId: 1,
        user: {
          email: "user1@example.com",
          firstName: "John",
          surname: "Doe"
        }
      }
    ];

    const { findActiveSubscriptionsByLocation } = await import("./subscription-queries.js");
    const { createNotificationAuditLog } = await import("./notification-queries.js");
    const { sendEmail } = await import("../govnotify/govnotify-client.js");
    const { getSubscriptionTemplateIdForListType } = await import("../govnotify/template-config.js");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue(mockSubscriptions);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      govNotifyId: null,
      status: "Pending",
      errorMessage: null,
      emailType: "SUBSCRIPTION",
      createdAt: new Date(),
      sentAt: null
    });

    const result = await sendPublicationNotifications({
      publicationId: "pub-1",
      locationId: "1",
      locationName: "Test Court",
      hearingListName: "Civil And Family Daily Cause List",
      publicationDate: new Date("2025-01-01"),
      listTypeId: 8,
      jsonData: { courtLists: [] }
    });

    expect(result.sent).toBe(1);
    expect(getSubscriptionTemplateIdForListType).toHaveBeenCalledWith(8, false, false);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "template-id-123",
        pdfBuffer: undefined
      })
    );
  });

  it("should not include PDF buffer when file exceeds 2MB", async () => {
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: "user-1",
        locationId: 1,
        user: {
          email: "user1@example.com",
          firstName: "John",
          surname: "Doe"
        }
      }
    ];

    const { findActiveSubscriptionsByLocation } = await import("./subscription-queries.js");
    const { createNotificationAuditLog } = await import("./notification-queries.js");
    const { sendEmail } = await import("../govnotify/govnotify-client.js");
    const { getSubscriptionTemplateIdForListType } = await import("../govnotify/template-config.js");
    const fs = await import("node:fs/promises");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue(mockSubscriptions);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      govNotifyId: null,
      status: "Pending",
      errorMessage: null,
      emailType: "SUBSCRIPTION",
      createdAt: new Date(),
      sentAt: null
    });
    vi.mocked(fs.default.stat).mockResolvedValue({ size: 3 * 1024 * 1024 } as any);

    const result = await sendPublicationNotifications({
      publicationId: "pub-1",
      locationId: "1",
      locationName: "Test Court",
      hearingListName: "Civil And Family Daily Cause List",
      publicationDate: new Date("2025-01-01"),
      listTypeId: 8,
      jsonData: { courtLists: [] },
      pdfFilePath: "/path/to/large.pdf"
    });

    expect(result.sent).toBe(1);
    expect(getSubscriptionTemplateIdForListType).toHaveBeenCalledWith(8, true, false);
    expect(fs.default.readFile).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        pdfBuffer: undefined
      })
    );
  });

  it("should fall back to standard template when enhanced template fails", async () => {
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: "user-1",
        locationId: 1,
        user: {
          email: "user1@example.com",
          firstName: "John",
          surname: "Doe"
        }
      }
    ];

    const { findActiveSubscriptionsByLocation } = await import("./subscription-queries.js");
    const { createNotificationAuditLog } = await import("./notification-queries.js");
    const { sendEmail } = await import("../govnotify/govnotify-client.js");
    const { buildTemplateParameters } = await import("../govnotify/template-config.js");
    const { extractCaseSummary } = await import("@hmcts/civil-and-family-daily-cause-list");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue(mockSubscriptions);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      govNotifyId: null,
      status: "Pending",
      errorMessage: null,
      emailType: "SUBSCRIPTION",
      createdAt: new Date(),
      sentAt: null
    });
    vi.mocked(extractCaseSummary).mockImplementation(() => {
      throw new Error("Failed to extract case summary");
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendPublicationNotifications({
      publicationId: "pub-1",
      locationId: "1",
      locationName: "Test Court",
      hearingListName: "Civil And Family Daily Cause List",
      publicationDate: new Date("2025-01-01"),
      listTypeId: 8,
      jsonData: { courtLists: [] }
    });

    expect(result.sent).toBe(1);
    expect(buildTemplateParameters).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("Failed to build enhanced template parameters, falling back to standard template:", expect.any(Error));
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: undefined
      })
    );

    consoleSpy.mockRestore();
  });

  it("should use standard template for unsupported list types", async () => {
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: "user-1",
        locationId: 1,
        user: {
          email: "user1@example.com",
          firstName: "John",
          surname: "Doe"
        }
      }
    ];

    const { findActiveSubscriptionsByLocation } = await import("./subscription-queries.js");
    const { createNotificationAuditLog } = await import("./notification-queries.js");
    const { sendEmail } = await import("../govnotify/govnotify-client.js");
    const { buildTemplateParameters, buildEnhancedTemplateParameters } = await import("../govnotify/template-config.js");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue(mockSubscriptions);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      govNotifyId: null,
      status: "Pending",
      errorMessage: null,
      emailType: "SUBSCRIPTION",
      createdAt: new Date(),
      sentAt: null
    });

    const result = await sendPublicationNotifications({
      publicationId: "pub-1",
      locationId: "1",
      locationName: "Test Court",
      hearingListName: "Daily Cause List",
      publicationDate: new Date("2025-01-01"),
      listTypeId: 1
    });

    expect(result.sent).toBe(1);
    expect(buildTemplateParameters).toHaveBeenCalled();
    expect(buildEnhancedTemplateParameters).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: undefined
      })
    );
  });

  it("should send email when rate limit is not exceeded", async () => {
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: "user-1",
        searchType: "LOCATION_ID",
        searchValue: "1",
        user: { email: "user1@example.com", firstName: "John", surname: "Doe" }
      }
    ];

    const { findActiveSubscriptionsByLocation } = await import("./subscription-queries.js");
    const { createNotificationAuditLog } = await import("./notification-queries.js");
    const { sendEmail } = await import("../govnotify/govnotify-client.js");
    const { checkEmailRateLimit } = await import("../rate-limiting/email-rate-limiter.js");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue(mockSubscriptions);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      govNotifyId: null,
      status: "Pending",
      errorMessage: null,
      emailType: "SUBSCRIPTION",
      createdAt: new Date(),
      sentAt: null
    });
    vi.mocked(checkEmailRateLimit).mockResolvedValue(undefined);

    const result = await sendPublicationNotifications({
      publicationId: "pub-1",
      locationId: "1",
      locationName: "Test Court",
      hearingListName: "Daily Cause List",
      publicationDate: new Date("2024-12-01")
    });

    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(0);
    expect(sendEmail).toHaveBeenCalled();
  });

  it("should skip and not send email when non-critical rate limit is exceeded", async () => {
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: "user-1",
        searchType: "LOCATION_ID",
        searchValue: "1",
        user: { email: "user1@example.com", firstName: "John", surname: "Doe" }
      }
    ];

    const { findActiveSubscriptionsByLocation } = await import("./subscription-queries.js");
    const { sendEmail } = await import("../govnotify/govnotify-client.js");
    const { checkEmailRateLimit } = await import("../rate-limiting/email-rate-limiter.js");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue(mockSubscriptions);
    vi.mocked(checkEmailRateLimit).mockRejectedValue(new Error("Rate limit exceeded: SUBSCRIPTION emails to u***@example.com"));

    const result = await sendPublicationNotifications({
      publicationId: "pub-1",
      locationId: "1",
      locationName: "Test Court",
      hearingListName: "Daily Cause List",
      publicationDate: new Date("2024-12-01")
    });

    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("should fail and not send email when critical rate limit is exceeded", async () => {
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: "user-1",
        searchType: "LOCATION_ID",
        searchValue: "1",
        user: { email: "user1@example.com", firstName: "John", surname: "Doe" }
      }
    ];

    const { findActiveSubscriptionsByLocation } = await import("./subscription-queries.js");
    const { sendEmail } = await import("../govnotify/govnotify-client.js");
    const { checkEmailRateLimit } = await import("../rate-limiting/email-rate-limiter.js");
    const { TooManyEmailsException } = await import("../rate-limiting/too-many-emails-exception.js");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue(mockSubscriptions);
    vi.mocked(checkEmailRateLimit).mockRejectedValue(new TooManyEmailsException("u***@example.com", "MEDIA_APPROVAL"));

    const result = await sendPublicationNotifications({
      publicationId: "pub-1",
      locationId: "1",
      locationName: "Test Court",
      hearingListName: "Daily Cause List",
      publicationDate: new Date("2024-12-01")
    });

    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
