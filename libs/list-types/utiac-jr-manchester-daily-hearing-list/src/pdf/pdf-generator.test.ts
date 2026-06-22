import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGeneratorFn = vi.fn();
vi.mock("@hmcts/utiac-jr-leeds-daily-hearing-list", () => ({
  createUtiacJrDailyHearingListPdfGenerator: vi.fn(() => mockGeneratorFn)
}));

import { createUtiacJrDailyHearingListPdfGenerator } from "@hmcts/utiac-jr-leeds-daily-hearing-list";
import { generateUtiacJrManchesterDailyHearingListPdf } from "./pdf-generator.js";

const mockOptions = {
  artefactId: "test-artefact-123",
  displayFrom: new Date("2025-01-15"),
  locale: "en" as const,
  locationId: "240",
  jsonData: []
};

describe("generateUtiacJrManchesterDailyHearingListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createUtiacJrDailyHearingListPdfGenerator).mockReturnValue(mockGeneratorFn);
  });

  it("should call factory with the correct list title", async () => {
    // Arrange
    mockGeneratorFn.mockResolvedValue({ success: true });

    // Act
    await generateUtiacJrManchesterDailyHearingListPdf(mockOptions);

    // Assert
    expect(createUtiacJrDailyHearingListPdfGenerator).toHaveBeenCalledWith(
      "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Manchester Daily Hearing List"
    );
  });

  it("should delegate to the generated function and return its result", async () => {
    // Arrange
    const expected = { success: true, pdfPath: "test.pdf", sizeBytes: 100, exceedsMaxSize: false };
    mockGeneratorFn.mockResolvedValue(expected);

    // Act
    const result = await generateUtiacJrManchesterDailyHearingListPdf(mockOptions);

    // Assert
    expect(mockGeneratorFn).toHaveBeenCalledWith(mockOptions);
    expect(result).toEqual(expected);
  });
});
