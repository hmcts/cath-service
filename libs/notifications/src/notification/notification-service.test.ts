import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendListTypePublicationNotifications, sendLocationAndCaseSubscriptionNotifications } from "./notification-service.js";

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
  findActiveSubscriptionsByLocation: vi.fn(),
  findListTypeSubscribersByListTypeAndLanguage: vi.fn(),
  findActiveSubscriptionsByCaseNumber: vi.fn(),
  findActiveSubscriptionsByCaseName: vi.fn(),
  findCaseSubscriptionsByUserIds: vi.fn()
}));

vi.mock("./notification-queries.js", () => ({
  createNotificationAuditLog: vi.fn(),
  updateNotificationStatus: vi.fn()
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: {
      findUnique: vi.fn()
    },
    artefactSearch: {
      findMany: vi.fn()
    }
  }
}));

describe("sendListTypePublicationNotifications", () => {
  const baseEvent = {
    publicationId: "pub-1",
    locationId: "1",
    locationName: "Test Court",
    hearingListName: "Daily Cause List",
    publicationDate: new Date("2025-01-01"),
    listTypeId: 5,
    language: "ENGLISH"
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const { sendEmail } = await import("../govnotify/govnotify-client.js");
    vi.mocked(sendEmail).mockResolvedValue({ success: true, notificationId: "notif-lt-1" });

    const { buildTemplateParameters } = await import("../govnotify/template-config.js");
    vi.mocked(buildTemplateParameters).mockReturnValue({
      locations: "Test Court",
      ListType: "Daily Cause List",
      content_date: "1 January 2025",
      start_page_link: "https://example.com",
      subscription_page_link: "https://example.com"
    });

    const { prisma } = await import("@hmcts/postgres-prisma");
    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "CIVIL_DAILY_CAUSE_LIST" } as any);

    const { findCaseSubscriptionsByUserIds } = await import("./subscription-queries.js");
    vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([]);
  });

  it("should return empty result when no list type subscribers exist", async () => {
    const { findListTypeSubscribersByListTypeAndLanguage } = await import("./subscription-queries.js");
    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue([]);

    const result = await sendListTypePublicationNotifications(baseEvent);

    expect(result.totalSubscriptions).toBe(0);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it("should not send to users already notified via location or case subscription", async () => {
    const mockSubscribers = [
      { userId: "user-already-notified", user: { email: "already@example.com", firstName: "John", surname: "Doe" } },
      { userId: "user-new", user: { email: "new@example.com", firstName: "Jane", surname: "Smith" } }
    ];

    const { findListTypeSubscribersByListTypeAndLanguage } = await import("./subscription-queries.js");
    const { sendEmail } = await import("../govnotify/govnotify-client.js");

    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue(mockSubscribers as never);

    const result = await sendListTypePublicationNotifications(baseEvent, ["user-already-notified"]);

    expect(result.totalSubscriptions).toBe(1);
    expect(result.sent).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ emailAddress: "new@example.com" }));
    expect(sendEmail).not.toHaveBeenCalledWith(expect.objectContaining({ emailAddress: "already@example.com" }));
  });

  it("should send emails to all matched list type subscribers", async () => {
    const mockSubscribers = [
      { userId: "user-1", user: { email: "user1@example.com", firstName: "John", surname: "Doe" } },
      { userId: "user-2", user: { email: "user2@example.com", firstName: "Jane", surname: "Smith" } }
    ];

    const { findListTypeSubscribersByListTypeAndLanguage } = await import("./subscription-queries.js");
    const { sendEmail } = await import("../govnotify/govnotify-client.js");

    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue(mockSubscribers as never);

    const result = await sendListTypePublicationNotifications(baseEvent);

    expect(result.totalSubscriptions).toBe(2);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ emailAddress: "user1@example.com" }));
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ emailAddress: "user2@example.com" }));
  });

  it("should skip subscribers with no email address", async () => {
    const mockSubscribers = [{ userId: "user-1", user: { email: "", firstName: "John", surname: "Doe" } }];

    const { findListTypeSubscribersByListTypeAndLanguage } = await import("./subscription-queries.js");
    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue(mockSubscribers as never);

    const result = await sendListTypePublicationNotifications(baseEvent);

    expect(result.totalSubscriptions).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(0);
  });

  it("should record failures when email sending fails", async () => {
    const mockSubscribers = [{ userId: "user-1", user: { email: "user1@example.com", firstName: "John", surname: "Doe" } }];

    const { findListTypeSubscribersByListTypeAndLanguage } = await import("./subscription-queries.js");
    const { sendEmail } = await import("../govnotify/govnotify-client.js");

    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue(mockSubscribers as never);
    vi.mocked(sendEmail).mockResolvedValue({ success: false, error: "API Error" });

    const result = await sendListTypePublicationNotifications(baseEvent);

    expect(result.totalSubscriptions).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.errors).toContain("User user-1: API Error");
  });

  it("should query using ENGLISH_AND_WELSH combined with the publication language", async () => {
    const { findListTypeSubscribersByListTypeAndLanguage } = await import("./subscription-queries.js");
    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue([]);

    await sendListTypePublicationNotifications({ ...baseEvent, language: "WELSH" });

    expect(findListTypeSubscribersByListTypeAndLanguage).toHaveBeenCalledWith(5, "WELSH");
  });

  it("should include matched case value in email for a list type subscriber who also has a case subscription", async () => {
    const mockSubscriber = { userId: "user-1", user: { email: "user1@example.com", firstName: "John", surname: "Doe" } };

    const { findListTypeSubscribersByListTypeAndLanguage, findCaseSubscriptionsByUserIds } = await import("./subscription-queries.js");
    const { buildTemplateParameters } = await import("../govnotify/template-config.js");

    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue([mockSubscriber] as never);
    vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([{ userId: "user-1", searchValue: "AB-123" }]);

    await sendListTypePublicationNotifications(baseEvent);

    expect(buildTemplateParameters).toHaveBeenCalledWith(expect.objectContaining({ caseValue: "AB-123" }));
  });

  it("should include matched case value in enhanced email when list type supports enhanced template", async () => {
    const mockSubscriber = { userId: "user-1", user: { email: "user1@example.com", firstName: "John", surname: "Doe" } };

    const { findListTypeSubscribersByListTypeAndLanguage, findCaseSubscriptionsByUserIds } = await import("./subscription-queries.js");
    const { buildEnhancedTemplateParameters } = await import("../govnotify/template-config.js");
    const { prisma } = await import("@hmcts/postgres");

    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST" } as any);
    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue([mockSubscriber] as never);
    vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([{ userId: "user-1", searchValue: "AB-123" }]);

    await sendListTypePublicationNotifications({ ...baseEvent, jsonData: { someData: true } });

    expect(buildEnhancedTemplateParameters).toHaveBeenCalledWith(expect.objectContaining({ caseValue: "AB-123" }));
  });

  it("should preserve case value when enhanced template extraction falls back to standard template", async () => {
    const mockSubscriber = { userId: "user-1", user: { email: "user1@example.com", firstName: "John", surname: "Doe" } };

    const { findListTypeSubscribersByListTypeAndLanguage, findCaseSubscriptionsByUserIds } = await import("./subscription-queries.js");
    const { buildEnhancedTemplateParameters, buildTemplateParameters } = await import("../govnotify/template-config.js");
    const { prisma } = await import("@hmcts/postgres");

    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST" } as any);
    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue([mockSubscriber] as never);
    vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([{ userId: "user-1", searchValue: "AB-123" }]);
    vi.mocked(buildEnhancedTemplateParameters).mockImplementation(() => {
      throw new Error("Extraction failed");
    });

    await sendListTypePublicationNotifications({ ...baseEvent, jsonData: { someData: true } });

    expect(buildTemplateParameters).toHaveBeenCalledWith(expect.objectContaining({ caseValue: "AB-123" }));
  });
});

describe("sendLocationAndCaseSubscriptionNotifications", () => {
  const baseEvent = {
    publicationId: "pub-1",
    locationId: "1",
    locationName: "Test Court",
    hearingListName: "Daily Cause List",
    publicationDate: new Date("2025-01-01"),
    listTypeId: 1
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const { sendEmail } = await import("../govnotify/govnotify-client.js");
    vi.mocked(sendEmail).mockResolvedValue({ success: true, notificationId: "notif-combined-1" });

    const { buildTemplateParameters } = await import("../govnotify/template-config.js");
    vi.mocked(buildTemplateParameters).mockReturnValue({
      locations: "Test Court",
      ListType: "Daily Cause List",
      content_date: "1 January 2025",
      start_page_link: "https://example.com",
      subscription_page_link: "https://example.com",
      display_locations: "yes",
      display_case: "no",
      case: "",
      display_summary: "no",
      summary_of_cases: ""
    });

    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.listType.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue([]);

    const { findCaseSubscriptionsByUserIds } = await import("./subscription-queries.js");
    vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([]);
  });

  it("should return empty result when no location or case subscribers exist", async () => {
    const { findActiveSubscriptionsByLocation } = await import("./subscription-queries.js");
    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue([]);

    const result = await sendLocationAndCaseSubscriptionNotifications("artefact-1", baseEvent);

    expect(result.totalSubscriptions).toBe(0);
    expect(result.sent).toBe(0);
    expect(result.notifiedUserIds).toEqual([]);
  });

  it("should send one email to a user matched by location only", async () => {
    const locationSubscriber = {
      subscriptionId: "sub-1",
      userId: "user-1",
      searchType: "LOCATION_ID",
      searchValue: "1",
      user: { email: "user1@example.com", firstName: "John", surname: "Doe" }
    };

    const { findActiveSubscriptionsByLocation } = await import("./subscription-queries.js");
    const { createNotificationAuditLog } = await import("./notification-queries.js");
    const { buildTemplateParameters } = await import("../govnotify/template-config.js");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue([locationSubscriber]);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      govNotifyId: null,
      status: "Pending",
      errorMessage: null,
      createdAt: new Date(),
      sentAt: null
    });

    const result = await sendLocationAndCaseSubscriptionNotifications("artefact-1", baseEvent);

    expect(result.totalSubscriptions).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.notifiedUserIds).toEqual(["user-1"]);
    expect(buildTemplateParameters).toHaveBeenCalledWith(expect.objectContaining({ caseValue: undefined }));
  });

  it("should send one email to a user matched by case only, including location name", async () => {
    const caseSubscriber = {
      subscriptionId: "sub-2",
      userId: "user-2",
      user: { email: "user2@example.com", firstName: "Jane", surname: "Smith" }
    };

    const { findActiveSubscriptionsByLocation } = await import("./subscription-queries.js");
    const { findActiveSubscriptionsByCaseNumber } = await import("./subscription-queries.js");
    const { createNotificationAuditLog } = await import("./notification-queries.js");
    const { buildTemplateParameters } = await import("../govnotify/template-config.js");
    const { prisma } = await import("@hmcts/postgres");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue([]);
    vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue([{ caseNumber: "AB-123", caseName: null }] as any);
    vi.mocked(findActiveSubscriptionsByCaseNumber).mockResolvedValue([caseSubscriber] as any);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-2",
      subscriptionId: "sub-2",
      userId: "user-2",
      publicationId: "pub-1",
      govNotifyId: null,
      status: "Pending",
      errorMessage: null,
      createdAt: new Date(),
      sentAt: null
    });

    const result = await sendLocationAndCaseSubscriptionNotifications("artefact-1", baseEvent);

    expect(result.totalSubscriptions).toBe(1);
    expect(result.sent).toBe(1);
    expect(buildTemplateParameters).toHaveBeenCalledWith(expect.objectContaining({ caseValue: "AB-123" }));
  });

  it("should display case number followed by case name in brackets when both are present in artefact search", async () => {
    const caseSubscriber = {
      subscriptionId: "sub-2",
      userId: "user-2",
      user: { email: "user2@example.com", firstName: "Jane", surname: "Smith" }
    };

    const { findActiveSubscriptionsByLocation, findActiveSubscriptionsByCaseNumber, findActiveSubscriptionsByCaseName } = await import(
      "./subscription-queries.js"
    );
    const { createNotificationAuditLog } = await import("./notification-queries.js");
    const { buildTemplateParameters } = await import("../govnotify/template-config.js");
    const { prisma } = await import("@hmcts/postgres");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue([]);
    vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue([{ caseNumber: "AB-123", caseName: "Smith v Jones" }] as any);
    vi.mocked(findActiveSubscriptionsByCaseNumber).mockResolvedValue([caseSubscriber] as any);
    vi.mocked(findActiveSubscriptionsByCaseName).mockResolvedValue([]);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-2",
      subscriptionId: "sub-2",
      userId: "user-2",
      publicationId: "pub-1",
      govNotifyId: null,
      status: "Pending",
      errorMessage: null,
      createdAt: new Date(),
      sentAt: null
    });

    await sendLocationAndCaseSubscriptionNotifications("artefact-1", baseEvent);

    expect(buildTemplateParameters).toHaveBeenCalledWith(expect.objectContaining({ caseValue: "AB-123 (Smith v Jones)" }));
  });

  it("should display case number followed by case name in brackets when matched by case name", async () => {
    const caseSubscriber = {
      subscriptionId: "sub-3",
      userId: "user-3",
      user: { email: "user3@example.com", firstName: "Bob", surname: "Brown" }
    };

    const { findActiveSubscriptionsByLocation, findActiveSubscriptionsByCaseNumber, findActiveSubscriptionsByCaseName } = await import(
      "./subscription-queries.js"
    );
    const { createNotificationAuditLog } = await import("./notification-queries.js");
    const { buildTemplateParameters } = await import("../govnotify/template-config.js");
    const { prisma } = await import("@hmcts/postgres");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue([]);
    vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue([{ caseNumber: "AB-123", caseName: "Smith v Jones" }] as any);
    vi.mocked(findActiveSubscriptionsByCaseNumber).mockResolvedValue([]);
    vi.mocked(findActiveSubscriptionsByCaseName).mockResolvedValue([caseSubscriber] as any);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-3",
      subscriptionId: "sub-3",
      userId: "user-3",
      publicationId: "pub-1",
      govNotifyId: null,
      status: "Pending",
      errorMessage: null,
      createdAt: new Date(),
      sentAt: null
    });

    await sendLocationAndCaseSubscriptionNotifications("artefact-1", baseEvent);

    expect(buildTemplateParameters).toHaveBeenCalledWith(expect.objectContaining({ caseValue: "AB-123 (Smith v Jones)" }));
  });

  it("should send one combined email when a user is matched by both location and case", async () => {
    const locationSubscriber = {
      subscriptionId: "sub-1",
      userId: "user-1",
      searchType: "LOCATION_ID",
      searchValue: "1",
      user: { email: "user1@example.com", firstName: "John", surname: "Doe" }
    };

    const { findActiveSubscriptionsByLocation, findCaseSubscriptionsByUserIds } = await import("./subscription-queries.js");
    const { createNotificationAuditLog } = await import("./notification-queries.js");
    const { sendEmail } = await import("../govnotify/govnotify-client.js");
    const { buildTemplateParameters } = await import("../govnotify/template-config.js");

    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue([locationSubscriber]);
    vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([{ userId: "user-1", searchValue: "AB-123" }]);
    vi.mocked(createNotificationAuditLog).mockResolvedValue({
      notificationId: "notif-1",
      subscriptionId: "sub-1",
      userId: "user-1",
      publicationId: "pub-1",
      govNotifyId: null,
      status: "Pending",
      errorMessage: null,
      createdAt: new Date(),
      sentAt: null
    });

    const result = await sendLocationAndCaseSubscriptionNotifications("artefact-1", baseEvent);

    // Only 1 email sent, not 2
    expect(result.totalSubscriptions).toBe(1);
    expect(result.sent).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    // Email shows both location and case
    expect(buildTemplateParameters).toHaveBeenCalledWith(expect.objectContaining({ caseValue: "AB-123" }));
  });
});
