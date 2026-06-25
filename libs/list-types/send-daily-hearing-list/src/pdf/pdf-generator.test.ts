import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SendDailyHearingList } from "../models/types.js";
import { generateSendDailyHearingListPdf } from "./pdf-generator.js";

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

const mockHearingList: SendDailyHearingList = [
  {
    time: "10am",
    caseReferenceNumber: "SEND/2025/001",
    respondent: "Local Authority",
    hearingType: "Final",
    venue: "Remote",
    timeEstimate: "2 hours"
  }
];

const baseOptions = {
  artefactId: "test-artefact-id",
  locale: "en",
  locationId: "13",
  contentDate: new Date("2025-06-20"),
  jsonData: mockHearingList
};

describe("generateSendDailyHearingListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadTranslations).mockResolvedValue({ lastUpdated: "Last updated" });
    vi.mocked(buildPdfFromRenderedList).mockResolvedValue({ success: true, pdfPath: "/tmp/test.pdf", sizeBytes: 1024 });
  });

  it("should generate PDF successfully", async () => {
    const result = await generateSendDailyHearingListPdf(baseOptions);

    expect(result.success).toBe(true);
    expect(buildPdfFromRenderedList).toHaveBeenCalledWith(expect.objectContaining({ artefactId: "test-artefact-id", provenanceLabel: "" }));
  });

  it("should resolve known provenance to label", async () => {
    await generateSendDailyHearingListPdf({ ...baseOptions, provenance: "MANUAL_UPLOAD" });

    expect(buildPdfFromRenderedList).toHaveBeenCalledWith(expect.objectContaining({ provenanceLabel: "Manual Upload" }));
  });

  it("should fall back to raw provenance string for unknown provenance", async () => {
    await generateSendDailyHearingListPdf({ ...baseOptions, provenance: "UNKNOWN_SOURCE" });

    expect(buildPdfFromRenderedList).toHaveBeenCalledWith(expect.objectContaining({ provenanceLabel: "UNKNOWN_SOURCE" }));
  });

  it("should pass Welsh locale to loadTranslations", async () => {
    await generateSendDailyHearingListPdf({ ...baseOptions, locale: "cy" });

    expect(loadTranslations).toHaveBeenCalledWith("cy", expect.any(Function), expect.any(Function));
  });

  it("should return failure when buildPdfFromRenderedList returns failure", async () => {
    vi.mocked(buildPdfFromRenderedList).mockResolvedValue({ success: false, error: "PDF generation failed" });

    const result = await generateSendDailyHearingListPdf(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should handle unexpected errors", async () => {
    vi.mocked(buildPdfFromRenderedList).mockRejectedValue(new Error("Unexpected failure"));

    const result = await generateSendDailyHearingListPdf(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unexpected failure");
  });
});
