import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatePublicationExcel, generatePublicationPdf, processPublication, sendPublicationNotificationsForArtefact } from "./service.js";

const mockSendThirdPartyPublications = vi.hoisted(() => vi.fn());

vi.mock("@hmcts/care-standards-tribunal-weekly-hearing-list", () => ({
  generateCareStandardsTribunalWeeklyHearingListPdf: vi.fn()
}));

vi.mock("@hmcts/pht-weekly-hearing-list", () => ({
  generatePhtWeeklyHearingListPdf: vi.fn()
}));

vi.mock("@hmcts/sscs-daily-hearing-list", () => ({
  generateSscsDailyHearingListPdf: vi.fn(),
  importantInformationByListType: {
    SSCS_NORTH_EAST_DAILY_HEARING_LIST: "Important information for North East"
  }
}));

vi.mock("@hmcts/send-daily-hearing-list", () => ({
  generateSendDailyHearingListPdf: vi.fn()
}));

vi.mock("@hmcts/cic-weekly-hearing-list", () => ({
  generateCicWeeklyHearingListPdf: vi.fn()
}));

vi.mock("@hmcts/ast-daily-hearing-list", () => ({
  generateAstDailyHearingListPdf: vi.fn()
}));

vi.mock("@hmcts/upper-tribunal-administrative-appeals-chamber-daily-hearing-list", () => ({
  generateUtaacDailyHearingListPdf: vi.fn()
}));

vi.mock("@hmcts/upper-tribunal-lands-chamber-daily-hearing-list", () => ({
  generateUtlcDailyHearingListPdf: vi.fn()
}));

vi.mock("@hmcts/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list", () => ({
  generateUtccDailyHearingListPdf: vi.fn()
}));

vi.mock("@hmcts/civil-and-family-daily-cause-list", () => ({
  generateCauseListPdf: vi.fn()
}));

vi.mock("@hmcts/court-of-appeal-civil-daily-cause-list", () => ({
  generateCourtOfAppealCivilDailyCauseListPdf: vi.fn()
}));

vi.mock("@hmcts/excel-generation", () => ({
  generateSjpPublicListExcel: vi.fn().mockResolvedValue(Buffer.from("public-excel")),
  generateSjpPressListExcel: vi.fn().mockResolvedValue(Buffer.from("press-excel")),
  saveExcelFile: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("@hmcts/london-administrative-court-daily-cause-list", () => ({
  generateLondonAdministrativeCourtDailyCauseListPdf: vi.fn()
}));

vi.mock("@hmcts/sjp-public-list", () => ({
  generateSjpPublicListPdf: vi.fn()
}));

vi.mock("@hmcts/sjp-press-list", () => ({
  generateSjpPressListPdf: vi.fn()
}));

vi.mock("@hmcts/grc-weekly-hearing-list", () => ({
  generateGrcWeeklyHearingListPdf: vi.fn()
}));

vi.mock("@hmcts/wpafcc-weekly-hearing-list", () => ({
  generateWpafccWeeklyHearingListPdf: vi.fn()
}));

vi.mock("@hmcts/utiac-statutory-appeal-daily-hearing-list", () => ({
  generateUtiacStatutoryAppealDailyHearingListPdf: vi.fn()
}));

vi.mock("@hmcts/rcj-standard-daily-cause-list", () => ({
  generateRcjStandardDailyCauseListPdf: vi.fn()
}));

vi.mock("@hmcts/administrative-court-daily-cause-list", () => ({
  generateAdministrativeCourtDailyCauseListPdf: vi.fn()
}));

vi.mock("@hmcts/utiac-jr-daily-hearing-list", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/utiac-jr-daily-hearing-list")>();
  return {
    ...actual,
    generateUtiacJrLeedsDailyHearingListPdf: vi.fn(),
    generateUtiacJrLondonDailyHearingListPdf: vi.fn(),
    createUtiacJrDailyHearingListPdfGenerator: vi.fn()
  };
});
vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

vi.mock("@hmcts/notifications", () => ({
  sendLocationAndCaseSubscriptionNotifications: vi.fn(),
  sendListTypePublicationNotifications: vi.fn()
}));

vi.mock("@hmcts/crown-daily-list", () => ({
  generateCrownDailyListPdf: vi.fn()
}));

vi.mock("@hmcts/crown-firm-list", () => ({
  generateCrownFirmListPdf: vi.fn()
}));

vi.mock("@hmcts/crown-warned-list", () => ({
  generateCrownWarnedListPdf: vi.fn()
}));

vi.mock("@hmcts/civil-daily-cause-list", () => ({
  generateCivilDailyCauseListPdf: vi.fn()
}));

vi.mock("@hmcts/family-daily-cause-list", () => ({
  generateFamilyDailyCauseListPdf: vi.fn()
}));

vi.mock("@hmcts/siac-poac-paac-weekly-hearing-list", () => ({
  generateSiacPoacPaacWeeklyHearingListPdf: vi.fn()
}));

vi.mock("@hmcts/ftt-tax-chamber-weekly-hearing-list", () => ({
  generateFttTaxChamberWeeklyHearingListPdf: vi.fn()
}));

vi.mock("@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list", () => ({
  generateFttLrtWeeklyHearingListPdf: vi.fn()
}));

vi.mock("@hmcts/ftt-rpt-weekly-hearing-list", () => ({
  generateFttRptWeeklyHearingListPdf: vi.fn()
}));

vi.mock("@hmcts/magistrates-public-list", () => ({
  generateMagistratesPublicListPdf: vi.fn(),
  generateMagistratesPublicListExcel: vi.fn()
}));

vi.mock("@hmcts/excel-generation", () => ({
  generateSjpPublicListExcel: vi.fn(),
  generateSjpPressListExcel: vi.fn(),
  saveExcelFile: vi.fn()
}));

vi.mock("@hmcts/magistrates-standard-list", () => ({
  generateMagistratesStandardListPdf: vi.fn(),
  generateMagistratesStandardListExcel: vi.fn()
}));

vi.mock("@hmcts/magistrates-public-adult-court-list", () => ({
  generateMagistratesPublicAdultCourtListPdf: vi.fn()
}));

vi.mock("@hmcts/legacy-third-party-fulfilment", () => ({
  sendThirdPartyPublications: mockSendThirdPartyPublications
}));

vi.mock("../repository/queries.js", () => ({}));

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
  const { generateMagistratesPublicListPdf, generateMagistratesPublicListExcel } = await import("@hmcts/magistrates-public-list");
  const { generateMagistratesStandardListPdf, generateMagistratesStandardListExcel } = await import("@hmcts/magistrates-standard-list");
  const { generateCareStandardsTribunalWeeklyHearingListPdf } = await import("@hmcts/care-standards-tribunal-weekly-hearing-list");
  const { generateSscsDailyHearingListPdf } = await import("@hmcts/sscs-daily-hearing-list");
  const { generateUtaacDailyHearingListPdf } = await import("@hmcts/upper-tribunal-administrative-appeals-chamber-daily-hearing-list");
  const { generateUtlcDailyHearingListPdf } = await import("@hmcts/upper-tribunal-lands-chamber-daily-hearing-list");
  const { generateUtccDailyHearingListPdf } = await import("@hmcts/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list");
  const { generateCauseListPdf } = await import("@hmcts/civil-and-family-daily-cause-list");
  const { generateCourtOfAppealCivilDailyCauseListPdf } = await import("@hmcts/court-of-appeal-civil-daily-cause-list");
  const { generateSjpPublicListExcel, generateSjpPressListExcel, saveExcelFile } = await import("@hmcts/excel-generation");
  const { generateLondonAdministrativeCourtDailyCauseListPdf } = await import("@hmcts/london-administrative-court-daily-cause-list");
  const { generateSjpPublicListPdf } = await import("@hmcts/sjp-public-list");
  const { generateSjpPressListPdf } = await import("@hmcts/sjp-press-list");
  const { generateCrownDailyListPdf } = await import("@hmcts/crown-daily-list");
  const { generateCrownFirmListPdf } = await import("@hmcts/crown-firm-list");
  const { generateCrownWarnedListPdf } = await import("@hmcts/crown-warned-list");
  const { generateSendDailyHearingListPdf } = await import("@hmcts/send-daily-hearing-list");
  const { generateCicWeeklyHearingListPdf } = await import("@hmcts/cic-weekly-hearing-list");
  const { generateAstDailyHearingListPdf } = await import("@hmcts/ast-daily-hearing-list");
  const { generateGrcWeeklyHearingListPdf } = await import("@hmcts/grc-weekly-hearing-list");
  const { generateWpafccWeeklyHearingListPdf } = await import("@hmcts/wpafcc-weekly-hearing-list");
  const { generateUtiacStatutoryAppealDailyHearingListPdf } = await import("@hmcts/utiac-statutory-appeal-daily-hearing-list");
  const { generateUtiacJrLondonDailyHearingListPdf, generateUtiacJrLeedsDailyHearingListPdf, createUtiacJrDailyHearingListPdfGenerator } = await import(
    "@hmcts/utiac-jr-daily-hearing-list"
  );
  const { generateRcjStandardDailyCauseListPdf } = await import("@hmcts/rcj-standard-daily-cause-list");
  const { generateAdministrativeCourtDailyCauseListPdf } = await import("@hmcts/administrative-court-daily-cause-list");
  const { generatePhtWeeklyHearingListPdf } = await import("@hmcts/pht-weekly-hearing-list");
  const { generateCivilDailyCauseListPdf } = await import("@hmcts/civil-daily-cause-list");
  const { generateFamilyDailyCauseListPdf } = await import("@hmcts/family-daily-cause-list");
  const { generateSiacPoacPaacWeeklyHearingListPdf } = await import("@hmcts/siac-poac-paac-weekly-hearing-list");
  const { generateFttTaxChamberWeeklyHearingListPdf } = await import("@hmcts/ftt-tax-chamber-weekly-hearing-list");
  const { generateFttLrtWeeklyHearingListPdf } = await import("@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list");
  const { generateFttRptWeeklyHearingListPdf } = await import("@hmcts/ftt-rpt-weekly-hearing-list");
  const { generateMagistratesPublicAdultCourtListPdf } = await import("@hmcts/magistrates-public-adult-court-list");
  const { getLocationById } = await import("@hmcts/location");
  const { sendLocationAndCaseSubscriptionNotifications, sendListTypePublicationNotifications } = await import("@hmcts/notifications");
  const { prisma } = await import("@hmcts/postgres-prisma");
  const { extractAndStoreArtefactSearch } = await import("../artefact-search-extractor.js");

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendThirdPartyPublications.mockResolvedValue(undefined);
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

      expect(result).not.toHaveProperty("pdfPath");
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
      expect(result).toEqual(
        expect.objectContaining({
          pdfPath: "/path/to/pdf",
          sizeBytes: 1024,
          exceedsMaxSize: false
        })
      );
    });

    it("should return empty result when PDF generation fails", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      vi.mocked(generateCauseListPdf).mockResolvedValue({
        success: false,
        error: "Generation failed"
      });

      const result = await generatePublicationPdf(baseParams);

      expect(result).not.toHaveProperty("pdfPath");
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

      expect(result).not.toHaveProperty("pdfPath");
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
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/london-pdf", sizeBytes: 1024, exceedsMaxSize: false }));
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
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/coa-pdf", sizeBytes: 2048, exceedsMaxSize: false }));
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
      expect(result).toEqual(
        expect.objectContaining({
          pdfPath: "/path/to/cst-pdf",
          sizeBytes: 2048,
          exceedsMaxSize: false
        })
      );
    });

    it("should generate PDF for SJP Public List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "SJP_PUBLIC_LIST",
        friendlyName: "SJP Public List"
      } as any);
      vi.mocked(generateSjpPublicListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/sjp-public-pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 25 });

      expect(generateSjpPublicListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/sjp-public-pdf", sizeBytes: 1024, exceedsMaxSize: false }));
    });

    it("should generate PDF for SJP Delta Public List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "SJP_DELTA_PUBLIC_LIST",
        friendlyName: "SJP Delta Public List"
      } as any);
      vi.mocked(generateSjpPublicListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/sjp-delta-public-pdf",
        sizeBytes: 512,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 27 });

      expect(generateSjpPublicListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/sjp-delta-public-pdf", sizeBytes: 512, exceedsMaxSize: false }));
    });

    it("should generate PDF for SJP Press List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "SJP_PRESS_LIST",
        friendlyName: "SJP Press List"
      } as any);
      vi.mocked(generateSjpPressListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/sjp-press-pdf",
        sizeBytes: 2048,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 24 });

      expect(generateSjpPressListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/sjp-press-pdf", sizeBytes: 2048, exceedsMaxSize: false }));
    });

    it("should generate PDF for SJP Delta Press List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "SJP_DELTA_PRESS_LIST",
        friendlyName: "SJP Delta Press List"
      } as any);
      vi.mocked(generateSjpPressListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/sjp-delta-press-pdf",
        sizeBytes: 1536,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 26 });

      expect(generateSjpPressListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/sjp-delta-press-pdf", sizeBytes: 1536, exceedsMaxSize: false }));
    });

    it("should generate PDF for Crown Daily List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "CROWN_DAILY_LIST",
        friendlyName: "Crown Daily List"
      } as any);
      vi.mocked(generateCrownDailyListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/crown-daily.pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 20 });

      expect(generateCrownDailyListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/crown-daily.pdf", sizeBytes: 1024, exceedsMaxSize: false }));
    });

    it("should generate PDF for Crown Firm List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "CROWN_FIRM_LIST",
        friendlyName: "Crown Firm List"
      } as any);
      vi.mocked(generateCrownFirmListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/crown-firm.pdf",
        sizeBytes: 2048,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 21 });

      expect(generateCrownFirmListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/crown-firm.pdf", sizeBytes: 2048, exceedsMaxSize: false }));
    });

    it("should generate PDF for Crown Warned List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "CROWN_WARNED_LIST",
        friendlyName: "Crown Warned List"
      } as any);
      vi.mocked(generateCrownWarnedListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/crown-warned.pdf",
        sizeBytes: 3072,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 22 });

      expect(generateCrownWarnedListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/crown-warned.pdf", sizeBytes: 3072, exceedsMaxSize: false }));
    });

    it("should generate PDF for SSCS North East Daily Hearing List with English friendly name", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "SSCS_NORTH_EAST_DAILY_HEARING_LIST",
        friendlyName: "North East Social Security and Child Support Tribunal Daily Hearing List"
      } as any);
      vi.mocked(generateSscsDailyHearingListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/sscs-pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 53, locale: "en" });

      expect(generateSscsDailyHearingListPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          listTitle: "North East Social Security and Child Support Tribunal Daily Hearing List",
          courtName: "North East Social Security and Child Support Tribunal Daily Hearing List",
          importantInformationText: "Important information for North East"
        })
      );
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/sscs-pdf", sizeBytes: 1024, exceedsMaxSize: false }));
    });

    it("should generate PDF for SSCS Daily Hearing List with Welsh friendly name", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "SSCS_NORTH_EAST_DAILY_HEARING_LIST",
        friendlyName: "North East Social Security and Child Support Tribunal Daily Hearing List"
      } as any);
      vi.mocked(generateSscsDailyHearingListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/sscs-pdf-cy",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 53, locale: "cy" });

      expect(generateSscsDailyHearingListPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          listTitle: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Gogledd Ddwyrain Lloegr",
          courtName: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Nawdd Cymdeithasol a Chynhaliaeth Plant Gogledd Ddwyrain Lloegr"
        })
      );
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/sscs-pdf-cy", sizeBytes: 1024, exceedsMaxSize: false }));
    });

    it("should generate PDF for SEND Daily Hearing List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "SEND_DAILY_HEARING_LIST",
        friendlyName: "SEND Daily Hearing List"
      } as any);
      vi.mocked(generateSendDailyHearingListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/send-pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 13 });

      expect(generateSendDailyHearingListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/send-pdf", sizeBytes: 1024, exceedsMaxSize: false }));
    });

    it("should generate PDF for CIC Weekly Hearing List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "CIC_WEEKLY_HEARING_LIST",
        friendlyName: "CIC Weekly Hearing List"
      } as any);
      vi.mocked(generateCicWeeklyHearingListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/cic-pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 14 });

      expect(generateCicWeeklyHearingListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/cic-pdf", sizeBytes: 1024, exceedsMaxSize: false }));
    });

    it("should generate PDF for AST Daily Hearing List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "AST_DAILY_HEARING_LIST",
        friendlyName: "AST Daily Hearing List"
      } as any);
      vi.mocked(generateAstDailyHearingListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/ast-pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 15 });

      expect(generateAstDailyHearingListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/ast-pdf", sizeBytes: 1024, exceedsMaxSize: false }));
    });

    it("should generate PDF for GRC Weekly Hearing List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "GRC_WEEKLY_HEARING_LIST",
        friendlyName: "GRC Weekly Hearing List"
      } as any);
      vi.mocked(generateGrcWeeklyHearingListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/grc-pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 41 });

      expect(generateGrcWeeklyHearingListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/grc-pdf", sizeBytes: 1024, exceedsMaxSize: false }));
    });

    it("should generate PDF for WPAFCC Weekly Hearing List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "WPAFCC_WEEKLY_HEARING_LIST",
        friendlyName: "WPAFCC Weekly Hearing List"
      } as any);
      vi.mocked(generateWpafccWeeklyHearingListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/wpafcc-pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 42 });

      expect(generateWpafccWeeklyHearingListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/wpafcc-pdf", sizeBytes: 1024, exceedsMaxSize: false }));
    });

    it("should generate PDF for UTIAC Statutory Appeal Daily Hearing List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST",
        friendlyName: "UTIAC Statutory Appeal Daily Hearing List"
      } as any);
      vi.mocked(generateUtiacStatutoryAppealDailyHearingListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/utiac-statutory-pdf",
        sizeBytes: 2048,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 43 });

      expect(generateUtiacStatutoryAppealDailyHearingListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/utiac-statutory-pdf", sizeBytes: 2048, exceedsMaxSize: false }));
    });

    it("should generate PDF for UTIAC JR London Daily Hearing List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "UTIAC_JR_LONDON_DAILY_HEARING_LIST",
        friendlyName: "UTIAC JR London Daily Hearing List"
      } as any);
      vi.mocked(generateUtiacJrLondonDailyHearingListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/utiac-london-pdf",
        sizeBytes: 2048,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 44 });

      expect(generateUtiacJrLondonDailyHearingListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/utiac-london-pdf", sizeBytes: 2048, exceedsMaxSize: false }));
    });

    it("should generate PDF for UTIAC JR Leeds Daily Hearing List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "UTIAC_JR_LEEDS_DAILY_HEARING_LIST",
        friendlyName: "UTIAC JR Leeds Daily Hearing List"
      } as any);
      vi.mocked(generateUtiacJrLeedsDailyHearingListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/utiac-leeds-pdf",
        sizeBytes: 2048,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 45 });

      expect(generateUtiacJrLeedsDailyHearingListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/utiac-leeds-pdf", sizeBytes: 2048, exceedsMaxSize: false }));
    });

    it("should generate PDF for UT Tax and Chancery Chamber Daily Hearing List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST",
        friendlyName: "Upper Tribunal Tax and Chancery Chamber Daily Hearing List"
      } as any);
      vi.mocked(generateUtccDailyHearingListPdf).mockResolvedValue({
        success: true,
        pdfPath: "test.pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 12 });

      expect(generateUtccDailyHearingListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "test.pdf", sizeBytes: 1024, exceedsMaxSize: false }));
    });

    it("should generate PDF for UT Lands Chamber Daily Hearing List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "UT_LANDS_CHAMBER_DAILY_HEARING_LIST",
        friendlyName: "Upper Tribunal Lands Chamber Daily Hearing List"
      } as any);
      vi.mocked(generateUtlcDailyHearingListPdf).mockResolvedValue({
        success: true,
        pdfPath: "test.pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 13 });

      expect(generateUtlcDailyHearingListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "test.pdf", sizeBytes: 1024, exceedsMaxSize: false }));
    });

    it("should generate PDF for UT Administrative Appeals Chamber Daily Hearing List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST",
        friendlyName: "Upper Tribunal Administrative Appeals Chamber Daily Hearing List"
      } as any);
      vi.mocked(generateUtaacDailyHearingListPdf).mockResolvedValue({
        success: true,
        pdfPath: "test.pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 14 });

      expect(generateUtaacDailyHearingListPdf).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "test.pdf", sizeBytes: 1024, exceedsMaxSize: false }));
    });

    it("should generate PDF for RCJ Standard Daily Cause List via rcjStandardGenerator", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST",
        friendlyName: "Civil Courts RCJ Daily Cause List"
      } as any);
      vi.mocked(generateRcjStandardDailyCauseListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/rcj-pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 50 });

      expect(generateRcjStandardDailyCauseListPdf).toHaveBeenCalledWith(expect.objectContaining({ listTypeName: "CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST" }));
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/rcj-pdf", sizeBytes: 1024, exceedsMaxSize: false }));
    });

    it("should generate PDF for Birmingham Administrative Court via adminCourtGenerator", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        name: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
        friendlyName: "Birmingham Administrative Court Daily Cause List"
      } as any);
      vi.mocked(generateAdministrativeCourtDailyCauseListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/path/to/admin-court-pdf",
        sizeBytes: 2048,
        exceedsMaxSize: false
      });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 60 });

      expect(generateAdministrativeCourtDailyCauseListPdf).toHaveBeenCalledWith(
        expect.objectContaining({ listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST" })
      );
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/to/admin-court-pdf", sizeBytes: 2048, exceedsMaxSize: false }));
    });

    it.each([
      ["CIVIL_DAILY_CAUSE_LIST", "Civil Daily Cause List"],
      ["FAMILY_DAILY_CAUSE_LIST", "Family Daily Cause List"],
      ["FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST", "FTT Tax Chamber Weekly Hearing List"],
      ["FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST", "FTT LRT Weekly Hearing List"],
      ["MAGISTRATES_STANDARD_LIST", "Magistrates Standard List"],
      ["MAGISTRATES_PUBLIC_LIST", "Magistrates Public List"]
    ])("should route %s to the correct generator", async (listTypeName, friendlyName) => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: listTypeName, friendlyName } as any);
      const genMockMap: Record<string, ReturnType<typeof vi.fn>> = {
        CIVIL_DAILY_CAUSE_LIST: vi.mocked(generateCivilDailyCauseListPdf),
        FAMILY_DAILY_CAUSE_LIST: vi.mocked(generateFamilyDailyCauseListPdf),
        FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST: vi.mocked(generateFttTaxChamberWeeklyHearingListPdf),
        FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST: vi.mocked(generateFttLrtWeeklyHearingListPdf),
        MAGISTRATES_STANDARD_LIST: vi.mocked(generateMagistratesStandardListPdf),
        MAGISTRATES_PUBLIC_LIST: vi.mocked(generateMagistratesPublicListPdf)
      };
      genMockMap[listTypeName].mockResolvedValue({ success: true, pdfPath: "/test.pdf", sizeBytes: 1024, exceedsMaxSize: false });

      const result = await generatePublicationPdf({ ...baseParams });

      expect(genMockMap[listTypeName]).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/test.pdf", sizeBytes: 1024, exceedsMaxSize: false }));
    });

    it.each([
      ["SIAC_WEEKLY_HEARING_LIST", "Special Immigration Appeals Commission", "Special Immigration Appeals Commission Weekly Hearing List"],
      ["POAC_WEEKLY_HEARING_LIST", "Proscribed Organisations Appeal Commission", "Proscribed Organisations Appeal Commission Weekly Hearing List"],
      ["PAAC_WEEKLY_HEARING_LIST", "Pathogens Access Appeal Commission", "Pathogens Access Appeal Commission Weekly Hearing List"]
    ])("should generate PDF for %s with correct courtName and listTitle", async (listTypeName, expectedCourtName, expectedListTitle) => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: listTypeName, friendlyName: listTypeName } as any);
      vi.mocked(generateSiacPoacPaacWeeklyHearingListPdf).mockResolvedValue({ success: true, pdfPath: "/test.pdf", sizeBytes: 1024, exceedsMaxSize: false });

      await generatePublicationPdf({ ...baseParams });

      expect(generateSiacPoacPaacWeeklyHearingListPdf).toHaveBeenCalledWith(
        expect.objectContaining({ courtName: expectedCourtName, listTitle: expectedListTitle })
      );
    });

    it.each([
      ["FTT_RPT_EASTERN_WEEKLY_HEARING_LIST", "First-tier Tribunal (Residential Property Tribunal): Eastern region Weekly Hearing List"],
      ["FTT_RPT_LONDON_WEEKLY_HEARING_LIST", "First-tier Tribunal (Residential Property Tribunal): London region Weekly Hearing List"],
      ["FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST", "First-tier Tribunal (Residential Property Tribunal): Midlands region Weekly Hearing List"],
      ["FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST", "First-tier Tribunal (Residential Property Tribunal): Northern region Weekly Hearing List"],
      ["FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST", "First-tier Tribunal (Residential Property Tribunal): Southern region Weekly Hearing List"]
    ])("should generate PDF for %s with correct listTitle", async (listTypeName, expectedListTitle) => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: listTypeName, friendlyName: listTypeName } as any);
      vi.mocked(generateFttRptWeeklyHearingListPdf).mockResolvedValue({ success: true, pdfPath: "/test.pdf", sizeBytes: 1024, exceedsMaxSize: false });

      await generatePublicationPdf({ ...baseParams });

      expect(generateFttRptWeeklyHearingListPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          courtName: "First-tier Tribunal (Residential Property Tribunal)",
          listTitle: expectedListTitle
        })
      );
    });

    it.each([
      ["MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY", "Magistrates Public Adult Court List - Daily"],
      ["MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE", "Magistrates Public Adult Court List - Future"]
    ])("should generate PDF for %s with correct listTitle", async (listTypeName, expectedListTitle) => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: listTypeName, friendlyName: listTypeName } as any);
      vi.mocked(generateMagistratesPublicAdultCourtListPdf).mockResolvedValue({ success: true, pdfPath: "/test.pdf", sizeBytes: 1024, exceedsMaxSize: false });

      await generatePublicationPdf({ ...baseParams });

      expect(generateMagistratesPublicAdultCourtListPdf).toHaveBeenCalledWith(expect.objectContaining({ listTitle: expectedListTitle }));
    });

    it.each([
      ["UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST", "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Manchester Daily Hearing List"],
      ["UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST", "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Birmingham Daily Hearing List"],
      ["UTIAC_JR_CARDIFF_DAILY_HEARING_LIST", "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Cardiff Daily Hearing List"]
    ])("should generate PDF for %s via createUtiacJrDailyHearingListPdfGenerator", async (listTypeName, expectedTitle) => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: listTypeName, friendlyName: listTypeName } as any);
      const innerGenerator = vi.fn().mockResolvedValue({ success: true, pdfPath: "/test.pdf", sizeBytes: 1024, exceedsMaxSize: false });
      vi.mocked(createUtiacJrDailyHearingListPdfGenerator).mockReturnValue(innerGenerator);

      const result = await generatePublicationPdf({ ...baseParams });

      expect(createUtiacJrDailyHearingListPdfGenerator).toHaveBeenCalledWith(expectedTitle);
      expect(innerGenerator).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/test.pdf", sizeBytes: 1024, exceedsMaxSize: false }));
    });

    it("should return empty result when list type DB lookup returns null", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(null);

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 9999 });

      expect(result).not.toHaveProperty("pdfPath");
    });

    it("should generate PDF for PHT Weekly Hearing List", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "PHT_WEEKLY_HEARING_LIST", friendlyName: "PHT Weekly Hearing List" } as any);
      vi.mocked(generatePhtWeeklyHearingListPdf).mockResolvedValue({ success: true, pdfPath: "/path/pht.pdf", sizeBytes: 1024, exceedsMaxSize: false });

      const result = await generatePublicationPdf({ ...baseParams, listTypeId: 60 });

      expect(generatePhtWeeklyHearingListPdf).toHaveBeenCalledWith(expect.objectContaining({ artefactId: "test-artefact-id" }));
      expect(result).toEqual(expect.objectContaining({ pdfPath: "/path/pht.pdf", sizeBytes: 1024, exceedsMaxSize: false }));
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

    it("should call Excel generation for SJP public list types", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "SJP_PUBLIC_LIST", friendlyName: "SJP Public List" } as any);
      vi.mocked(getLocationById).mockResolvedValue({ id: 123, name: "Test Court", welshName: "Llys Prawf" });

      await processPublication({ ...baseParams, listTypeId: 25 });

      expect(generateSjpPublicListExcel).toHaveBeenCalledWith(baseParams.jsonData);
      expect(saveExcelFile).toHaveBeenCalledWith("test-artefact-id", expect.any(Buffer));
    });

    it("should call Excel generation for SJP press list types", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "SJP_PRESS_LIST", friendlyName: "SJP Press List" } as any);
      vi.mocked(getLocationById).mockResolvedValue({ id: 123, name: "Test Court", welshName: "Llys Prawf" });

      await processPublication({ ...baseParams, listTypeId: 24 });

      expect(generateSjpPressListExcel).toHaveBeenCalledWith(baseParams.jsonData);
      expect(saveExcelFile).toHaveBeenCalledWith("test-artefact-id", expect.any(Buffer));
    });

    it("should not call Excel generation for non-SJP list types", async () => {
      vi.mocked(generateCauseListPdf).mockResolvedValue({ success: true, pdfPath: "/path/to/pdf", sizeBytes: 1024, exceedsMaxSize: false });
      vi.mocked(getLocationById).mockResolvedValue({ id: 123, name: "Test Court", welshName: "Llys Prawf" });

      await processPublication(baseParams);

      expect(generateSjpPublicListExcel).not.toHaveBeenCalled();
      expect(generateSjpPressListExcel).not.toHaveBeenCalled();
    });

    it("passes isUpdate: false by default", async () => {
      await processPublication({ ...baseParams, skipNotifications: true });

      expect(mockSendThirdPartyPublications).toHaveBeenCalledWith(expect.objectContaining({ isUpdate: false }));
    });

    it("passes isUpdate: true when isUpdate is true in params", async () => {
      await processPublication({ ...baseParams, skipNotifications: true, isUpdate: true });

      expect(mockSendThirdPartyPublications).toHaveBeenCalledWith(expect.objectContaining({ isUpdate: true }));
    });

    it("does not call sendThirdPartyPublications when skipThirdPartyPush is true", async () => {
      await processPublication({ ...baseParams, skipThirdPartyPush: true });

      expect(mockSendThirdPartyPublications).not.toHaveBeenCalled();
    });

    it("passes generated pdfPath to sendThirdPartyPublications", async () => {
      vi.mocked(generateCauseListPdf).mockResolvedValue({
        success: true,
        pdfPath: "/generated/publication.pdf",
        sizeBytes: 1024,
        exceedsMaxSize: false
      });

      await processPublication({ ...baseParams, skipNotifications: true });

      expect(mockSendThirdPartyPublications).toHaveBeenCalledWith(expect.objectContaining({ pdfPath: "/generated/publication.pdf" }));
    });

    it("passes undefined pdfPath to sendThirdPartyPublications when PDF generation is skipped", async () => {
      await processPublication({ ...baseParams, jsonData: undefined, skipNotifications: true });

      expect(mockSendThirdPartyPublications).toHaveBeenCalledWith(expect.objectContaining({ pdfPath: undefined }));
    });

    it("forwards flatFilePath to sendThirdPartyPublications when provided", async () => {
      await processPublication({ ...baseParams, jsonData: undefined, skipNotifications: true, flatFilePath: "/tmp/artefact.xlsx" });

      expect(mockSendThirdPartyPublications).toHaveBeenCalledWith(expect.objectContaining({ flatFilePath: "/tmp/artefact.xlsx" }));
    });

    it("forwards undefined flatFilePath to sendThirdPartyPublications when not provided", async () => {
      await processPublication({ ...baseParams, skipNotifications: true });

      expect(mockSendThirdPartyPublications).toHaveBeenCalledWith(expect.objectContaining({ flatFilePath: undefined }));
    });

    it("logs error when sendThirdPartyPublications rejects", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockSendThirdPartyPublications.mockRejectedValue(new Error("Third-party service down"));

      await processPublication({ ...baseParams, skipNotifications: true, jsonData: undefined });
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleErrorSpy).toHaveBeenCalledWith("[Publication] Third-party push failed:", expect.any(Error));
      consoleErrorSpy.mockRestore();
    });

    it("should call Excel generator for MAGISTRATES_PUBLIC_LIST and derive excelPath", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "MAGISTRATES_PUBLIC_LIST", friendlyName: "Magistrates Public List" } as any);
      vi.mocked(generateMagistratesPublicListPdf).mockResolvedValue({ success: true, pdfPath: "/path/to/mpl.pdf", sizeBytes: 1024, exceedsMaxSize: false });
      vi.mocked(generateMagistratesPublicListExcel).mockResolvedValue({ success: true, excelPath: "test-artefact-id.xlsx" });
      vi.mocked(getLocationById).mockResolvedValue({ id: 123, name: "Test Court", welshName: "Llys Prawf" });
      vi.mocked(sendLocationAndCaseSubscriptionNotifications).mockResolvedValue({
        totalSubscriptions: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });

      const result = await processPublication({ ...baseParams, listTypeId: 999 });

      expect(generateMagistratesPublicListExcel).toHaveBeenCalledWith(
        expect.objectContaining({ artefactId: "test-artefact-id", listTypeName: "MAGISTRATES_PUBLIC_LIST" })
      );
      expect(result.excelPath).toBe("test-artefact-id.xlsx");
      expect(sendListTypePublicationNotifications).toHaveBeenCalledWith(expect.objectContaining({ excelPath: "test-artefact-id.xlsx" }), expect.anything());
    });

    it("should call Excel generator for MAGISTRATES_STANDARD_LIST and derive excelPath", async () => {
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "MAGISTRATES_STANDARD_LIST", friendlyName: "Magistrates Standard List" } as any);
      vi.mocked(generateMagistratesStandardListPdf).mockResolvedValue({ success: true, pdfPath: "/path/to/msl.pdf", sizeBytes: 1024, exceedsMaxSize: false });
      vi.mocked(generateMagistratesStandardListExcel).mockResolvedValue({ success: true, excelPath: "test-artefact-id.xlsx" });
      vi.mocked(getLocationById).mockResolvedValue({ id: 123, name: "Test Court", welshName: "Llys Prawf" });
      vi.mocked(sendLocationAndCaseSubscriptionNotifications).mockResolvedValue({
        totalSubscriptions: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });

      const result = await processPublication({ ...baseParams, listTypeId: 999 });

      expect(generateMagistratesStandardListExcel).toHaveBeenCalledWith(
        expect.objectContaining({ artefactId: "test-artefact-id", listTypeName: "MAGISTRATES_STANDARD_LIST" })
      );
      expect(result.excelPath).toBe("test-artefact-id.xlsx");
      expect(sendListTypePublicationNotifications).toHaveBeenCalledWith(expect.objectContaining({ excelPath: "test-artefact-id.xlsx" }), expect.anything());
    });

    it("should not fail when Excel generation returns an error", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "MAGISTRATES_PUBLIC_LIST", friendlyName: "Magistrates Public List" } as any);
      vi.mocked(generateMagistratesPublicListPdf).mockResolvedValue({ success: true, pdfPath: "/path/to/mpl.pdf", sizeBytes: 1024, exceedsMaxSize: false });
      vi.mocked(generateMagistratesPublicListExcel).mockResolvedValue({ success: false, error: "Excel generation failed" });
      vi.mocked(getLocationById).mockResolvedValue({ id: 123, name: "Test Court", welshName: "Llys Prawf" });
      vi.mocked(sendLocationAndCaseSubscriptionNotifications).mockResolvedValue({
        totalSubscriptions: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });

      const result = await processPublication({ ...baseParams, listTypeId: 999 });

      expect(result.pdfPath).toBe("/path/to/mpl.pdf");
      expect(result.excelPath).toBeUndefined();
      consoleWarnSpy.mockRestore();
    });
  });

  describe("generatePublicationExcel", () => {
    it("should return empty result for unsupported list type name", async () => {
      const result = await generatePublicationExcel({
        artefactId: "test-id",
        listTypeName: "UNSUPPORTED_LIST_TYPE",
        contentDate: new Date(),
        locale: "en",
        locationId: "123",
        jsonData: {}
      });

      expect(result).toEqual({});
    });

    it("should return hasExcel for MAGISTRATES_PUBLIC_LIST when generator succeeds", async () => {
      vi.mocked(generateMagistratesPublicListExcel).mockResolvedValue({ success: true, excelPath: "abc.xlsx" });

      const result = await generatePublicationExcel({
        artefactId: "test-id",
        listTypeName: "MAGISTRATES_PUBLIC_LIST",
        contentDate: new Date(),
        locale: "en",
        locationId: "123",
        jsonData: {}
      });

      expect(result).toEqual({ hasExcel: true });
    });

    it("should return hasExcel for MAGISTRATES_STANDARD_LIST when generator succeeds", async () => {
      vi.mocked(generateMagistratesStandardListExcel).mockResolvedValue({ success: true, excelPath: "def.xlsx" });

      const result = await generatePublicationExcel({
        artefactId: "test-id",
        listTypeName: "MAGISTRATES_STANDARD_LIST",
        contentDate: new Date(),
        locale: "en",
        locationId: "123",
        jsonData: {}
      });

      expect(result).toEqual({ hasExcel: true });
    });

    it("should return empty result and log warning when generator reports failure", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.mocked(generateMagistratesPublicListExcel).mockResolvedValue({ success: false, error: "Something went wrong" });

      const result = await generatePublicationExcel({
        artefactId: "test-id",
        listTypeName: "MAGISTRATES_PUBLIC_LIST",
        contentDate: new Date(),
        locale: "en",
        locationId: "123",
        jsonData: {}
      });

      expect(result).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalledWith("[Publication] Excel generation failed:", { artefactId: "test-id", error: "Something went wrong" });
      consoleWarnSpy.mockRestore();
    });

    it("should return empty result and log error when generator throws", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(generateMagistratesPublicListExcel).mockRejectedValue(new Error("Crash"));

      const result = await generatePublicationExcel({
        artefactId: "test-id",
        listTypeName: "MAGISTRATES_PUBLIC_LIST",
        contentDate: new Date(),
        locale: "en",
        locationId: "123",
        jsonData: {}
      });

      expect(result).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Publication] Excel generation error:", { artefactId: "test-id", error: "Crash" });
      consoleErrorSpy.mockRestore();
    });

    it("should return hasExcel for SJP_PUBLIC_LIST when generator succeeds", async () => {
      const { generateSjpPublicListExcel, saveExcelFile } = await import("@hmcts/excel-generation");
      vi.mocked(generateSjpPublicListExcel).mockResolvedValue(Buffer.from("xlsx"));
      vi.mocked(saveExcelFile).mockResolvedValue(undefined);

      const result = await generatePublicationExcel({
        artefactId: "sjp-id",
        listTypeName: "SJP_PUBLIC_LIST",
        contentDate: new Date(),
        locale: "en",
        locationId: "123",
        jsonData: {}
      });

      expect(result).toEqual({ hasExcel: true });
    });

    it("should return empty result when SJP_PUBLIC_LIST adapter throws", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { generateSjpPublicListExcel } = await import("@hmcts/excel-generation");
      vi.mocked(generateSjpPublicListExcel).mockRejectedValue(new Error("SJP crash"));

      const result = await generatePublicationExcel({
        artefactId: "sjp-id",
        listTypeName: "SJP_PUBLIC_LIST",
        contentDate: new Date(),
        locale: "en",
        locationId: "123",
        jsonData: {}
      });

      expect(result).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Publication] Excel generation error:", { artefactId: "sjp-id", error: "SJP crash" });
      consoleErrorSpy.mockRestore();
    });
  });

  describe("generatePublicationExcel", () => {
    it("should generate and save Excel for SJP_PUBLIC_LIST", async () => {
      await generatePublicationExcel({ artefactId: "artefact-1", listTypeName: "SJP_PUBLIC_LIST", jsonData: { courtLists: [] } });

      expect(generateSjpPublicListExcel).toHaveBeenCalledWith({ courtLists: [] });
      expect(saveExcelFile).toHaveBeenCalledWith("artefact-1", expect.any(Buffer));
    });

    it("should generate and save Excel for SJP_DELTA_PUBLIC_LIST", async () => {
      await generatePublicationExcel({ artefactId: "artefact-2", listTypeName: "SJP_DELTA_PUBLIC_LIST", jsonData: { courtLists: [] } });

      expect(generateSjpPublicListExcel).toHaveBeenCalledWith({ courtLists: [] });
      expect(saveExcelFile).toHaveBeenCalledWith("artefact-2", expect.any(Buffer));
    });

    it("should generate and save Excel for SJP_PRESS_LIST", async () => {
      await generatePublicationExcel({ artefactId: "artefact-3", listTypeName: "SJP_PRESS_LIST", jsonData: { courtLists: [] } });

      expect(generateSjpPressListExcel).toHaveBeenCalledWith({ courtLists: [] });
      expect(saveExcelFile).toHaveBeenCalledWith("artefact-3", expect.any(Buffer));
    });

    it("should generate and save Excel for SJP_DELTA_PRESS_LIST", async () => {
      await generatePublicationExcel({ artefactId: "artefact-4", listTypeName: "SJP_DELTA_PRESS_LIST", jsonData: { courtLists: [] } });

      expect(generateSjpPressListExcel).toHaveBeenCalledWith({ courtLists: [] });
      expect(saveExcelFile).toHaveBeenCalledWith("artefact-4", expect.any(Buffer));
    });

    it("should not generate Excel for non-SJP list types", async () => {
      await generatePublicationExcel({ artefactId: "artefact-5", listTypeName: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST", jsonData: { courtLists: [] } });

      expect(generateSjpPublicListExcel).not.toHaveBeenCalled();
      expect(generateSjpPressListExcel).not.toHaveBeenCalled();
      expect(saveExcelFile).not.toHaveBeenCalled();
    });

    it("should log error but not throw when Excel generation fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(generateSjpPublicListExcel).mockRejectedValue(new Error("Excel generation failed"));

      await generatePublicationExcel({ artefactId: "artefact-6", listTypeName: "SJP_PUBLIC_LIST", jsonData: { courtLists: [] } });

      expect(consoleErrorSpy).toHaveBeenCalledWith("[Publication] Excel generation error:", {
        artefactId: "artefact-6",
        error: "Excel generation failed"
      });
      consoleErrorSpy.mockRestore();
    });

    it("should not generate Excel for unknown list type", async () => {
      await generatePublicationExcel({ artefactId: "artefact-7", listTypeName: "UNKNOWN_LIST_TYPE", jsonData: { courtLists: [] } });

      expect(generateSjpPublicListExcel).not.toHaveBeenCalled();
      expect(generateSjpPressListExcel).not.toHaveBeenCalled();
      expect(saveExcelFile).not.toHaveBeenCalled();
    });
  });
});
