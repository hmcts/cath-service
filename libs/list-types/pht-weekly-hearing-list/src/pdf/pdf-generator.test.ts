import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/list-types-common", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/list-types-common")>();
  return {
    ...actual,
    generateListPdf: vi.fn().mockResolvedValue({ success: true, pdfPath: "/stored/path.pdf", sizeBytes: 1024, exceedsMaxSize: false })
  };
});

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: { MANUAL_UPLOAD: "Manual Upload" }
}));

import { generatePhtWeeklyHearingListPdf } from "./pdf-generator.js";

const BASE_OPTIONS = {
  artefactId: "test-artefact-id",
  jsonData: [
    {
      date: "02/01/2025",
      caseName: "A Vs B",
      hearingLength: "1 hour",
      hearingType: "Substantive hearing",
      venue: "Primary Health Tribunal",
      additionalInformation: "Remote hearing"
    }
  ],
  locale: "en",
  locationId: "location-1",
  provenance: "MANUAL_UPLOAD",
  contentDate: new Date(2025, 0, 2)
};

describe("generatePhtWeeklyHearingListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the result from generateListPdf", async () => {
    const result = await generatePhtWeeklyHearingListPdf(BASE_OPTIONS);

    expect(result).toEqual({ success: true, pdfPath: "/stored/path.pdf", sizeBytes: 1024, exceedsMaxSize: false });
  });

  it("should call generateListPdf with PHT_LIST_TITLE", async () => {
    const { generateListPdf } = await import("@hmcts/list-types-common");

    await generatePhtWeeklyHearingListPdf(BASE_OPTIONS);

    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ listTitle: "Primary Health Tribunal Weekly Hearing List" }));
  });

  it("should resolve provenance to its display label", async () => {
    const { generateListPdf } = await import("@hmcts/list-types-common");

    await generatePhtWeeklyHearingListPdf({ ...BASE_OPTIONS, provenance: "MANUAL_UPLOAD" });

    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ provenanceLabel: "Manual Upload" }));
  });

  it("should use raw provenance string when not in PROVENANCE_LABELS", async () => {
    const { generateListPdf } = await import("@hmcts/list-types-common");

    await generatePhtWeeklyHearingListPdf({ ...BASE_OPTIONS, provenance: "UNKNOWN_SOURCE" });

    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ provenanceLabel: "UNKNOWN_SOURCE" }));
  });

  it("should use empty string for provenanceLabel when provenance is not provided", async () => {
    const { generateListPdf } = await import("@hmcts/list-types-common");
    const { provenance: _, ...optionsWithoutProvenance } = BASE_OPTIONS;

    await generatePhtWeeklyHearingListPdf(optionsWithoutProvenance as any);

    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ provenanceLabel: "" }));
  });

  it("should pass artefactId, locale and contentDate through to generateListPdf", async () => {
    const { generateListPdf } = await import("@hmcts/list-types-common");

    await generatePhtWeeklyHearingListPdf({ ...BASE_OPTIONS, locale: "cy" });

    expect(generateListPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        artefactId: "test-artefact-id",
        locale: "cy",
        contentDate: BASE_OPTIONS.contentDate
      })
    );
  });

  it("should return failure when generateListPdf returns failure", async () => {
    const { generateListPdf } = await import("@hmcts/list-types-common");
    vi.mocked(generateListPdf).mockResolvedValue({ success: false, error: "PDF generation failed" });

    const result = await generatePhtWeeklyHearingListPdf(BASE_OPTIONS);

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });
});
