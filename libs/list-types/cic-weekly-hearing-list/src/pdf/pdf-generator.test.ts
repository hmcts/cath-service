import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CicWeeklyHearingList } from "../models/types.js";
import { generateCicWeeklyHearingListPdf } from "./pdf-generator.js";

vi.mock("@hmcts/list-types-common", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/list-types-common")>();
  return {
    ...actual,
    loadTranslations: vi.fn(),
    buildPdfFromRenderedList: vi.fn()
  };
});

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    SNL: "ListAssist"
  }
}));

import { buildPdfFromRenderedList, loadTranslations } from "@hmcts/list-types-common";

const mockHearingList: CicWeeklyHearingList = [
  {
    date: "02/01/2025",
    hearingTime: "10am",
    caseReferenceNumber: "CIC/2025/001",
    caseName: "Smith v CICA",
    "venue/platform": "Remote",
    judges: "Judge Smith",
    members: "Member A",
    additionalInformation: "Video hearing"
  }
];

const baseOptions = {
  artefactId: "test-artefact-id",
  locale: "en",
  locationId: "14",
  contentDate: new Date("2025-06-20"),
  jsonData: mockHearingList
};

describe("generateCicWeeklyHearingListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadTranslations).mockResolvedValue({ lastUpdated: "Last updated" });
    vi.mocked(buildPdfFromRenderedList).mockResolvedValue({ success: true, pdfPath: "/tmp/test.pdf", sizeBytes: 1024 });
  });

  it("should generate PDF successfully", async () => {
    const result = await generateCicWeeklyHearingListPdf(baseOptions);

    expect(result.success).toBe(true);
    expect(buildPdfFromRenderedList).toHaveBeenCalledWith(expect.objectContaining({ artefactId: "test-artefact-id", provenanceLabel: "" }));
  });

  it("should resolve known provenance to label", async () => {
    await generateCicWeeklyHearingListPdf({ ...baseOptions, provenance: "MANUAL_UPLOAD" });

    expect(buildPdfFromRenderedList).toHaveBeenCalledWith(expect.objectContaining({ provenanceLabel: "Manual Upload" }));
  });

  it("should fall back to raw provenance string for unknown provenance", async () => {
    await generateCicWeeklyHearingListPdf({ ...baseOptions, provenance: "UNKNOWN_SOURCE" });

    expect(buildPdfFromRenderedList).toHaveBeenCalledWith(expect.objectContaining({ provenanceLabel: "UNKNOWN_SOURCE" }));
  });

  it("should pass Welsh locale to loadTranslations", async () => {
    await generateCicWeeklyHearingListPdf({ ...baseOptions, locale: "cy" });

    expect(loadTranslations).toHaveBeenCalledWith("cy", expect.any(Function), expect.any(Function));
  });

  it("should return failure when buildPdfFromRenderedList returns failure", async () => {
    vi.mocked(buildPdfFromRenderedList).mockResolvedValue({ success: false, error: "PDF generation failed" });

    const result = await generateCicWeeklyHearingListPdf(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should handle unexpected errors", async () => {
    vi.mocked(buildPdfFromRenderedList).mockRejectedValue(new Error("Unexpected failure"));

    const result = await generateCicWeeklyHearingListPdf(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unexpected failure");
  });
});
