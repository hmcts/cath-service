import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMagistratesPublicAdultCourtListExcel } from "./excel-generator.js";

vi.mock("@hmcts/list-types-common", () => ({
  autoFitColumns: vi.fn(),
  sanitiseCellValue: vi.fn((v: string) => v),
  saveExcelToStorage: vi.fn().mockResolvedValue({ excelPath: "test-id.xlsx" })
}));

vi.mock("../rendering/renderer.js", () => ({
  renderMagistratesPublicAdultCourtListData: vi.fn()
}));

import { saveExcelToStorage } from "@hmcts/list-types-common";
import { renderMagistratesPublicAdultCourtListData } from "../rendering/renderer.js";

const baseArtefactId = "test-id";
const baseOptions = {
  artefactId: baseArtefactId,
  locationId: "1",
  contentDate: new Date("2025-01-13"),
  locale: "en",
  listTypeName: "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY",
  jsonData: {} as never
};

function makeRenderedData(overrides: Record<string, unknown>[] = []) {
  const listData =
    overrides.length > 0
      ? overrides
      : [
          {
            lja: "Greater Manchester",
            courtName: "Manchester Magistrates Court",
            courtRoom: 5,
            sessionStartTime: "10am",
            cases: [
              {
                blockStartTime: "10:30am",
                defendantName: "Smith, John",
                caseNumber: "CASE123"
              }
            ]
          }
        ];
  return { header: { locationName: "Manchester Magistrates Court" }, listData };
}

describe("generateMagistratesPublicAdultCourtListExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveExcelToStorage).mockResolvedValue({ excelPath: `${baseArtefactId}.xlsx` });
  });

  it("should return success with excelPath when generation succeeds", async () => {
    // Arrange
    vi.mocked(renderMagistratesPublicAdultCourtListData).mockResolvedValue(makeRenderedData() as never);

    // Act
    const result = await generateMagistratesPublicAdultCourtListExcel(baseOptions);

    // Assert
    expect(result.success).toBe(true);
    expect(result.excelPath).toBe(`${baseArtefactId}.xlsx`);
    expect(result.error).toBeUndefined();
  });

  it("should save an Excel buffer to storage", async () => {
    // Arrange
    vi.mocked(renderMagistratesPublicAdultCourtListData).mockResolvedValue(makeRenderedData() as never);

    // Act
    await generateMagistratesPublicAdultCourtListExcel(baseOptions);

    // Assert
    const buffer = vi.mocked(saveExcelToStorage).mock.calls[0]![1];
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it("should render the sitting-at column as the courtroom label with the room number", async () => {
    // Arrange
    vi.mocked(renderMagistratesPublicAdultCourtListData).mockResolvedValue(makeRenderedData() as never);
    const { sanitiseCellValue } = await import("@hmcts/list-types-common");

    // Act
    await generateMagistratesPublicAdultCourtListExcel(baseOptions);

    // Assert
    expect(sanitiseCellValue).toHaveBeenCalledWith("Courtroom 5");
  });

  it("should map listing time to the block start time", async () => {
    // Arrange
    vi.mocked(renderMagistratesPublicAdultCourtListData).mockResolvedValue(makeRenderedData() as never);
    const { sanitiseCellValue } = await import("@hmcts/list-types-common");

    // Act
    await generateMagistratesPublicAdultCourtListExcel(baseOptions);

    // Assert
    expect(sanitiseCellValue).toHaveBeenCalledWith("10:30am");
    expect(sanitiseCellValue).toHaveBeenCalledWith("CASE123");
  });

  it("should write one row per case across multiple sessions", async () => {
    // Arrange
    const data = makeRenderedData([
      {
        lja: "Greater Manchester",
        courtName: "Court A",
        courtRoom: 1,
        sessionStartTime: "10am",
        cases: [{ blockStartTime: "10:15am", defendantName: "Smith, John", caseNumber: "CASE123" }]
      },
      {
        lja: "Greater Manchester",
        courtName: "Court B",
        courtRoom: 2,
        sessionStartTime: "2pm",
        cases: [{ blockStartTime: "2:15pm", defendantName: "Doe, Jane", caseNumber: "CASE999" }]
      }
    ]);
    vi.mocked(renderMagistratesPublicAdultCourtListData).mockResolvedValue(data as never);
    const { sanitiseCellValue } = await import("@hmcts/list-types-common");

    // Act
    await generateMagistratesPublicAdultCourtListExcel(baseOptions);

    // Assert
    expect(sanitiseCellValue).toHaveBeenCalledWith("CASE123");
    expect(sanitiseCellValue).toHaveBeenCalledWith("CASE999");
  });

  it("should handle sessions with no cases without error", async () => {
    // Arrange
    const data = makeRenderedData([{ lja: "LJA", courtName: "Court A", courtRoom: 1, sessionStartTime: "10am", cases: [] }]);
    vi.mocked(renderMagistratesPublicAdultCourtListData).mockResolvedValue(data as never);

    // Act
    const result = await generateMagistratesPublicAdultCourtListExcel(baseOptions);

    // Assert
    expect(result.success).toBe(true);
  });

  it("should use Welsh column labels when the locale is cy", async () => {
    // Arrange
    vi.mocked(renderMagistratesPublicAdultCourtListData).mockResolvedValue(makeRenderedData() as never);
    const { sanitiseCellValue } = await import("@hmcts/list-types-common");

    // Act
    await generateMagistratesPublicAdultCourtListExcel({ ...baseOptions, locale: "cy" });

    // Assert — Welsh courtroom label is "Ystafell llys"
    expect(sanitiseCellValue).toHaveBeenCalledWith("Ystafell llys 5");
  });

  it("should return a failure result when saving throws", async () => {
    // Arrange
    vi.mocked(renderMagistratesPublicAdultCourtListData).mockResolvedValue(makeRenderedData() as never);
    vi.mocked(saveExcelToStorage).mockRejectedValue(new Error("storage down"));

    // Act
    const result = await generateMagistratesPublicAdultCourtListExcel(baseOptions);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("storage down");
  });
});
