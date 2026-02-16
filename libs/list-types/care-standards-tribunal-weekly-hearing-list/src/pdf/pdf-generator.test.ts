import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn()
  }
}));

vi.mock("@hmcts/pdf-generation", () => ({
  generatePdfFromHtml: vi.fn()
}));

vi.mock("../rendering/renderer.js", () => ({
  renderCareStandardsTribunalData: vi.fn()
}));

import fs from "node:fs/promises";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
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
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
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
      displayFrom: new Date("2025-01-01"),
      displayTo: new Date("2025-01-07"),
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
      displayFrom: new Date("2025-01-01"),
      displayTo: new Date("2025-01-07"),
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
      displayFrom: new Date("2025-01-01"),
      displayTo: new Date("2025-01-07"),
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

    const displayFrom = new Date("2025-06-15");
    const displayTo = new Date("2025-06-21");

    await generateCareStandardsTribunalWeeklyHearingListPdf({
      artefactId: "test-render-options",
      displayFrom,
      displayTo,
      locale: "cy",
      locationId: "999",
      jsonData: mockHearingList
    });

    expect(renderCareStandardsTribunalData).toHaveBeenCalledWith(mockHearingList, {
      locale: "cy",
      courtName: "Care Standards Tribunal",
      displayFrom,
      displayTo,
      lastReceivedDate: expect.any(String),
      listTitle: "Care Standards Tribunal Weekly Hearing List"
    });
  });
});
