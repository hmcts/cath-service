import {
  GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL_ONLY,
  GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_NO_LINKS,
  GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL,
  GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY
} from "@hmcts/govuk-notify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  sendListTypePublicationNotifications,
  sendLocationAndCaseSubscriptionNotifications,
  sendSubscriptionDeletedNotification,
  sendSystemAdminNotification
} from "./notification-service.js";

const TEMPLATE_IDS = {
  noLinks: GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_NO_LINKS,
  excelOnly: GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL_ONLY,
  pdfExcel: GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL,
  pdfOnly: GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY
};

vi.mock("@hmcts/azure-blob", () => ({
  downloadBlob: vi.fn().mockResolvedValue(null),
  CONTAINER: { ARTEFACT: "artefact", PUBLICATIONS: "publications" }
}));

vi.mock("@hmcts/civil-and-family-daily-cause-list", () => ({
  extractCaseSummary: vi.fn().mockReturnValue([{ caseReference: "123", parties: "Smith v Jones" }]),
  formatCaseSummaryForEmail: vi.fn().mockReturnValue("Case 123 - Smith v Jones")
}));

vi.mock("@hmcts/magistrates-standard-list", () => ({
  extractCaseSummary: vi.fn().mockReturnValue([{ caseReference: "M1" }]),
  formatCaseSummaryForEmail: vi.fn().mockReturnValue("Case M1")
}));

vi.mock("../notify-templates/send-email.js", () => ({
  sendEmail: vi.fn().mockResolvedValue({
    success: true,
    notificationId: "notif-123"
  })
}));

vi.mock("../notify-templates/template-config.js", async (importOriginal) => ({
  MAX_NOTIFY_ATTACHMENT_SIZE_BYTES: (await importOriginal<typeof import("../notify-templates/template-config.js")>()).MAX_NOTIFY_ATTACHMENT_SIZE_BYTES,
  isWithinNotifyAttachmentLimit: (await importOriginal<typeof import("../notify-templates/template-config.js")>()).isWithinNotifyAttachmentLimit,
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
  getSubscriptionTemplateId: vi.fn().mockReturnValue("template-id-123"),
  getFlatFileSubscriptionTemplateId: vi.fn().mockReturnValue("flat-file-template-id"),
  getSystemAdminTemplateId: vi.fn().mockReturnValue("location-deleted-template-id"),
  getLocationSubscriptionDeletionTemplateId: vi.fn().mockReturnValue("subscription-deleted-template-id"),
  getEnvName: vi.fn().mockReturnValue("Local")
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

    const { sendEmail } = await import("../notify-templates/send-email.js");
    vi.mocked(sendEmail).mockResolvedValue({ success: true, notificationId: "notif-lt-1" });

    const { buildTemplateParameters } = await import("../notify-templates/template-config.js");
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
    const { sendEmail } = await import("../notify-templates/send-email.js");

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
    const { sendEmail } = await import("../notify-templates/send-email.js");

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
    const { sendEmail } = await import("../notify-templates/send-email.js");

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
    const { buildTemplateParameters } = await import("../notify-templates/template-config.js");

    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue([mockSubscriber] as never);
    vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([{ userId: "user-1", searchValue: "AB-123" }]);

    await sendListTypePublicationNotifications(baseEvent);

    expect(buildTemplateParameters).toHaveBeenCalledWith(expect.objectContaining({ caseValue: "AB-123" }));
  });

  it("should include matched case value in enhanced email when list type supports enhanced template", async () => {
    const mockSubscriber = { userId: "user-1", user: { email: "user1@example.com", firstName: "John", surname: "Doe" } };

    const { findListTypeSubscribersByListTypeAndLanguage, findCaseSubscriptionsByUserIds } = await import("./subscription-queries.js");
    const { buildEnhancedTemplateParameters } = await import("../notify-templates/template-config.js");
    const { prisma } = await import("@hmcts/postgres-prisma");

    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST" } as any);
    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue([mockSubscriber] as never);
    vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([{ userId: "user-1", searchValue: "AB-123" }]);

    await sendListTypePublicationNotifications({ ...baseEvent, jsonData: { someData: true } });

    expect(buildEnhancedTemplateParameters).toHaveBeenCalledWith(expect.objectContaining({ caseValue: "AB-123" }));
  });

  it("should preserve case value when enhanced template extraction falls back to standard template", async () => {
    const mockSubscriber = { userId: "user-1", user: { email: "user1@example.com", firstName: "John", surname: "Doe" } };

    const { findListTypeSubscribersByListTypeAndLanguage, findCaseSubscriptionsByUserIds } = await import("./subscription-queries.js");
    const { buildEnhancedTemplateParameters, buildTemplateParameters } = await import("../notify-templates/template-config.js");
    const { prisma } = await import("@hmcts/postgres-prisma");

    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST" } as any);
    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue([mockSubscriber] as never);
    vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([{ userId: "user-1", searchValue: "AB-123" }]);
    vi.mocked(buildEnhancedTemplateParameters).mockImplementation(() => {
      throw new Error("Extraction failed");
    });

    await sendListTypePublicationNotifications({ ...baseEvent, jsonData: { someData: true } });

    expect(buildTemplateParameters).toHaveBeenCalledWith(expect.objectContaining({ caseValue: "AB-123" }));
  });

  it("should download PDF from publications container and attach to email when pdfFilePath is set and PDF is under 2MB", async () => {
    // Arrange
    const mockSubscriber = { userId: "user-1", user: { email: "user1@example.com", firstName: "John", surname: "Doe" } };
    const { findListTypeSubscribersByListTypeAndLanguage, findCaseSubscriptionsByUserIds } = await import("./subscription-queries.js");
    const { prisma } = await import("@hmcts/postgres-prisma");
    const { downloadBlob } = await import("@hmcts/azure-blob");
    const { sendEmail } = await import("../notify-templates/send-email.js");
    const { buildEnhancedTemplateParameters } = await import("../notify-templates/template-config.js");

    vi.mocked(buildEnhancedTemplateParameters).mockReturnValue({
      locations: "Test Court",
      ListType: "Civil And Family Daily Cause List",
      content_date: "1 January 2025",
      start_page_link: "https://example.com",
      subscription_page_link: "https://example.com",
      display_summary: "yes",
      summary_of_cases: "Case 123 - Smith v Jones"
    });
    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST" } as any);
    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue([mockSubscriber] as never);
    vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([]);
    vi.mocked(downloadBlob).mockResolvedValue(Buffer.from("pdf content"));

    // Act
    await sendListTypePublicationNotifications({ ...baseEvent, jsonData: { someData: true }, pdfFilePath: "artefact-1.pdf" });

    // Assert
    expect(downloadBlob).toHaveBeenCalledWith("artefact-1.pdf", "publications");
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ pdfBuffer: expect.any(Buffer) }));
  });

  it("should use the enhanced summary when the source payload is within the summary limit", async () => {
    const mockSubscriber = { userId: "user-1", user: { email: "user1@example.com", firstName: "John", surname: "Doe" } };

    const { findListTypeSubscribersByListTypeAndLanguage, findCaseSubscriptionsByUserIds } = await import("./subscription-queries.js");
    const { buildEnhancedTemplateParameters } = await import("../notify-templates/template-config.js");
    const { prisma } = await import("@hmcts/postgres-prisma");

    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST" } as any);
    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue([mockSubscriber] as never);
    vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([]);

    await sendListTypePublicationNotifications({ ...baseEvent, jsonData: { courtLists: [] } });

    expect(buildEnhancedTemplateParameters).toHaveBeenCalled();
  });

  it("should fall back to the no-summary template when the source payload exceeds the summary limit", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const mockSubscriber = { userId: "user-1", user: { email: "user1@example.com", firstName: "John", surname: "Doe" } };

    const { findListTypeSubscribersByListTypeAndLanguage, findCaseSubscriptionsByUserIds } = await import("./subscription-queries.js");
    const { buildEnhancedTemplateParameters, buildTemplateParameters } = await import("../notify-templates/template-config.js");
    const { prisma } = await import("@hmcts/postgres-prisma");

    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST" } as any);
    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue([mockSubscriber] as never);
    vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([]);

    // ~300KB source: over the 256KB summary gate
    const oversizedSummary = { big: "x".repeat(300 * 1024) };

    await sendListTypePublicationNotifications({ ...baseEvent, jsonData: oversizedSummary });

    expect(buildEnhancedTemplateParameters).not.toHaveBeenCalled();
    expect(buildTemplateParameters).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Email summary skipped generation: source payload"),
      expect.objectContaining({ publicationId: "pub-1" })
    );
    consoleLogSpy.mockRestore();
  });

  it("should fall back to the no-summary template when the received payload size exceeds the summary limit even if the minified jsonData is small", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const mockSubscriber = { userId: "user-1", user: { email: "user1@example.com", firstName: "John", surname: "Doe" } };

    const { findListTypeSubscribersByListTypeAndLanguage, findCaseSubscriptionsByUserIds } = await import("./subscription-queries.js");
    const { buildEnhancedTemplateParameters, buildTemplateParameters } = await import("../notify-templates/template-config.js");
    const { prisma } = await import("@hmcts/postgres-prisma");

    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST" } as any);
    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue([mockSubscriber] as never);
    vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([]);

    await sendListTypePublicationNotifications({ ...baseEvent, jsonData: { courtLists: [] }, payloadSizeBytes: 300 * 1024 });

    expect(buildEnhancedTemplateParameters).not.toHaveBeenCalled();
    expect(buildTemplateParameters).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  it("should send email without PDF buffer when PDF blob is not found", async () => {
    // Arrange
    const mockSubscriber = { userId: "user-1", user: { email: "user1@example.com", firstName: "John", surname: "Doe" } };
    const { findListTypeSubscribersByListTypeAndLanguage, findCaseSubscriptionsByUserIds } = await import("./subscription-queries.js");
    const { prisma } = await import("@hmcts/postgres-prisma");
    const { downloadBlob } = await import("@hmcts/azure-blob");

    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST" } as any);
    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue([mockSubscriber] as never);
    vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([]);
    vi.mocked(downloadBlob).mockResolvedValue(null);

    // Act
    const result = await sendListTypePublicationNotifications({ ...baseEvent, jsonData: { someData: true }, pdfFilePath: "artefact-1.pdf" });

    // Assert
    expect(result.sent).toBe(1);
  });

  describe("subscription template selection by generated file size", () => {
    const TWO_MB = 2 * 1024 * 1024;
    const UNDER = Buffer.alloc(1024);
    const OVER = Buffer.alloc(TWO_MB + 1);
    const EXACTLY_TWO_MB = Buffer.alloc(TWO_MB);

    afterEach(async () => {
      const { downloadBlob } = await import("@hmcts/azure-blob");
      vi.mocked(downloadBlob).mockResolvedValue(null);
    });

    it.each([
      { scenario: "both under 2MB", pdf: UNDER, excel: UNDER, hasPdf: true, hasExcel: true },
      { scenario: "PDF under 2MB and Excel over 2MB", pdf: UNDER, excel: OVER, hasPdf: true, hasExcel: false },
      { scenario: "PDF under 2MB and no Excel generated", pdf: UNDER, excel: null, hasPdf: true, hasExcel: false },
      { scenario: "PDF over 2MB and Excel under 2MB", pdf: OVER, excel: UNDER, hasPdf: false, hasExcel: true },
      { scenario: "no PDF generated and Excel under 2MB", pdf: null, excel: UNDER, hasPdf: false, hasExcel: true },
      { scenario: "both over 2MB", pdf: OVER, excel: OVER, hasPdf: false, hasExcel: false },
      { scenario: "neither generated", pdf: null, excel: null, hasPdf: false, hasExcel: false },
      { scenario: "PDF exactly 2MB and Excel under 2MB", pdf: EXACTLY_TWO_MB, excel: UNDER, hasPdf: true, hasExcel: true }
    ])("should select the template and attachments correctly when $scenario", async ({ pdf, excel, hasPdf, hasExcel }) => {
      // Arrange
      const mockSubscriber = { userId: "user-1", user: { email: "user1@example.com", firstName: "John", surname: "Doe" } };
      const { findListTypeSubscribersByListTypeAndLanguage, findCaseSubscriptionsByUserIds } = await import("./subscription-queries.js");
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { downloadBlob } = await import("@hmcts/azure-blob");
      const { sendEmail } = await import("../notify-templates/send-email.js");
      const { getSubscriptionTemplateId } = await import("../notify-templates/template-config.js");

      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST" } as any);
      vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue([mockSubscriber] as never);
      vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([]);
      vi.mocked(downloadBlob).mockImplementation(async (key: string) => (key === "artefact-1.pdf" ? pdf : excel));

      // Act
      await sendListTypePublicationNotifications({ ...baseEvent, jsonData: { someData: true }, pdfFilePath: "artefact-1.pdf" });

      // Assert
      expect(getSubscriptionTemplateId).toHaveBeenCalledWith({ hasPdf, hasExcel });
      const sent = vi.mocked(sendEmail).mock.calls[0][0];
      expect(sent.pdfBuffer !== undefined).toBe(hasPdf);
      expect(sent.excelBuffer !== undefined).toBe(hasExcel);
    });
  });
});

describe("Notify attachment size limit", () => {
  const baseEvent = {
    publicationId: "pub-size",
    locationId: "1",
    locationName: "Test Court",
    hearingListName: "Daily Cause List",
    publicationDate: new Date("2025-01-01"),
    listTypeId: 999,
    language: "ENGLISH",
    pdfFilePath: "pub-size.pdf"
  };
  const subscriber = { userId: "user-1", user: { email: "user1@example.com", firstName: "John", surname: "Doe" } };

  beforeEach(async () => {
    vi.clearAllMocks();

    const actual = await vi.importActual<typeof import("../notify-templates/template-config.js")>("../notify-templates/template-config.js");
    const { getSubscriptionTemplateId } = await import("../notify-templates/template-config.js");
    vi.mocked(getSubscriptionTemplateId).mockImplementation(actual.getSubscriptionTemplateId);

    const { sendEmail } = await import("../notify-templates/send-email.js");
    vi.mocked(sendEmail).mockResolvedValue({ success: true, notificationId: "notif-size" });

    const { findListTypeSubscribersByListTypeAndLanguage, findCaseSubscriptionsByUserIds } = await import("./subscription-queries.js");
    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue([subscriber] as never);
    vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([]);
  });

  async function sendWithStoredFiles(listTypeName: string, files: { pdf: Buffer | null; excel: Buffer | null }) {
    const { prisma } = await import("@hmcts/postgres-prisma");
    const { downloadBlob } = await import("@hmcts/azure-blob");
    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: listTypeName } as any);
    vi.mocked(downloadBlob).mockImplementation(async (key: string) => (key.endsWith(".pdf") ? files.pdf : files.excel));

    await sendListTypePublicationNotifications(baseEvent);

    const { sendEmail } = await import("../notify-templates/send-email.js");
    return vi.mocked(sendEmail).mock.calls[0][0];
  }

  it("should set the attachment limit to exactly 2 MB", async () => {
    const { MAX_NOTIFY_ATTACHMENT_SIZE_BYTES } = await import("../notify-templates/template-config.js");

    expect(MAX_NOTIFY_ATTACHMENT_SIZE_BYTES).toBe(2_097_152);
  });

  it("should link a PDF of exactly 2 MB using the PDF-only template", async () => {
    // Arrange
    const { MAX_NOTIFY_ATTACHMENT_SIZE_BYTES } = await import("../notify-templates/template-config.js");
    const pdf = Buffer.alloc(MAX_NOTIFY_ATTACHMENT_SIZE_BYTES);

    // Act
    const sent = await sendWithStoredFiles("CIVIL_DAILY_CAUSE_LIST", { pdf, excel: null });

    // Assert
    expect(sent.templateId).toBe(TEMPLATE_IDS.pdfOnly);
    expect(sent.pdfBuffer).toBe(pdf);
    expect(sent.excelBuffer).toBeUndefined();
  });

  it("should withhold a PDF one byte over 2 MB and use the no-links template", async () => {
    // Arrange
    const { MAX_NOTIFY_ATTACHMENT_SIZE_BYTES } = await import("../notify-templates/template-config.js");
    const pdf = Buffer.alloc(MAX_NOTIFY_ATTACHMENT_SIZE_BYTES + 1);

    // Act
    const sent = await sendWithStoredFiles("CIVIL_DAILY_CAUSE_LIST", { pdf, excel: null });

    // Assert
    expect(sent.templateId).toBe(TEMPLATE_IDS.noLinks);
    expect(sent.pdfBuffer).toBeUndefined();
    expect(sent.excelBuffer).toBeUndefined();
  });

  it("should link an Excel of exactly 2 MB alongside the PDF using the PDF and Excel template", async () => {
    // Arrange
    const { MAX_NOTIFY_ATTACHMENT_SIZE_BYTES } = await import("../notify-templates/template-config.js");
    const pdf = Buffer.from("pdf");
    const excel = Buffer.alloc(MAX_NOTIFY_ATTACHMENT_SIZE_BYTES);

    // Act
    const sent = await sendWithStoredFiles("CIVIL_DAILY_CAUSE_LIST", { pdf, excel });

    // Assert
    expect(sent.templateId).toBe(TEMPLATE_IDS.pdfExcel);
    expect(sent.pdfBuffer).toBe(pdf);
    expect(sent.excelBuffer).toBe(excel);
  });

  it("should drop only the Excel link when the Excel is one byte over 2 MB", async () => {
    // Arrange
    const { MAX_NOTIFY_ATTACHMENT_SIZE_BYTES } = await import("../notify-templates/template-config.js");
    const pdf = Buffer.from("pdf");
    const excel = Buffer.alloc(MAX_NOTIFY_ATTACHMENT_SIZE_BYTES + 1);

    // Act
    const sent = await sendWithStoredFiles("CIVIL_DAILY_CAUSE_LIST", { pdf, excel });

    // Assert
    expect(sent.templateId).toBe(TEMPLATE_IDS.pdfOnly);
    expect(sent.pdfBuffer).toBe(pdf);
    expect(sent.excelBuffer).toBeUndefined();
  });

  it("should use the Excel-only template for an SJP list when the PDF blob is missing", async () => {
    // Arrange
    const excel = Buffer.from("excel");

    // Act
    const sent = await sendWithStoredFiles("SJP_PUBLIC_LIST", { pdf: null, excel });

    // Assert
    expect(sent.templateId).toBe(TEMPLATE_IDS.excelOnly);
    expect(sent.pdfBuffer).toBeUndefined();
    expect(sent.excelBuffer).toBe(excel);
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

    const { sendEmail } = await import("../notify-templates/send-email.js");
    vi.mocked(sendEmail).mockResolvedValue({ success: true, notificationId: "notif-combined-1" });

    const { buildTemplateParameters } = await import("../notify-templates/template-config.js");
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

    const { prisma } = await import("@hmcts/postgres-prisma");
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
    const { buildTemplateParameters } = await import("../notify-templates/template-config.js");

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
    const { buildTemplateParameters } = await import("../notify-templates/template-config.js");
    const { prisma } = await import("@hmcts/postgres-prisma");

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
    const { buildTemplateParameters } = await import("../notify-templates/template-config.js");
    const { prisma } = await import("@hmcts/postgres-prisma");

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
    const { buildTemplateParameters } = await import("../notify-templates/template-config.js");
    const { prisma } = await import("@hmcts/postgres-prisma");

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
    const { sendEmail } = await import("../notify-templates/send-email.js");
    const { buildTemplateParameters } = await import("../notify-templates/template-config.js");

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

describe("sendSystemAdminNotification", () => {
  const notification = {
    requesterEmail: "requester@example.com",
    changeType: "Delete Location",
    additionalChangeDetail: "Location Test Court with Id 42 has been deleted."
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send an email to each system admin with the five personalisation fields", async () => {
    const { sendEmail } = await import("../notify-templates/send-email.js");
    vi.mocked(sendEmail).mockResolvedValue({ success: true, notificationId: "notif-1" });

    await sendSystemAdminNotification(["admin1@example.com", "admin2@example.com"], notification);

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAddress: "admin1@example.com",
        templateId: "location-deleted-template-id",
        templateParameters: {
          requester_email: "requester@example.com",
          "attempted/succeeded": "succeeded",
          "change-type": "Delete Location",
          Additional_change_detail: "Location Test Court with Id 42 has been deleted.",
          env_name: "Local"
        }
      })
    );
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ emailAddress: "admin2@example.com" }));
  });

  it("should use the provided action result when set", async () => {
    const { sendEmail } = await import("../notify-templates/send-email.js");
    vi.mocked(sendEmail).mockResolvedValue({ success: true, notificationId: "notif-1" });

    await sendSystemAdminNotification(["admin1@example.com"], { ...notification, actionResult: "attempted" });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateParameters: expect.objectContaining({ "attempted/succeeded": "attempted" })
      })
    );
  });

  it("should not send any email when there are no admins", async () => {
    const { sendEmail } = await import("../notify-templates/send-email.js");

    await sendSystemAdminNotification([], notification);

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("should not throw when an email send fails (best-effort)", async () => {
    const { sendEmail } = await import("../notify-templates/send-email.js");
    vi.mocked(sendEmail).mockResolvedValue({ success: false, error: "Notify down" });

    await expect(sendSystemAdminNotification(["admin1@example.com"], notification)).resolves.toBeUndefined();
  });
});

describe("sendSubscriptionDeletedNotification", () => {
  const subscribers = [
    { email: "subscriber1@example.com", firstName: "Jane", surname: "Doe" },
    { email: "subscriber2@example.com", firstName: null, surname: null }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send an email to every subscriber using the subscription deleted template", async () => {
    const { sendEmail } = await import("../notify-templates/send-email.js");
    vi.mocked(sendEmail).mockResolvedValue({ success: true, notificationId: "notif-1" });

    await sendSubscriptionDeletedNotification(subscribers, "Test Court");

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail).toHaveBeenCalledWith({
      emailAddress: "subscriber1@example.com",
      templateId: "subscription-deleted-template-id",
      templateParameters: { "location-name": "Test Court" }
    });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ emailAddress: "subscriber2@example.com" }));
  });

  it("should not send any email when there are no subscribers", async () => {
    const { sendEmail } = await import("../notify-templates/send-email.js");

    await sendSubscriptionDeletedNotification([], "Test Court");

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("should not throw when an email send fails (best-effort)", async () => {
    const { sendEmail } = await import("../notify-templates/send-email.js");
    vi.mocked(sendEmail).mockResolvedValue({ success: false, error: "Notify down" });

    await expect(sendSubscriptionDeletedNotification(subscribers, "Test Court")).resolves.toBeUndefined();
  });
});

describe("media protocol personalisation flags", () => {
  const MAGISTRATES_FLAGS = { is_magistrates_media_protocol: "yes", is_not_magistrates_media_protocol: "no" };
  const NON_MAGISTRATES_FLAGS = { is_magistrates_media_protocol: "no", is_not_magistrates_media_protocol: "yes" };

  const listTypeEvent = {
    publicationId: "pub-1",
    locationId: "1",
    locationName: "Test Court",
    hearingListName: "Magistrates Standard List",
    publicationDate: new Date("2025-01-01"),
    listTypeId: 999,
    language: "ENGLISH"
  };

  const locationEvent = {
    publicationId: "pub-1",
    locationId: "1",
    locationName: "Test Court",
    hearingListName: "Magistrates Standard List",
    publicationDate: new Date("2025-01-01"),
    listTypeId: 999
  };

  const subscriber = { userId: "user-1", user: { email: "user1@example.com", firstName: "John", surname: "Doe" } };
  const locationSubscriber = { subscriptionId: "sub-1", searchType: "LOCATION_ID", searchValue: "1", ...subscriber };

  beforeEach(async () => {
    vi.clearAllMocks();

    const { sendEmail } = await import("../notify-templates/send-email.js");
    vi.mocked(sendEmail).mockResolvedValue({ success: true, notificationId: "notif-1" });

    const { buildTemplateParameters, buildEnhancedTemplateParameters } = await import("../notify-templates/template-config.js");
    vi.mocked(buildTemplateParameters).mockReturnValue({
      locations: "Test Court",
      ListType: "Magistrates Standard List",
      content_date: "1 January 2025",
      start_page_link: "https://example.com",
      subscription_page_link: "https://example.com"
    } as any);
    vi.mocked(buildEnhancedTemplateParameters).mockReturnValue({
      locations: "Test Court",
      ListType: "Magistrates Standard List",
      content_date: "1 January 2025",
      start_page_link: "https://example.com",
      subscription_page_link: "https://example.com",
      display_summary: "yes",
      summary_of_cases: "Case M1"
    } as any);

    const { downloadBlob } = await import("@hmcts/azure-blob");
    vi.mocked(downloadBlob).mockResolvedValue(null);

    const { prisma } = await import("@hmcts/postgres-prisma");
    vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue([]);

    const { findListTypeSubscribersByListTypeAndLanguage, findActiveSubscriptionsByLocation, findCaseSubscriptionsByUserIds } = await import(
      "./subscription-queries.js"
    );
    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue([subscriber] as never);
    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue([locationSubscriber] as never);
    vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([]);

    const { createNotificationAuditLog } = await import("./notification-queries.js");
    vi.mocked(createNotificationAuditLog).mockResolvedValue({ notificationId: "notif-1" } as never);
  });

  async function mockListTypeName(name: string | null) {
    const { prisma } = await import("@hmcts/postgres-prisma");
    vi.mocked(prisma.listType.findUnique).mockResolvedValue((name ? { name } : null) as any);
  }

  async function sentPersonalisation() {
    const { sendEmail } = await import("../notify-templates/send-email.js");
    return vi.mocked(sendEmail).mock.calls[0][0].templateParameters;
  }

  describe("sendListTypePublicationNotifications", () => {
    it("should send Magistrates flags on the enhanced path for a Magistrates list type", async () => {
      // Arrange
      await mockListTypeName("MAGISTRATES_STANDARD_LIST");

      // Act
      await sendListTypePublicationNotifications({ ...listTypeEvent, jsonData: { someData: true } });

      // Assert
      const { buildEnhancedTemplateParameters } = await import("../notify-templates/template-config.js");
      expect(buildEnhancedTemplateParameters).toHaveBeenCalled();
      expect(await sentPersonalisation()).toEqual(expect.objectContaining({ ...MAGISTRATES_FLAGS, summary_of_cases: "Case M1" }));
    });

    it("should send non-Magistrates flags for a non-Magistrates list type", async () => {
      // Arrange
      await mockListTypeName("CROWN_DAILY_LIST");

      // Act
      await sendListTypePublicationNotifications(listTypeEvent);

      // Assert
      expect(await sentPersonalisation()).toEqual(expect.objectContaining(NON_MAGISTRATES_FLAGS));
    });

    it("should send Magistrates flags on the fallback path when enhanced extraction fails", async () => {
      // Arrange
      await mockListTypeName("MAGISTRATES_STANDARD_LIST");
      const { buildEnhancedTemplateParameters, buildTemplateParameters } = await import("../notify-templates/template-config.js");
      vi.mocked(buildEnhancedTemplateParameters).mockImplementation(() => {
        throw new Error("Extraction failed");
      });

      // Act
      await sendListTypePublicationNotifications({ ...listTypeEvent, jsonData: { someData: true } });

      // Assert
      expect(buildTemplateParameters).toHaveBeenCalled();
      expect(await sentPersonalisation()).toEqual(expect.objectContaining(MAGISTRATES_FLAGS));
    });

    it("should send non-Magistrates flags when the list type name cannot be resolved", async () => {
      // Arrange
      await mockListTypeName(null);

      // Act
      await sendListTypePublicationNotifications(listTypeEvent);

      // Assert
      expect(await sentPersonalisation()).toEqual(expect.objectContaining(NON_MAGISTRATES_FLAGS));
    });
  });

  describe("sendLocationAndCaseSubscriptionNotifications", () => {
    it("should send Magistrates flags for a Magistrates list type", async () => {
      // Arrange
      await mockListTypeName("MAGISTRATES_STANDARD_LIST");

      // Act
      await sendLocationAndCaseSubscriptionNotifications("artefact-1", locationEvent);

      // Assert
      expect(await sentPersonalisation()).toEqual(expect.objectContaining(MAGISTRATES_FLAGS));
    });

    it("should send non-Magistrates flags for a non-Magistrates list type", async () => {
      // Arrange
      await mockListTypeName("CROWN_DAILY_LIST");

      // Act
      await sendLocationAndCaseSubscriptionNotifications("artefact-1", locationEvent);

      // Assert
      expect(await sentPersonalisation()).toEqual(expect.objectContaining(NON_MAGISTRATES_FLAGS));
    });
  });
});

describe("flat-file publications", () => {
  const FLAT_FILE = { buffer: Buffer.from("uploaded document"), fileName: "hearing-list.pdf" };

  const locationEvent = {
    publicationId: "artefact-1",
    locationId: "1",
    locationName: "Test Court",
    hearingListName: "Civil Daily Cause List",
    publicationDate: new Date("2025-01-01"),
    listTypeId: 999,
    flatFile: FLAT_FILE
  };

  const listTypeEvent = { ...locationEvent, language: "ENGLISH" };

  const subscriber = { userId: "user-1", user: { email: "user1@example.com", firstName: "John", surname: "Doe" } };
  const locationSubscriber = { subscriptionId: "sub-1", searchType: "LOCATION_ID", searchValue: "1", ...subscriber };

  beforeEach(async () => {
    vi.clearAllMocks();

    const { sendEmail } = await import("../notify-templates/send-email.js");
    vi.mocked(sendEmail).mockResolvedValue({ success: true, notificationId: "gov-notify-1" });

    const { buildTemplateParameters, getSubscriptionTemplateId } = await import("../notify-templates/template-config.js");
    vi.mocked(buildTemplateParameters).mockReturnValue({
      locations: "Test Court",
      ListType: "Civil Daily Cause List",
      content_date: "1 January 2025",
      start_page_link: "https://example.com",
      subscription_page_link: "https://example.com",
      display_locations: "yes"
    } as any);
    vi.mocked(getSubscriptionTemplateId).mockReturnValue("excel-only-template-id");

    const { downloadBlob } = await import("@hmcts/azure-blob");
    vi.mocked(downloadBlob).mockImplementation(async (blobName: string) => (blobName.endsWith(".xlsx") ? Buffer.from("stale excel") : null));

    const { prisma } = await import("@hmcts/postgres-prisma");
    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "CIVIL_DAILY_CAUSE_LIST" } as any);
    vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue([]);

    const { findListTypeSubscribersByListTypeAndLanguage, findActiveSubscriptionsByLocation, findCaseSubscriptionsByUserIds } = await import(
      "./subscription-queries.js"
    );
    vi.mocked(findListTypeSubscribersByListTypeAndLanguage).mockResolvedValue([subscriber] as never);
    vi.mocked(findActiveSubscriptionsByLocation).mockResolvedValue([locationSubscriber] as never);
    vi.mocked(findCaseSubscriptionsByUserIds).mockResolvedValue([]);

    const { createNotificationAuditLog } = await import("./notification-queries.js");
    vi.mocked(createNotificationAuditLog).mockResolvedValue({ notificationId: "audit-1" } as never);
  });

  async function sentEmailParams() {
    const { sendEmail } = await import("../notify-templates/send-email.js");
    return vi.mocked(sendEmail).mock.calls[0][0];
  }

  it("should use the flat-file template and pass the flat file to sendEmail for a location subscriber", async () => {
    // Act
    const result = await sendLocationAndCaseSubscriptionNotifications("artefact-1", locationEvent);

    // Assert
    const params = await sentEmailParams();
    expect(result.sent).toBe(1);
    expect(params.templateId).toBe("flat-file-template-id");
    expect(params.flatFile).toBe(FLAT_FILE);
    expect(params.pdfBuffer).toBeUndefined();
    expect(params.excelBuffer).toBeUndefined();
  });

  it("should use the flat-file template for a list type subscriber", async () => {
    // Act
    const result = await sendListTypePublicationNotifications(listTypeEvent);

    // Assert
    const params = await sentEmailParams();
    expect(result.sent).toBe(1);
    expect(params.templateId).toBe("flat-file-template-id");
    expect(params.flatFile).toBe(FLAT_FILE);
  });

  it("should not look up the Excel file or use the Excel template when a stale Excel file exists", async () => {
    // Arrange
    const { downloadBlob } = await import("@hmcts/azure-blob");
    const { getSubscriptionTemplateId } = await import("../notify-templates/template-config.js");

    // Act
    await sendLocationAndCaseSubscriptionNotifications("artefact-1", locationEvent);
    await sendListTypePublicationNotifications(listTypeEvent);

    // Assert
    const { sendEmail } = await import("../notify-templates/send-email.js");
    expect(downloadBlob).not.toHaveBeenCalled();
    expect(getSubscriptionTemplateId).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalledWith(expect.objectContaining({ templateId: "excel-only-template-id" }));
  });

  it("should include list_type in the personalisation", async () => {
    // Act
    await sendLocationAndCaseSubscriptionNotifications("artefact-1", locationEvent);

    // Assert
    const params = await sentEmailParams();
    expect(params.templateParameters).toEqual(expect.objectContaining({ list_type: "Civil Daily Cause List", locations: "Test Court" }));
  });

  it("should use the flat-file template even when the list type supports an enhanced summary", async () => {
    // Arrange
    const { prisma } = await import("@hmcts/postgres-prisma");
    const { buildEnhancedTemplateParameters } = await import("../notify-templates/template-config.js");
    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST" } as any);

    // Act
    await sendListTypePublicationNotifications({ ...listTypeEvent, jsonData: { someData: true } });

    // Assert
    const params = await sentEmailParams();
    expect(buildEnhancedTemplateParameters).not.toHaveBeenCalled();
    expect(params.templateId).toBe("flat-file-template-id");
  });

  it("should audit the notification as Failed when the flat-file send fails", async () => {
    // Arrange
    const { sendEmail } = await import("../notify-templates/send-email.js");
    const { updateNotificationStatus } = await import("./notification-queries.js");
    vi.mocked(sendEmail).mockResolvedValue({ success: false, error: "GOV.UK Notify error: File is larger than 2MB" });

    // Act
    const result = await sendLocationAndCaseSubscriptionNotifications("artefact-1", locationEvent);

    // Assert
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
    expect(updateNotificationStatus).toHaveBeenCalledWith("audit-1", "Failed", undefined, "GOV.UK Notify error: File is larger than 2MB");
  });

  it("should set the Magistrates media protocol flags for a Magistrates flat file", async () => {
    // Arrange
    const { prisma } = await import("@hmcts/postgres-prisma");
    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "MAGISTRATES_STANDARD_LIST" } as any);

    // Act
    await sendLocationAndCaseSubscriptionNotifications("artefact-1", locationEvent);

    // Assert
    const params = await sentEmailParams();
    expect(params.templateId).toBe("flat-file-template-id");
    expect(params.templateParameters).toEqual(expect.objectContaining({ is_magistrates_media_protocol: "yes", is_not_magistrates_media_protocol: "no" }));
  });

  it("should keep the JSON template selection unchanged when the publication is not a flat file", async () => {
    // Arrange
    const { flatFile: _flatFile, ...jsonEvent } = locationEvent;
    const { downloadBlob } = await import("@hmcts/azure-blob");
    const { getSubscriptionTemplateId } = await import("../notify-templates/template-config.js");

    // Act
    await sendLocationAndCaseSubscriptionNotifications("artefact-1", jsonEvent);

    // Assert
    const params = await sentEmailParams();
    expect(downloadBlob).toHaveBeenCalledWith("artefact-1.xlsx", "publications");
    expect(getSubscriptionTemplateId).toHaveBeenCalledWith({ hasPdf: false, hasExcel: true });
    expect(params.templateId).toBe("excel-only-template-id");
    expect(params.excelBuffer).toEqual(Buffer.from("stale excel"));
    expect(params.flatFile).toBeUndefined();
  });
});
