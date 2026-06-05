import { describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/daily-cause-list-common", () => ({
  generateDailyCauseListPdf: vi.fn()
}));

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    CFT_IDAM: "CFT IDAM"
  }
}));

import { generateDailyCauseListPdf } from "@hmcts/daily-cause-list-common";
import { generateFamilyDailyCauseListPdf } from "./pdf-generator.js";

const mockCauseListData = {
  document: { publicationDate: "2025-11-12T09:00:00.000Z" },
  venue: {
    venueName: "Oxford Family Court",
    venueAddress: { line: ["St Aldate's"], town: "Oxford", postCode: "OX1 1TL" }
  },
  courtLists: []
};

describe("generateFamilyDailyCauseListPdf", () => {
  it("should delegate to generateDailyCauseListPdf with resolved provenance label", async () => {
    vi.mocked(generateDailyCauseListPdf).mockResolvedValue({ success: true, sizeBytes: 1024 });

    const options = {
      artefactId: "test-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData,
      provenance: "MANUAL_UPLOAD"
    };

    const result = await generateFamilyDailyCauseListPdf(options);

    expect(generateDailyCauseListPdf).toHaveBeenCalledWith(
      expect.objectContaining({ provenanceLabel: "Manual Upload" }),
      expect.any(String),
      expect.any(Function),
      expect.any(Function)
    );
    expect(result.success).toBe(true);
    expect(result.sizeBytes).toBe(1024);
  });

  it("should use empty provenance label when provenance is not provided", async () => {
    vi.mocked(generateDailyCauseListPdf).mockResolvedValue({ success: true, sizeBytes: 512 });

    await generateFamilyDailyCauseListPdf({
      artefactId: "no-provenance",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
    });

    expect(generateDailyCauseListPdf).toHaveBeenCalledWith(
      expect.objectContaining({ provenanceLabel: "" }),
      expect.any(String),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("should return error result when generateDailyCauseListPdf fails", async () => {
    vi.mocked(generateDailyCauseListPdf).mockResolvedValue({ success: false, error: "PDF generation failed" });

    const result = await generateFamilyDailyCauseListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });
});
