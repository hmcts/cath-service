import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SendDailyHearingList } from "../models/types.js";
import { generateSendDailyHearingListPdf } from "./pdf-generator.js";

vi.mock("@hmcts/list-types-common", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/list-types-common")>();
  return {
    ...actual,
    generateListPdf: vi.fn()
  };
});

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    SNL: "ListAssist"
  }
}));

import { generateListPdf } from "@hmcts/list-types-common";

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
    vi.mocked(generateListPdf).mockResolvedValue({ success: true, pdfPath: "/tmp/test.pdf", sizeBytes: 1024 });
  });

  it("should generate PDF successfully", async () => {
    const result = await generateSendDailyHearingListPdf(baseOptions);

    expect(result.success).toBe(true);
    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ artefactId: "test-artefact-id", provenanceLabel: "" }));
  });

  it("should resolve known provenance to label", async () => {
    await generateSendDailyHearingListPdf({ ...baseOptions, provenance: "MANUAL_UPLOAD" });

    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ provenanceLabel: "Manual Upload" }));
  });

  it("should fall back to raw provenance string for unknown provenance", async () => {
    await generateSendDailyHearingListPdf({ ...baseOptions, provenance: "UNKNOWN_SOURCE" });

    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ provenanceLabel: "UNKNOWN_SOURCE" }));
  });

  it("should pass Welsh locale to generateListPdf", async () => {
    await generateSendDailyHearingListPdf({ ...baseOptions, locale: "cy" });

    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ locale: "cy" }));
  });

  it("should return failure when generateListPdf returns failure", async () => {
    vi.mocked(generateListPdf).mockResolvedValue({ success: false, error: "PDF generation failed" });

    const result = await generateSendDailyHearingListPdf(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should use the correct list title", async () => {
    await generateSendDailyHearingListPdf(baseOptions);

    expect(generateListPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        listTitle: "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List"
      })
    );
  });

  it("should provide working importEn and importCy callbacks", async () => {
    await generateSendDailyHearingListPdf(baseOptions);

    const callArgs = vi.mocked(generateListPdf).mock.calls[0][0];
    const enModule = await callArgs.importEn();
    const cyModule = await callArgs.importCy();

    expect(enModule.en).toBeDefined();
    expect(cyModule.cy).toBeDefined();
  });
});
