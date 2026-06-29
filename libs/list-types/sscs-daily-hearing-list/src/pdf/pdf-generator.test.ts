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
  renderSscsDailyHearingListData: vi.fn()
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderSscsDailyHearingListData } from "../rendering/renderer.js";
import { generateSscsDailyHearingListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    listTitle: "London Social Security and Child Support Tribunal Daily Hearing List",
    listDate: "1 January 2026",
    lastUpdatedDate: "1 January 2026",
    lastUpdatedTime: "12:00pm"
  },
  hearings: []
};

const mockHearingList = [
  {
    venue: "London Tribunal Centre",
    appealReferenceNumber: "SC/001/2026",
    hearingType: "Oral Hearing",
    appellant: "Smith, John",
    courtroom: "Room 1",
    hearingTime: "10:00am",
    tribunal: "SSCS",
    respondent: "Secretary of State for Work and Pensions",
    additionalInformation: ""
  }
];

const BASE_OPTIONS = {
  artefactId: "test-artefact-123",
  contentDate: new Date("2026-01-01"),
  locale: "en",
  locationId: "19",
  jsonData: mockHearingList,
  listTitle: "London Social Security and Child Support Tribunal Daily Hearing List",
  courtName: "London Social Security and Child Support Tribunal",
  importantInformationText: "Open justice is a fundamental principle."
};

describe("generateSscsDailyHearingListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderSscsDailyHearingListData).mockReturnValue(mockRenderedData);
    mockUploadBlob.mockResolvedValue(undefined);
  });

  it("should generate PDF successfully", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF content"),
      sizeBytes: 1024
    });

    const result = await generateSscsDailyHearingListPdf(BASE_OPTIONS);

    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("test-artefact-123.pdf");
    expect(result.sizeBytes).toBe(1024);
    expect(result.exceedsMaxSize).toBe(false);
  });

  it("should return exceedsMaxSize true when PDF is over 2MB", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.alloc(3 * 1024 * 1024),
      sizeBytes: 3 * 1024 * 1024
    });

    const result = await generateSscsDailyHearingListPdf({ ...BASE_OPTIONS, artefactId: "large-pdf-123" });

    expect(result.success).toBe(true);
    expect(result.exceedsMaxSize).toBe(true);
  });

  it("should return error when PDF generation fails with error message", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: false, error: "Puppeteer crashed" });

    const result = await generateSscsDailyHearingListPdf({ ...BASE_OPTIONS, artefactId: "failed-pdf", importantInformationText: "" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
  });

  it("should return default error message when PDF generation fails without message", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: false });

    const result = await generateSscsDailyHearingListPdf({ ...BASE_OPTIONS, artefactId: "failed-pdf-no-msg", importantInformationText: "" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should return error when an unexpected exception is thrown", async () => {
    vi.mocked(generatePdfFromHtml).mockRejectedValue(new Error("Unexpected crash"));

    const result = await generateSscsDailyHearingListPdf({ ...BASE_OPTIONS, artefactId: "exception-pdf", importantInformationText: "" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unexpected crash");
  });

  it("should use raw provenance value when not in PROVENANCE_LABELS", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });

    const result = await generateSscsDailyHearingListPdf({
      ...BASE_OPTIONS,
      artefactId: "unknown-provenance",
      importantInformationText: "",
      provenance: "UNKNOWN_SOURCE"
    });

    expect(result.success).toBe(true);
  });

  it("should pass correct render options to renderer", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });

    await generateSscsDailyHearingListPdf({ ...BASE_OPTIONS, artefactId: "test-render-options", locale: "cy" });

    expect(renderSscsDailyHearingListData).toHaveBeenCalledWith(mockHearingList, {
      locale: "cy",
      courtName: "London Social Security and Child Support Tribunal",
      contentDate: BASE_OPTIONS.contentDate,
      lastReceivedDate: expect.any(String),
      listTitle: BASE_OPTIONS.listTitle
    });
  });
});
