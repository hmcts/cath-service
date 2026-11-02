import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdministrativeCourtHearingList } from "../models/types.js";

const { mockUploadBlob } = vi.hoisted(() => ({
  mockUploadBlob: vi.fn()
}));
vi.mock("@hmcts/azure-blob", () => ({
  uploadBlob: mockUploadBlob,
  CONTAINER: { ARTEFACT: "artefact", PUBLICATIONS: "publications" }
}));

vi.mock("@hmcts/pdf-generation", () => ({
  generatePdfFromHtml: vi.fn()
}));

vi.mock("../rendering/renderer.js", () => ({
  renderAdminCourt: vi.fn()
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import { renderAdminCourt } from "../rendering/renderer.js";
import { generateAdministrativeCourtDailyCauseListPdf } from "./pdf-generator.js";

const LIST_TYPE_NAMES = [
  "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
  "LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
  "BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
  "MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
] as const;

const mockRenderedData = {
  header: {
    listTitle: "Administrative Court Daily Cause List",
    listDate: "01 January 2025",
    lastUpdatedDate: "12 November 2025",
    lastUpdatedTime: "9am"
  },
  hearings: []
};

const mockHearingList: AdministrativeCourtHearingList = [
  {
    venue: "Royal Courts of Justice",
    judge: "Judge Smith",
    time: "10:00",
    caseNumber: "CO/1234/2025",
    caseDetails: "R (Smith) v Secretary of State",
    hearingType: "Judicial Review",
    additionalInformation: ""
  }
];

describe("generateAdministrativeCourtDailyCauseListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderAdminCourt).mockReturnValue(mockRenderedData);
    mockUploadBlob.mockResolvedValue(undefined);
  });

  it("should generate PDF successfully", async () => {
    const pdfBuffer = Buffer.from("PDF content");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer,
      sizeBytes: 1024
    });

    const result = await generateAdministrativeCourtDailyCauseListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      listTypeName: "BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
    });

    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("test-artefact-123.pdf");
  });

  it("should pass correct render options to renderer", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    const contentDate = new Date("2025-06-15");

    await generateAdministrativeCourtDailyCauseListPdf({
      artefactId: "test-render-options",
      contentDate,
      locale: "en",
      locationId: "999",
      jsonData: mockHearingList,
      listTypeName: "BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
    });

    expect(renderAdminCourt).toHaveBeenCalledWith(mockHearingList, {
      locale: "en",
      listTypeName: "BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
      listTitle: "Bristol and Cardiff Administrative Court Daily Cause List",
      contentDate: contentDate,
      lastReceivedDate: expect.any(String)
    });
  });

  it("should return error when PDF generation fails", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false,
      error: "Puppeteer crashed"
    });

    const result = await generateAdministrativeCourtDailyCauseListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
  });

  it("should return default error message when PDF buffer is missing", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: undefined,
      sizeBytes: 0
    });

    const result = await generateAdministrativeCourtDailyCauseListPdf({
      artefactId: "no-buffer",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      listTypeName: "LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should handle renderer exceptions gracefully", async () => {
    vi.mocked(renderAdminCourt).mockImplementation(() => {
      throw new Error("Renderer failed");
    });

    const result = await generateAdministrativeCourtDailyCauseListPdf({
      artefactId: "renderer-error",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      listTypeName: "MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
    });

    expect(result.success).toBe(false);
  });

  it("should use fallback list title for unknown listTypeName", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    await generateAdministrativeCourtDailyCauseListPdf({
      artefactId: "unknown-type",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      listTypeName: "UNKNOWN_COURT_LIST"
    });

    expect(renderAdminCourt).toHaveBeenCalledWith(mockHearingList, expect.objectContaining({ listTitle: "Administrative Court Daily Cause List" }));
  });

  describe("localised title and data source", () => {
    beforeEach(() => {
      vi.mocked(renderAdminCourt).mockImplementation((_hearings, options) => ({
        ...mockRenderedData,
        header: { ...mockRenderedData.header, listTitle: options.listTitle }
      }));
      vi.mocked(generatePdfFromHtml).mockResolvedValue({
        success: true,
        pdfBuffer: Buffer.from("PDF"),
        sizeBytes: 100
      });
    });

    function renderedHtml(): string {
      return vi.mocked(generatePdfFromHtml).mock.calls[0][0];
    }

    it.each(LIST_TYPE_NAMES)("should render the Welsh title and Welsh data source for %s in the cy locale", async (listTypeName) => {
      // Act
      await generateAdministrativeCourtDailyCauseListPdf({
        artefactId: "welsh-pdf",
        contentDate: new Date("2025-01-01"),
        locale: "cy",
        locationId: "240",
        jsonData: mockHearingList,
        listTypeName,
        provenance: "MANUAL_UPLOAD"
      });

      // Assert
      const html = renderedHtml();
      expect(renderAdminCourt).toHaveBeenCalledWith(mockHearingList, expect.objectContaining({ listTitle: cy[listTypeName].pageTitle }));
      expect(html).toContain(`<h1>${cy[listTypeName].pageTitle}</h1>`);
      expect(html).toContain(`${cy.common.dataSource}: Lanlwytho â Llaw`);
      expect(html).not.toContain(en[listTypeName].pageTitle);
      expect(html).not.toContain("Manual Upload");
    });

    it.each(LIST_TYPE_NAMES)("should render the English title and English data source for %s in the en locale", async (listTypeName) => {
      // Act
      await generateAdministrativeCourtDailyCauseListPdf({
        artefactId: "english-pdf",
        contentDate: new Date("2025-01-01"),
        locale: "en",
        locationId: "240",
        jsonData: mockHearingList,
        listTypeName,
        provenance: "MANUAL_UPLOAD"
      });

      // Assert
      const html = renderedHtml();
      expect(html).toContain(`<h1>${en[listTypeName].pageTitle}</h1>`);
      expect(html).toContain(`${en.common.dataSource}: Manual Upload`);
    });

    it("should fall back to the raw provenance when it has no label", async () => {
      // Act
      await generateAdministrativeCourtDailyCauseListPdf({
        artefactId: "unknown-provenance",
        contentDate: new Date("2025-01-01"),
        locale: "cy",
        locationId: "240",
        jsonData: mockHearingList,
        listTypeName: LIST_TYPE_NAMES[0],
        provenance: "SOME_NEW_SOURCE"
      });

      // Assert
      expect(renderedHtml()).toContain(`${cy.common.dataSource}: SOME_NEW_SOURCE`);
    });

    it("should omit the data source when there is no provenance", async () => {
      // Act
      await generateAdministrativeCourtDailyCauseListPdf({
        artefactId: "no-provenance",
        contentDate: new Date("2025-01-01"),
        locale: "en",
        locationId: "240",
        jsonData: mockHearingList,
        listTypeName: LIST_TYPE_NAMES[0]
      });

      // Assert
      expect(renderedHtml()).not.toContain(`${en.common.dataSource}:`);
    });
  });
});
