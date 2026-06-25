import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AstDailyHearingList } from "../models/types.js";
import { generateAstDailyHearingListPdf } from "./pdf-generator.js";

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

const mockHearingList: AstDailyHearingList = [
  {
    appellant: "A Smith",
    appealReferenceNumber: "AST/2025/001",
    caseType: "Section 4",
    hearingType: "Substantive",
    hearingTime: "10am",
    additionalInformation: "Remote hearing"
  }
];

const baseOptions = {
  artefactId: "test-artefact-id",
  locale: "en",
  locationId: "15",
  contentDate: new Date("2025-06-20"),
  jsonData: mockHearingList
};

describe("generateAstDailyHearingListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadTranslations).mockResolvedValue({ lastUpdated: "Last updated" });
    vi.mocked(buildPdfFromRenderedList).mockResolvedValue({ success: true, pdfPath: "/tmp/test.pdf", sizeBytes: 1024 });
  });

  it("should generate PDF successfully", async () => {
    const result = await generateAstDailyHearingListPdf(baseOptions);

    expect(result.success).toBe(true);
    expect(buildPdfFromRenderedList).toHaveBeenCalledWith(expect.objectContaining({ artefactId: "test-artefact-id", provenanceLabel: "" }));
  });

  it("should resolve known provenance to label", async () => {
    await generateAstDailyHearingListPdf({ ...baseOptions, provenance: "MANUAL_UPLOAD" });

    expect(buildPdfFromRenderedList).toHaveBeenCalledWith(expect.objectContaining({ provenanceLabel: "Manual Upload" }));
  });

  it("should fall back to raw provenance string for unknown provenance", async () => {
    await generateAstDailyHearingListPdf({ ...baseOptions, provenance: "UNKNOWN_SOURCE" });

    expect(buildPdfFromRenderedList).toHaveBeenCalledWith(expect.objectContaining({ provenanceLabel: "UNKNOWN_SOURCE" }));
  });

  it("should pass Welsh locale to loadTranslations", async () => {
    await generateAstDailyHearingListPdf({ ...baseOptions, locale: "cy" });

    expect(loadTranslations).toHaveBeenCalledWith("cy", expect.any(Function), expect.any(Function));
  });

  it("should return failure when buildPdfFromRenderedList returns failure", async () => {
    vi.mocked(buildPdfFromRenderedList).mockResolvedValue({ success: false, error: "PDF generation failed" });

    const result = await generateAstDailyHearingListPdf(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should handle unexpected errors", async () => {
    vi.mocked(buildPdfFromRenderedList).mockRejectedValue(new Error("Unexpected failure"));

    const result = await generateAstDailyHearingListPdf(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unexpected failure");
  });
});
