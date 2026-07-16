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

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    SNL: "SNL"
  }
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderAdminCourt } from "../rendering/renderer.js";
import { generateAdministrativeCourtDailyCauseListPdf } from "./pdf-generator.js";

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
      listTypeName: "BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
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
      listTypeName: "BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
    });

    expect(renderAdminCourt).toHaveBeenCalledWith(mockHearingList, {
      locale: "en",
      listTypeName: "BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
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
});
