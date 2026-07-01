import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AstDailyHearingList } from "../models/types.js";
import { generateAstDailyHearingListPdf } from "./pdf-generator.js";

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
    vi.mocked(generateListPdf).mockResolvedValue({ success: true, pdfPath: "/tmp/test.pdf", sizeBytes: 1024 });
  });

  it("should generate PDF successfully", async () => {
    const result = await generateAstDailyHearingListPdf(baseOptions);

    expect(result.success).toBe(true);
    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ artefactId: "test-artefact-id", provenanceLabel: "" }));
  });

  it("should resolve known provenance to label", async () => {
    await generateAstDailyHearingListPdf({ ...baseOptions, provenance: "MANUAL_UPLOAD" });

    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ provenanceLabel: "Manual Upload" }));
  });

  it("should fall back to raw provenance string for unknown provenance", async () => {
    await generateAstDailyHearingListPdf({ ...baseOptions, provenance: "UNKNOWN_SOURCE" });

    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ provenanceLabel: "UNKNOWN_SOURCE" }));
  });

  it("should pass Welsh locale to generateListPdf", async () => {
    await generateAstDailyHearingListPdf({ ...baseOptions, locale: "cy" });

    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ locale: "cy" }));
  });

  it("should return failure when generateListPdf returns failure", async () => {
    vi.mocked(generateListPdf).mockResolvedValue({ success: false, error: "PDF generation failed" });

    const result = await generateAstDailyHearingListPdf(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should use the correct list title", async () => {
    await generateAstDailyHearingListPdf(baseOptions);

    expect(generateListPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        listTitle: "Asylum Support Tribunal Daily Hearing List"
      })
    );
  });

  it("should provide working importEn and importCy callbacks", async () => {
    await generateAstDailyHearingListPdf(baseOptions);

    const callArgs = vi.mocked(generateListPdf).mock.calls[0][0];
    const enModule = await callArgs.importEn();
    const cyModule = await callArgs.importCy();

    expect(enModule.en).toBeDefined();
    expect(cyModule.cy).toBeDefined();
  });
});
