import { beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { CicWeeklyHearingList } from "../models/types.js";
import { generateCicWeeklyHearingListPdf } from "./pdf-generator.js";

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
    vi.mocked(generateListPdf).mockResolvedValue({ success: true, pdfPath: "/tmp/test.pdf", sizeBytes: 1024 });
  });

  it("should generate PDF successfully", async () => {
    const result = await generateCicWeeklyHearingListPdf(baseOptions);

    expect(result.success).toBe(true);
    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ artefactId: "test-artefact-id", provenanceLabel: "" }));
  });

  it("should resolve known provenance to label", async () => {
    await generateCicWeeklyHearingListPdf({ ...baseOptions, provenance: "MANUAL_UPLOAD" });

    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ provenanceLabel: "Manual Upload" }));
  });

  it("should fall back to raw provenance string for unknown provenance", async () => {
    await generateCicWeeklyHearingListPdf({ ...baseOptions, provenance: "UNKNOWN_SOURCE" });

    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ provenanceLabel: "UNKNOWN_SOURCE" }));
  });

  it("should pass Welsh locale to generateListPdf", async () => {
    await generateCicWeeklyHearingListPdf({ ...baseOptions, locale: "cy" });

    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ locale: "cy" }));
  });

  it("should return failure when generateListPdf returns failure", async () => {
    vi.mocked(generateListPdf).mockResolvedValue({ success: false, error: "PDF generation failed" });

    const result = await generateCicWeeklyHearingListPdf(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it.each([
    ["en", en.pageTitle],
    ["cy", cy.pageTitle]
  ])("should use the %s locale list title", async (locale, expectedTitle) => {
    await generateCicWeeklyHearingListPdf({ ...baseOptions, locale });

    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ listTitle: expectedTitle }));
  });

  it("should give the Welsh PDF the legacy Welsh title", async () => {
    await generateCicWeeklyHearingListPdf({ ...baseOptions, locale: "cy" });

    expect(generateListPdf).toHaveBeenCalledWith(
      expect.objectContaining({ listTitle: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Digolledu am Anafiadau Troseddol" })
    );
  });

  it("should provide working importEn and importCy callbacks", async () => {
    await generateCicWeeklyHearingListPdf(baseOptions);

    const callArgs = vi.mocked(generateListPdf).mock.calls[0][0];
    const enModule = await callArgs.importEn();
    const cyModule = await callArgs.importCy();

    expect(enModule.en).toBeDefined();
    expect(cyModule.cy).toBeDefined();
  });

  it.each([
    ["en", "MANUAL_UPLOAD", "Manual Upload"],
    ["cy", "MANUAL_UPLOAD", "Lanlwytho â Llaw"],
    ["en", "SNL", "ListAssist"],
    ["cy", "SNL", "ListAssist"]
  ])("should use the %s locale data source label for %s, as legacy does", async (locale, provenance, expectedLabel) => {
    await generateCicWeeklyHearingListPdf({ ...baseOptions, locale, provenance });

    expect(generateListPdf).toHaveBeenCalledWith(expect.objectContaining({ provenanceLabel: expectedLabel }));
  });
});
