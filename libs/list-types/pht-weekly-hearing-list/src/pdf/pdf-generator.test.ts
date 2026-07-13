import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/list-types-common", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/list-types-common")>();
  return {
    ...actual,
    configureNunjucks: vi.fn().mockReturnValue({
      render: vi.fn().mockReturnValue("<html>mock pdf html</html>")
    }),
    loadTranslations: vi.fn().mockResolvedValue({ pageTitle: "Primary Health Tribunal Weekly Hearing List" }),
    savePdfToStorage: vi.fn().mockResolvedValue({ success: true }),
    createPdfErrorResult: vi.fn().mockReturnValue({ success: false, error: "error" })
  };
});

vi.mock("@hmcts/pdf-generation", () => ({
  generatePdfFromHtml: vi.fn().mockResolvedValue({ success: true, pdfBuffer: Buffer.from("pdf"), sizeBytes: 3 })
}));

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: { MANUAL_UPLOAD: "Manual Upload" }
}));

import { generatePhtWeeklyHearingListPdf } from "./pdf-generator.js";

describe("generatePhtWeeklyHearingListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate PDF successfully", async () => {
    const { savePdfToStorage } = await import("@hmcts/list-types-common");
    vi.mocked(savePdfToStorage).mockResolvedValue({ success: true });

    const result = await generatePhtWeeklyHearingListPdf({
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
      provenance: "MANUAL_UPLOAD",
      contentDate: new Date(2025, 0, 2)
    });

    expect(result.success).toBe(true);
  });
});
