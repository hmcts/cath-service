import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatePublicationPdf, processPublication, sendPublicationNotificationsForArtefact } from "./service.js";

vi.mock("@hmcts/care-standards-tribunal-weekly-hearing-list", () => ({
  generateCareStandardsTribunalWeeklyHearingListPdf: vi.fn()
}));

vi.mock("@hmcts/civil-and-family-daily-cause-list", () => ({
  generateCauseListPdf: vi.fn()
}));

vi.mock("@hmcts/court-of-appeal-civil-daily-cause-list", () => ({
  generateCourtOfAppealCivilDailyCauseListPdf: vi.fn()
}));

vi.mock("@hmcts/london-administrative-court-daily-cause-list", () => ({
  generateLondonAdministrativeCourtDailyCauseListPdf: vi.fn()
}));

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

vi.mock("@hmcts/notifications", () => ({
  sendLocationAndCaseSubscriptionNotifications: vi.fn(),
  sendListTypePublicationNotifications: vi.fn()
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock("../artefact-search-extractor.js", () => ({
  extractAndStoreArtefactSearch: vi.fn()
}));

describe("publication-processor", async () => {
  const { generateCareStandardsTribunalWeeklyHearingListPdf } = await import("@hmcts/care-standards-tribunal-weekly-hearing-list");
  const { generateCauseListPdf } = await import("@hmcts/civil-and-family-daily-cause-list");
  const { generateCourtOfAppealCivilDailyCauseListPdf } = await import("@hmcts/court-of-appeal-civil-daily-cause-list");
  const { generateLondonAdministrativeCourtDailyCauseListPdf } = await import("@hmcts/london-administrative-court-daily-cause-list");
  const { getLocationById } = await import("@hmcts/location");
  const { sendLocationAndCaseSubscriptionNotifications, sendListTypePublicationNotifications } = await import("@hmcts/notifications");
  const { prisma } = await import("@hmcts/postgres-prisma");
  const { extractAndStoreArtefactSearch } = await import("../artefact-search-extractor.js");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.listType.findUnique).mockResolvedValue({
      name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
      friendlyName: "Civil And Family Daily Cause List"
    } as any);
    vi.mocked(sendLocationAndCaseSubscriptionNotifications).mockResolvedValue({
      totalSubscriptions: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      notifiedUserIds: []
    });
    vi.mocked(sendListTypePublicationNotifications).mockResolvedValue({
      totalSubscriptions: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: []
    });
  });

  describe("generatePublicationPdf", () => {
    const baseParams = {
      artefactId: "test-artefact-id",
      listTypeId: 8,
      contentDate: new Date("2025-01-25"),
      locale: "en",
      locationId: "123",
      jsonData: { courtLists: [] } as any,
      provenance: "MANUAL_UPLOAD"
    };

    it("should return empty result for unsupported list types", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "CIVIL_DAILY_CAUSE_LIST", friendlyName: "Civil Daily Cause List" } as any);

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 1 });

      expect(result).toEqual({});
      expect(generateCauseListPdf).not.toHaveBeenCalled();
    });

    it("should generate PDF for Civil and Family Daily Cause List", async () => {
      vi.mocked(generateCauseListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf(baseParams);

      expect(generateCauseListPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          artefactId: "test-artefact-id",
          contentDate: baseParams.contentDate,
          locale: "en",
          locationId: "123",
          jsonData: baseParams.jsonData,
          provenance: "MANUAL_UPLOAD"
        })
      );
      expect(result).toEqual({
        pdfPath: "/path/to/pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });
    });

    it("should return empty result when PDF generation fails", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      vi.mocked(generateCauseListPdf).mockResolvedValue({
        success: false,
        error: "Generation failed"
      });

      const result = await generatePublicationPdf(baseParams);

      expect(result).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalledWith("[Publication] PDF generation failed:", {
        artefactId: "test-artefact-id",
        error: "Generation failed"
      });

      consoleWarnSpy.mockRestore();
    });

    it("should handle exceptions during PDF generation", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(generateCauseListPdf).mockRejectedValue(new Error("Unexpected error"));

      const result = await generatePublicationPdf(baseParams);

      expect(result).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Publication] PDF generation error:", {
        artefactId: "test-artefact-id",
        error: "Unexpected error"
      });

      consoleErrorSpy.mockRestore();
    });

    it("should use custom log prefix", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      vi.mocked(generateCauseListPdf).mockResolvedValue({
        success: false,
        error: "Failed"
      });

      await generatePublicationPdf({ ...baseParams, logPrefix: "[Custom]" });

      expect(consoleWarnSpy).toHaveBeenCalledWith("[Custom] PDF generation failed:", expect.any(Object));

      consoleWarnSpy.mockRestore();
    });

    it("should generate PDF for London Administrative Court Daily Cause List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
        friendlyName: "London Administrative Court Daily Cause List"
      } as any);
      vi.mocked(generateLondonAdministrativeCourtDailyCauseListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/london-pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 10 });

      expect(generateLondonAdministrativeCourtDailyCauseListPdf).toHaveBeenCalled();
      expect(result).toEqual({ pdfPath: "/path/to/london-pdf", sizeBytes: 1024, exceedsMaxSize: false });
    });

    it("should generate PDF for Court of Appeal Civil Daily Cause List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST",
        friendlyName: "Court of Appeal Civil Daily Cause List"
      } as any);
      vi.mocked(generateCourtOfAppealCivilDailyCauseListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/coa-pdf",
        sizeBytes: 2048,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 11 });

      expect(generateCourtOfAppealCivilDailyCauseListPdf).toHaveBeenCalled();
      expect(result).toEqual({ pdfPath: "/path/to/coa-pdf", sizeBytes: 2048, exceedsMaxSize: false });
    });

    it("should generate PDF for Care Standards Tribunal Weekly Hearing List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST",
        friendlyName: "Care Standards Tribunal Weekly Hearing List"
      } as any);

      const careStandardsParams = {
        ...baseParams,
        listTypeId: 9,
        jsonData: [{ date: "10/12/2024", caseName: "Test Case" }],
        displayFrom: new Date("2025-01-20"),
        displayTo: new Date("2025-01-30")
      };

      vi.mocked(generateCareStandardsTribunalWeeklyHearingListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/cst-pdf",
        sizeBytes: 2048,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf(careStandardsParams);

      expect(generateCareStandardsTribunalWeeklyHearingListPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          artefactId: "test-artefact-id",
          locale: "en",
          locationId: "123",
          jsonData: careStandardsParams.jsonData,
          provenance: "MANUAL_UPLOAD",
          displayFrom: new Date("2025-01-20"),
          displayTo: new Date("2025-01-30")
        })
      );
      expect(result).toEqual({
        pdfPath: "/path/to/cst-pdf",
        sizeBytes: 2048,
        exceedsMaxSize: false
      });
    });
  });

  describe("sendPublicationNotificationsForArtefact", () => {
    const baseParams = {
      artefactId: "test-artefact-id",
      locationId: "123",
      listTypeId: 8,
      contentDate: new Date("2025-01-25"),
      jsonData: { courtLists: [] },
      pdfFilePath: "/path/to/pdf"
    };

    it("should return failure for invalid location ID", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await sendPublicationNotificationsForArtefact({
        ...baseParams,
        locationId: "invalid"
      });

      expect(result).toEqual({ success: false });
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Publication] Invalid location ID for notifications:", "invalid");
      expect(sendLocationAndCaseSubscriptionNotifications).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should return failure when location not found", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      vi.mocked(getLocationById).mockResolvedValue(null);

      const result = await sendPublicationNotificationsForArtefact(baseParams);

      expect(result).toEqual({ success: false });
      expect(consoleWarnSpy).toHaveBeenCalledWith("[Publication] Location not found for notifications:", {
        locationId: "123"
      });
      expect(sendLocationAndCaseSubscriptionNotifications).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it("should send notifications successfully", async () => {
      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendLocationAndCaseSubscriptionNotifications).mockResolvedValue({
        totalSubscriptions: 10,
        sent: 8,
        failed: 2,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });

      const result = await sendPublicationNotificationsForArtefact(baseParams);

      expect(sendLocationAndCaseSubscriptionNotifications).toHaveBeenCalledWith("test-artefact-id", {
        publicationId: "test-artefact-id",
        locationId: "123",
        locationName: "Test Court",
        hearingListName: "Civil And Family Daily Cause List",
        publicationDate: baseParams.contentDate,
        listTypeId: 8,
        jsonData: baseParams.jsonData,
        pdfFilePath: "/path/to/pdf"
      });
      expect(result).toEqual({
        success: true,
        totalSubscriptions: 10,
        sent: 8,
        failed: 2,
        skipped: 0
      });
    });

    it("should use fallback list type name when list type DB lookup throws", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      vi.mocked(prisma.listType.findUnique).mockRejectedValue(new Error("DB timeout"));
      vi.mocked(getLocationById).mockResolvedValue({ id: 123, name: "Test Court", welshName: "Llys Prawf" });
      vi.mocked(sendLocationAndCaseSubscriptionNotifications).mockResolvedValue({
        totalSubscriptions: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });

      await sendPublicationNotificationsForArtefact({ ...baseParams, listTypeId: 8 });

      expect(sendLocationAndCaseSubscriptionNotifications).toHaveBeenCalledWith(
        "test-artefact-id",
        expect.objectContaining({ hearingListName: "LIST_TYPE_8" })
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[Publication] List type lookup failed, using fallback name:",
        expect.objectContaining({ listTypeId: 8, error: "DB timeout" })
      );

      consoleWarnSpy.mockRestore();
    });

    it("should use fallback list type name when not found", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(null);
      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendLocationAndCaseSubscriptionNotifications).mockResolvedValue({
        totalSubscriptions: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });

      await sendPublicationNotificationsForArtefact({ ...baseParams, listTypeId: 999 });

      expect(sendLocationAndCaseSubscriptionNotifications).toHaveBeenCalledWith(
        "test-artefact-id",
        expect.objectContaining({
          hearingListName: "LIST_TYPE_999"
        })
      );
    });

    it("should log notification errors with redacted emails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendLocationAndCaseSubscriptionNotifications).mockResolvedValue({
        totalSubscriptions: 2,
        sent: 0,
        failed: 2,
        skipped: 0,
        errors: [{ email: "user@example.com", error: "Invalid email" }, "Failed for test@domain.org"],
        notifiedUserIds: []
      });

      const result = await sendPublicationNotificationsForArtefact(baseParams);

      expect(result.success).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Publication] Notification errors:", {
        count: 2,
        errors: ['{"email":"[REDACTED_EMAIL]","error":"Invalid email"}', "Failed for [REDACTED_EMAIL]"]
      });

      consoleErrorSpy.mockRestore();
    });

    it("should handle notification service errors gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendLocationAndCaseSubscriptionNotifications).mockRejectedValue(new Error("Service unavailable"));

      const result = await sendPublicationNotificationsForArtefact(baseParams);

      expect(result).toEqual({ success: false });
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Publication] Failed to send notifications:", {
        artefactId: "test-artefact-id",
        error: "Service unavailable"
      });

      consoleErrorSpy.mockRestore();
    });

    it("should dispatch list type notifications when locale is provided", async () => {
      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendLocationAndCaseSubscriptionNotifications).mockResolvedValue({
        totalSubscriptions: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: ["user-1", "user-2"]
      });

      await sendPublicationNotificationsForArtefact({ ...baseParams, locale: "en" });

      expect(sendListTypePublicationNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          publicationId: "test-artefact-id",
          locationId: "123",
          locationName: "Test Court",
          listTypeId: 8,
          language: "ENGLISH"
        }),
        ["user-1", "user-2"]
      );
    });

    it("should map cy locale to WELSH for list type query", async () => {
      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendLocationAndCaseSubscriptionNotifications).mockResolvedValue({
        totalSubscriptions: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });

      await sendPublicationNotificationsForArtefact({ ...baseParams, locale: "cy" });

      expect(sendListTypePublicationNotifications).toHaveBeenCalledWith(expect.objectContaining({ language: "WELSH" }), []);
    });

    it("should not dispatch list type notifications when locale is not provided", async () => {
      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendLocationAndCaseSubscriptionNotifications).mockResolvedValue({
        totalSubscriptions: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });

      await sendPublicationNotificationsForArtefact(baseParams);

      expect(sendListTypePublicationNotifications).not.toHaveBeenCalled();
    });

    it("should log list type notification errors without failing the overall result", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendLocationAndCaseSubscriptionNotifications).mockResolvedValue({
        totalSubscriptions: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });
      vi.mocked(sendListTypePublicationNotifications).mockRejectedValue(new Error("List type service down"));

      const result = await sendPublicationNotificationsForArtefact({ ...baseParams, locale: "en" });

      expect(result.success).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Publication] Failed to send list type notifications:", {
        artefactId: "test-artefact-id",
        error: "List type service down"
      });

      consoleErrorSpy.mockRestore();
    });

    it("should log list type notification errors with redacted emails when they contain errors", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(getLocationById).mockResolvedValue({ id: 123, name: "Test Court", welshName: "Llys Prawf" });
      vi.mocked(sendLocationAndCaseSubscriptionNotifications).mockResolvedValue({
        totalSubscriptions: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });
      vi.mocked(sendListTypePublicationNotifications).mockResolvedValue({
        totalSubscriptions: 1,
        sent: 0,
        failed: 1,
        skipped: 0,
        errors: ["Failed for user@example.com"]
      });

      const result = await sendPublicationNotificationsForArtefact({ ...baseParams, locale: "en" });

      expect(result.success).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Publication] List type notification errors:", {
        count: 1,
        errors: ["Failed for [REDACTED_EMAIL]"]
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("processPublication", () => {
    const baseParams = {
      artefactId: "test-artefact-id",
      locationId: "123",
      listTypeId: 8,
      contentDate: new Date("2025-01-25"),
      locale: "en",
      jsonData: { courtLists: [] } as any,
      provenance: "MANUAL_UPLOAD"
    };

    it("should generate PDF and send notifications", async () => {
      vi.mocked(generateCauseListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/pdf",
        sizeBytes: 2048,
        exceedsMaxSize: false
      });
      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendLocationAndCaseSubscriptionNotifications).mockResolvedValue({
        totalSubscriptions: 5,
        sent: 5,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });

      const result = await processPublication(baseParams);

      expect(result).toEqual({
        pdfPath: "/path/to/pdf",
        pdfSizeBytes: 2048,
        pdfExceedsMaxSize: false,
        notificationsSent: 5,
        notificationsFailed: 0
      });
    });

    it("should call extractAndStoreArtefactSearch when jsonData is provided", async () => {
      vi.mocked(generateCauseListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });
      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });

      await processPublication(baseParams);

      expect(extractAndStoreArtefactSearch).toHaveBeenCalledWith("test-artefact-id", 8, baseParams.jsonData);
    });

    it("should not call extractAndStoreArtefactSearch when jsonData is not provided", async () => {
      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });

      await processPublication({ ...baseParams, jsonData: undefined });

      expect(extractAndStoreArtefactSearch).not.toHaveBeenCalled();
    });

    it("should continue with PDF generation and notifications when extractAndStoreArtefactSearch fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(extractAndStoreArtefactSearch).mockRejectedValue(new Error("Extraction failed"));
      vi.mocked(generateCauseListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });
      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });

      const result = await processPublication(baseParams);

      expect(result.pdfPath).toBe("/path/to/pdf");
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Publication] Failed to extract artefact search data:", {
        artefactId: "test-artefact-id",
        error: "Extraction failed"
      });

      consoleErrorSpy.mockRestore();
    });

    it("should skip PDF generation when jsonData is not provided", async () => {
      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendLocationAndCaseSubscriptionNotifications).mockResolvedValue({
        totalSubscriptions: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });

      const result = await processPublication({
        ...baseParams,
        jsonData: undefined
      });

      expect(generateCauseListPdf).not.toHaveBeenCalled();
      expect(result.pdfPath).toBeUndefined();
    });

    it("should skip notifications when skipNotifications is true", async () => {
      vi.mocked(generateCauseListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await processPublication({
        ...baseParams,
        skipNotifications: true
      });

      expect(sendLocationAndCaseSubscriptionNotifications).not.toHaveBeenCalled();
      expect(result.notificationsSent).toBeUndefined();
      expect(result.pdfPath).toBe("/path/to/pdf");
    });

    it("should pass PDF path to notifications", async () => {
      vi.mocked(generateCauseListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/generated/pdf/path",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });
      vi.mocked(getLocationById).mockResolvedValue({
        id: 123,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
      vi.mocked(sendLocationAndCaseSubscriptionNotifications).mockResolvedValue({
        totalSubscriptions: 1,
        sent: 1,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });

      await processPublication(baseParams);

      expect(sendLocationAndCaseSubscriptionNotifications).toHaveBeenCalledWith(
        "test-artefact-id",
        expect.objectContaining({
          pdfFilePath: "/generated/pdf/path"
        })
      );
    });
  });
});
