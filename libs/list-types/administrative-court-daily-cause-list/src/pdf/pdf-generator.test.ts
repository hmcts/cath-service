import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdministrativeCourtHearingList } from "../models/types.js";

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
  renderAdminCourt: vi.fn()
}));

import fs from "node:fs/promises";
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

    const result = await generateAdministrativeCourtDailyCauseListPdf({
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

    await generateAdministrativeCourtDailyCauseListPdf({
      artefactId: "test-render-options",
      contentDate,
      locale: "en",
      locationId: "999",
      jsonData: mockHearingList
    });

    expect(renderAdminCourt).toHaveBeenCalledWith(mockHearingList, {
      locale: "en",
      listTypeId: 11,
      listTitle: "Administrative Court Daily Cause List",
      displayFrom: contentDate,
      displayTo: contentDate,
      lastReceivedDate: expect.any(String)
    });
  });
});
