import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InterimApplicationsData } from "../models/types.js";

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
  renderInterimApplicationsDailyCauseList: vi.fn()
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderInterimApplicationsDailyCauseList } from "../rendering/renderer.js";
import { generateInterimApplicationsDailyCauseListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    listTitle: "Interim Applications Daily Cause List",
    listDate: "01 January 2025",
    lastUpdatedDate: "12 November 2025",
    lastUpdatedTime: "9am"
  },
  hearings: [],
  importantInfo: {
    editableParagraph: "Parties should contact the clerk to the Interim Judge Judge A, a@justice.gov.uk as early as possible.",
    staticParagraph: "An application should not be listed before the Interim Applications Judge...",
    thirdParagraph: "Please note that hearings in the interim applications list will not additionally appear in their individual list."
  }
};

const mockData: InterimApplicationsData = {
  hearingList: [
    {
      judge: "Judge A",
      time: "10.30am",
      venue: "Venue A",
      type: "Type A",
      caseNumber: "1234",
      caseName: "Case name A",
      additionalInformation: "Info"
    }
  ],
  openJusticeStatementDetails: [{ nameToBeDisplayed: "Judge A", email: "a@justice.gov.uk" }]
};

describe("generateInterimApplicationsDailyCauseListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderInterimApplicationsDailyCauseList).mockReturnValue(mockRenderedData);
    mockUploadBlob.mockResolvedValue(undefined);
  });

  it("should generate PDF successfully", async () => {
    const pdfBuffer = Buffer.from("PDF content");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer,
      sizeBytes: 1024
    });

    const result = await generateInterimApplicationsDailyCauseListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "26",
      jsonData: mockData
    });

    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("test-artefact-123.pdf");
    expect(result.sizeBytes).toBe(1024);
  });

  it("should return error when PDF generation fails", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false,
      error: "Puppeteer crashed"
    });

    const result = await generateInterimApplicationsDailyCauseListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "26",
      jsonData: mockData
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
  });

  it("should pass correct render options to the renderer", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    const contentDate = new Date("2025-06-15");

    await generateInterimApplicationsDailyCauseListPdf({
      artefactId: "test-render-options",
      contentDate,
      locale: "en",
      locationId: "26",
      jsonData: mockData
    });

    expect(renderInterimApplicationsDailyCauseList).toHaveBeenCalledWith(mockData, {
      locale: "en",
      contentDate,
      lastReceivedDate: expect.any(String)
    });
  });
});
