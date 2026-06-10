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
  renderSscsDailyHearingListData: vi.fn()
}));

import fs from "node:fs/promises";
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

describe("generateSscsDailyHearingListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderSscsDailyHearingListData).mockReturnValue(mockRenderedData);
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

    const result = await generateSscsDailyHearingListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2026-01-01"),
      locale: "en",
      locationId: "19",
      jsonData: mockHearingList,
      listTitle: "London Social Security and Child Support Tribunal Daily Hearing List",
      courtName: "London Social Security and Child Support Tribunal",
      importantInformationText: "Open justice is a fundamental principle."
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

    const result = await generateSscsDailyHearingListPdf({
      artefactId: "large-pdf-123",
      contentDate: new Date("2026-01-01"),
      locale: "en",
      locationId: "19",
      jsonData: mockHearingList,
      listTitle: "London Social Security and Child Support Tribunal Daily Hearing List",
      courtName: "London Social Security and Child Support Tribunal",
      importantInformationText: "Open justice is a fundamental principle."
    });

    expect(result.success).toBe(true);
    expect(result.exceedsMaxSize).toBe(true);
  });

  it("should return error when PDF generation fails", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false,
      error: "Puppeteer crashed"
    });

    const result = await generateSscsDailyHearingListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2026-01-01"),
      locale: "en",
      locationId: "19",
      jsonData: mockHearingList,
      listTitle: "London Social Security and Child Support Tribunal Daily Hearing List",
      courtName: "London Social Security and Child Support Tribunal",
      importantInformationText: ""
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

    const contentDate = new Date("2026-01-01");
    const listTitle = "London Social Security and Child Support Tribunal Daily Hearing List";

    await generateSscsDailyHearingListPdf({
      artefactId: "test-render-options",
      contentDate,
      locale: "cy",
      locationId: "19",
      jsonData: mockHearingList,
      listTitle,
      courtName: "London Social Security and Child Support Tribunal",
      importantInformationText: "Open justice is a fundamental principle."
    });

    expect(renderSscsDailyHearingListData).toHaveBeenCalledWith(mockHearingList, {
      locale: "cy",
      courtName: "London Social Security and Child Support Tribunal",
      contentDate,
      lastReceivedDate: expect.any(String),
      listTitle
    });
  });
});
