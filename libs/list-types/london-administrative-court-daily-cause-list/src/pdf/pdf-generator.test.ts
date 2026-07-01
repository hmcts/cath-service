import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LondonAdminCourtData } from "../models/types.js";

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
  renderLondonAdminCourt: vi.fn()
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderLondonAdminCourt } from "../rendering/renderer.js";
import { generateLondonAdministrativeCourtDailyCauseListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    listTitle: "London Administrative Court Daily Cause List",
    listDate: "01 January 2025",
    lastUpdatedDate: "12 November 2025",
    lastUpdatedTime: "9am"
  },
  mainHearings: [],
  planningCourt: []
};

const mockHearingList: LondonAdminCourtData = {
  mainHearings: [
    {
      venue: "Royal Courts of Justice",
      judge: "Judge Smith",
      time: "10:00",
      caseNumber: "LO/1234/2025",
      caseDetails: "R (Smith) v Mayor of London",
      hearingType: "Judicial Review",
      additionalInformation: ""
    }
  ],
  planningCourt: []
};

describe("generateLondonAdministrativeCourtDailyCauseListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderLondonAdminCourt).mockReturnValue(mockRenderedData);
    mockUploadBlob.mockResolvedValue(undefined);
  });

  it("should generate PDF successfully", async () => {
    const pdfBuffer = Buffer.from("PDF content");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer,
      sizeBytes: 1024
    });

    const result = await generateLondonAdministrativeCourtDailyCauseListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
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

    await generateLondonAdministrativeCourtDailyCauseListPdf({
      artefactId: "test-render-options",
      contentDate,
      locale: "en",
      locationId: "999",
      jsonData: mockHearingList
    });

    expect(renderLondonAdminCourt).toHaveBeenCalledWith(mockHearingList, {
      locale: "en",
      contentDate: contentDate,
      lastReceivedDate: expect.any(String)
    });
  });
});
