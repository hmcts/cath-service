import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompaniesWindingUpHearingList } from "../models/types.js";

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
  renderCompaniesWindingUpChdDailyCauseList: vi.fn()
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderCompaniesWindingUpChdDailyCauseList } from "../rendering/renderer.js";
import { generateCompaniesWindingUpChdDailyCauseListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    listTitle: "Companies Winding Up (Chancery Division) Daily Cause List",
    listDate: "01 January 2025",
    lastUpdatedDate: "12 November 2025",
    lastUpdatedTime: "9am"
  },
  hearings: []
};

const mockHearingList: CompaniesWindingUpHearingList = [
  {
    judge: "Judge A",
    time: "9am",
    venue: "Venue A",
    type: "Type A",
    caseNumber: "12345",
    caseName: "Case name A",
    additionalInformation: "Remote hearing"
  }
];

describe("generateCompaniesWindingUpChdDailyCauseListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderCompaniesWindingUpChdDailyCauseList).mockReturnValue(mockRenderedData);
    mockUploadBlob.mockResolvedValue(undefined);
  });

  it("should generate PDF successfully", async () => {
    const pdfBuffer = Buffer.from("PDF content");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer,
      sizeBytes: 1024
    });

    const result = await generateCompaniesWindingUpChdDailyCauseListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "26",
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

    const result = await generateCompaniesWindingUpChdDailyCauseListPdf({
      artefactId: "large-pdf-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "26",
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

    const result = await generateCompaniesWindingUpChdDailyCauseListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "26",
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

    await generateCompaniesWindingUpChdDailyCauseListPdf({
      artefactId: "test-render-options",
      contentDate,
      locale: "en",
      locationId: "26",
      jsonData: mockHearingList
    });

    expect(renderCompaniesWindingUpChdDailyCauseList).toHaveBeenCalledWith(mockHearingList, {
      locale: "en",
      contentDate: contentDate,
      lastReceivedDate: expect.any(String)
    });
  });
});
