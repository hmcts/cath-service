import { beforeEach, describe, expect, it, vi } from "vitest";
import { SECTIONS } from "../sections.js";

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
  renderBusinessAndPropertyRolls: vi.fn()
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import type { BusinessAndPropertyRollsData } from "../models/types.js";
import { renderBusinessAndPropertyRolls } from "../rendering/renderer.js";
import { generateBusinessAndPropertyDivisionRollsBuildingDailyCauseListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    listTitle: "Business and Property Division Rolls Building Daily Cause List",
    listDate: "15 January 2026",
    lastUpdatedDate: "14 January 2026",
    lastUpdatedTime: "9am"
  },
  sections: SECTIONS.map((s) => ({ key: s.key, title: s.en, hearings: [] }))
};

function emptyData(): BusinessAndPropertyRollsData {
  return Object.fromEntries(SECTIONS.map((s) => [s.key, []])) as BusinessAndPropertyRollsData;
}

describe("generateBusinessAndPropertyDivisionRollsBuildingDailyCauseListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderBusinessAndPropertyRolls).mockReturnValue(mockRenderedData as never);
    mockUploadBlob.mockResolvedValue(undefined);
  });

  it("should generate a PDF successfully", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 1024 });

    const result = await generateBusinessAndPropertyDivisionRollsBuildingDailyCauseListPdf({
      artefactId: "artefact-1",
      contentDate: new Date("2026-01-15"),
      locale: "en",
      locationId: "26",
      jsonData: emptyData()
    });

    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("artefact-1.pdf");
  });

  it("should return failure when PDF generation fails", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: false, error: "boom" });

    const result = await generateBusinessAndPropertyDivisionRollsBuildingDailyCauseListPdf({
      artefactId: "artefact-2",
      contentDate: new Date("2026-01-15"),
      locale: "en",
      locationId: "26",
      jsonData: emptyData()
    });

    expect(result.success).toBe(false);
  });
});
