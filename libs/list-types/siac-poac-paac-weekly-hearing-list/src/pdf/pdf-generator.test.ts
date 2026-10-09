import { beforeEach, describe, expect, it, vi } from "vitest";

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
  renderSiacPoacPaacData: vi.fn()
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import { renderSiacPoacPaacData } from "../rendering/renderer.js";
import { generateSiacPoacPaacWeeklyHearingListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    listTitle: "Special Immigration Appeals Commission Weekly Hearing List",
    weekCommencingDate: "01 January 2025",
    lastUpdatedDate: "12 November 2025",
    lastUpdatedTime: "9am"
  },
  hearings: []
};

const mockHearingList = [
  {
    date: "01/01/2025",
    time: "10:00am",
    appellant: "Smith v Secretary of State",
    caseReferenceNumber: "SC/00001/2025",
    hearingType: "Substantive hearing",
    courtroom: "Court 1",
    additionalInformation: ""
  }
];

describe("generateSiacPoacPaacWeeklyHearingListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderSiacPoacPaacData).mockReturnValue(mockRenderedData);
    mockUploadBlob.mockResolvedValue(undefined);
  });

  it("should generate PDF successfully", async () => {
    // Arrange
    const pdfBuffer = Buffer.from("PDF content");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer,
      sizeBytes: 1024
    });

    // Act
    const result = await generateSiacPoacPaacWeeklyHearingListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      listTypeName: "SIAC_WEEKLY_HEARING_LIST"
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("test-artefact-123.pdf");
    expect(result.sizeBytes).toBe(1024);
    expect(result.exceedsMaxSize).toBe(false);
  });

  it("should return exceedsMaxSize true when PDF is over 2MB", async () => {
    // Arrange
    const largePdfBuffer = Buffer.alloc(3 * 1024 * 1024);
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: largePdfBuffer,
      sizeBytes: 3 * 1024 * 1024
    });

    // Act
    const result = await generateSiacPoacPaacWeeklyHearingListPdf({
      artefactId: "large-pdf-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      listTypeName: "SIAC_WEEKLY_HEARING_LIST"
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.exceedsMaxSize).toBe(true);
  });

  it("should return error when PDF generation fails", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false,
      error: "Puppeteer crashed"
    });

    // Act
    const result = await generateSiacPoacPaacWeeklyHearingListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      listTypeName: "SIAC_WEEKLY_HEARING_LIST"
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
  });

  it("should pass correct render options to renderer", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    const contentDate = new Date("2025-06-15");

    // Act
    await generateSiacPoacPaacWeeklyHearingListPdf({
      artefactId: "test-render-options",
      contentDate,
      locale: "cy",
      locationId: "999",
      jsonData: mockHearingList,
      listTypeName: "POAC_WEEKLY_HEARING_LIST"
    });

    // Assert
    expect(renderSiacPoacPaacData).toHaveBeenCalledWith(mockHearingList, {
      locale: "cy",
      courtName: cy.poacCourtName,
      contentDate,
      lastReceivedDate: expect.any(String),
      listTitle: cy.poacPageTitle
    });
  });

  it.each([
    ["SIAC_WEEKLY_HEARING_LIST", en.siacPageTitle, cy.siacPageTitle],
    ["POAC_WEEKLY_HEARING_LIST", en.poacPageTitle, cy.poacPageTitle],
    ["PAAC_WEEKLY_HEARING_LIST", en.paacPageTitle, cy.paacPageTitle]
  ])("should use the locale list title for %s", async (listTypeName, enTitle, cyTitle) => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });
    const baseOptions = { artefactId: "title-test", contentDate: new Date("2025-01-01"), locationId: "999", jsonData: mockHearingList, listTypeName };

    // Act
    await generateSiacPoacPaacWeeklyHearingListPdf({ ...baseOptions, locale: "en" });
    await generateSiacPoacPaacWeeklyHearingListPdf({ ...baseOptions, locale: "cy" });

    // Assert
    expect(renderSiacPoacPaacData).toHaveBeenNthCalledWith(1, mockHearingList, expect.objectContaining({ listTitle: enTitle }));
    expect(renderSiacPoacPaacData).toHaveBeenNthCalledWith(2, mockHearingList, expect.objectContaining({ listTitle: cyTitle }));
  });

  it("should give the Welsh PDF the legacy Welsh title", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });

    // Act
    await generateSiacPoacPaacWeeklyHearingListPdf({
      artefactId: "welsh-title",
      contentDate: new Date("2025-01-01"),
      locale: "cy",
      locationId: "999",
      jsonData: mockHearingList,
      listTypeName: "SIAC_WEEKLY_HEARING_LIST"
    });

    // Assert
    expect(renderSiacPoacPaacData).toHaveBeenCalledWith(
      mockHearingList,
      expect.objectContaining({ listTitle: "Rhestr o Wrandawiadau Wythnosol y Comisiwn Apeliadau Mewnfudo Arbennig" })
    );
  });

  it("should return an error without generating a PDF for an unsupported list type", async () => {
    // Act
    const result = await generateSiacPoacPaacWeeklyHearingListPdf({
      artefactId: "unsupported",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "999",
      jsonData: mockHearingList,
      listTypeName: "UNKNOWN_LIST"
    });

    // Assert
    expect(result).toEqual({ success: false, error: "Unsupported list type: UNKNOWN_LIST" });
    expect(generatePdfFromHtml).not.toHaveBeenCalled();
  });

  it.each([
    ["en", "MANUAL_UPLOAD", "Manual Upload"],
    ["cy", "MANUAL_UPLOAD", "Lanlwytho â Llaw"],
    ["cy", "SNL", "ListAssist"]
  ])("should show the %s locale data source label for %s, as legacy does", async (locale, provenance, expectedLabel) => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });

    // Act
    await generateSiacPoacPaacWeeklyHearingListPdf({
      artefactId: "provenance-label",
      contentDate: new Date("2025-01-01"),
      locale,
      locationId: "999",
      jsonData: mockHearingList,
      provenance,
      listTypeName: "SIAC_WEEKLY_HEARING_LIST"
    });

    // Assert
    expect(vi.mocked(generatePdfFromHtml).mock.calls[0][0]).toContain(expectedLabel);
  });
});
