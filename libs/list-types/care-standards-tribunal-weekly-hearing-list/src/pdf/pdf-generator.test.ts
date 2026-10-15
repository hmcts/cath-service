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
  renderCareStandardsTribunalData: vi.fn()
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import { renderCareStandardsTribunalData } from "../rendering/renderer.js";
import { generateCareStandardsTribunalWeeklyHearingListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    listTitle: "Care Standards Tribunal Weekly Hearing List",
    weekCommencingDate: "01 January 2025",
    lastUpdatedDate: "12 November 2025",
    lastUpdatedTime: "9am"
  },
  hearings: []
};

const mockHearingList = [
  {
    date: "01/01/2025",
    caseName: "Smith v Care Provider Ltd",
    hearingLength: "2 hours",
    hearingType: "Final Hearing",
    venue: "Royal Courts of Justice",
    additionalInformation: ""
  }
];

describe("generateCareStandardsTribunalWeeklyHearingListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderCareStandardsTribunalData).mockReturnValue(mockRenderedData);
    mockUploadBlob.mockResolvedValue(undefined);
  });

  it("should generate PDF successfully", async () => {
    const pdfBuffer = Buffer.from("PDF content");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer,
      sizeBytes: 1024
    });

    const result = await generateCareStandardsTribunalWeeklyHearingListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("test-artefact-123.pdf");
    expect(result.sizeBytes).toBe(1024);
    expect(result.exceedsMaxSize).toBe(false);
  });

  it("should return exceedsMaxSize true when PDF is over 2MB", async () => {
    const largePdfBuffer = Buffer.alloc(3 * 1024 * 1024);
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: largePdfBuffer,
      sizeBytes: 3 * 1024 * 1024
    });

    const result = await generateCareStandardsTribunalWeeklyHearingListPdf({
      artefactId: "large-pdf-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(result.success).toBe(true);
    expect(result.exceedsMaxSize).toBe(true);
  });

  it("should return error when PDF generation fails", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false,
      error: "Puppeteer crashed"
    });

    const result = await generateCareStandardsTribunalWeeklyHearingListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
  });

  it("should pass correct render options to renderer", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    const contentDate = new Date("2025-06-15");

    await generateCareStandardsTribunalWeeklyHearingListPdf({
      artefactId: "test-render-options",
      contentDate,
      locale: "cy",
      locationId: "999",
      jsonData: mockHearingList
    });

    expect(renderCareStandardsTribunalData).toHaveBeenCalledWith(mockHearingList, {
      locale: "cy",
      courtName: "Care Standards Tribunal",
      contentDate,
      lastReceivedDate: expect.any(String),
      listTitle: cy.pageTitle
    });
  });

  it("should pass the en locale list title to the renderer", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });

    // Act
    await generateCareStandardsTribunalWeeklyHearingListPdf({
      artefactId: "en-title",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "999",
      jsonData: mockHearingList
    });

    // Assert
    expect(renderCareStandardsTribunalData).toHaveBeenCalledWith(mockHearingList, expect.objectContaining({ listTitle: en.pageTitle }));
  });

  it.each([
    ["en", "MANUAL_UPLOAD", "Manual Upload"],
    ["cy", "MANUAL_UPLOAD", "Lanlwytho â Llaw"],
    ["cy", "SNL", "ListAssist"]
  ])("should show the %s locale data source label for %s, as legacy does", async (locale, provenance, expectedLabel) => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });

    // Act
    await generateCareStandardsTribunalWeeklyHearingListPdf({
      artefactId: "provenance-label",
      contentDate: new Date("2025-01-01"),
      locale,
      locationId: "999",
      jsonData: mockHearingList,
      provenance
    });

    // Assert
    expect(vi.mocked(generatePdfFromHtml).mock.calls[0][0]).toContain(expectedLabel);
  });
});
