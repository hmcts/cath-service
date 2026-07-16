import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGenerateDailyCauseListPdf } = vi.hoisted(() => ({
  mockGenerateDailyCauseListPdf: vi.fn()
}));

vi.mock("@hmcts/daily-cause-list-common", () => ({
  generateDailyCauseListPdf: mockGenerateDailyCauseListPdf
}));

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    SNL: "SNL"
  }
}));

import { generateEtDailyListPdf } from "./pdf-generator.js";

const mockCauseListData = {
  document: { publicationDate: "2025-11-12T09:00:00.000Z" },
  venue: {
    venueName: "Leeds Employment Tribunal",
    venueContact: { venueTelephone: "0113 245 9741", venueEmail: "leedset@justice.gov.uk" }
  },
  courtLists: []
};

describe("generateEtDailyListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateDailyCauseListPdf.mockResolvedValue({
      success: true,
      pdfPath: "/storage/temp/uploads/et-daily-123.pdf",
      sizeBytes: 1024,
      exceedsMaxSize: false
    });
  });

  it("should delegate to the shared cause list PDF generator and return its result", async () => {
    // Act
    const result = await generateEtDailyListPdf({
      artefactId: "et-daily-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("et-daily-123.pdf");
    expect(mockGenerateDailyCauseListPdf).toHaveBeenCalledTimes(1);
  });

  it("should map the provenance to its display label", async () => {
    // Act
    await generateEtDailyListPdf({
      artefactId: "provenance-test",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData,
      provenance: "MANUAL_UPLOAD"
    });

    // Assert
    expect(mockGenerateDailyCauseListPdf).toHaveBeenCalledWith(
      expect.objectContaining({ provenanceLabel: "Manual Upload" }),
      expect.any(String),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("should pass an empty provenance label when provenance is absent", async () => {
    // Act
    await generateEtDailyListPdf({
      artefactId: "no-provenance",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
    });

    // Assert
    expect(mockGenerateDailyCauseListPdf).toHaveBeenCalledWith(
      expect.objectContaining({ provenanceLabel: "" }),
      expect.any(String),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("should forward the original options and locale to the shared generator", async () => {
    // Act
    await generateEtDailyListPdf({
      artefactId: "render-options",
      contentDate: new Date("2025-06-15"),
      locale: "cy",
      locationId: "999",
      jsonData: mockCauseListData
    });

    // Assert
    expect(mockGenerateDailyCauseListPdf).toHaveBeenCalledWith(
      expect.objectContaining({ artefactId: "render-options", locale: "cy", locationId: "999", jsonData: mockCauseListData }),
      expect.any(String),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("should propagate a failure result from the shared generator", async () => {
    // Arrange
    mockGenerateDailyCauseListPdf.mockResolvedValue({ success: false, error: "Puppeteer crashed" });

    // Act
    const result = await generateEtDailyListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
  });
});
