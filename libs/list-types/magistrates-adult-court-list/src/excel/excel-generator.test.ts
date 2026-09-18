import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMagistratesAdultCourtListExcel } from "./excel-generator.js";

vi.mock("@hmcts/list-types-common", () => ({
  autoFitColumns: vi.fn(),
  sanitiseCellValue: vi.fn((v: string) => v),
  saveExcelToStorage: vi.fn().mockResolvedValue({ excelPath: "test-id.xlsx" })
}));

vi.mock("../rendering/renderer.js", () => ({
  renderMagistratesAdultCourtList: vi.fn()
}));

import { saveExcelToStorage } from "@hmcts/list-types-common";
import { renderMagistratesAdultCourtList } from "../rendering/renderer.js";

const baseArtefactId = "test-id";
const baseOptions = {
  artefactId: baseArtefactId,
  locationId: "1",
  contentDate: new Date("2025-01-13"),
  locale: "en",
  listTypeName: "MAGISTRATES_ADULT_COURT_LIST_DAILY",
  jsonData: {} as never
};

function makeRenderedData(overrides: Record<string, unknown> = {}) {
  return {
    header: { locationName: "Manchester Magistrates Court" },
    openJustice: null,
    listData: {
      sessions: [
        {
          court: "Manchester Magistrates Court",
          lja: "Greater Manchester",
          room: 5,
          sessionStart: "10am",
          cases: [
            {
              blockStart: "10:30am",
              caseNumber: "CASE123",
              defendantName: "Smith, John",
              dateOfBirth: "01/01/1990",
              age: "35",
              address: "1 High Street, Manchester, M1 1AA",
              informant: "CPS",
              offenceCode: "TH68001, TH68002",
              offenceTitle: "Theft, Handling stolen goods",
              offenceSummary: "Stole goods, Handled stolen goods"
            }
          ]
        }
      ],
      ...overrides
    }
  };
}

describe("generateMagistratesAdultCourtListExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveExcelToStorage).mockResolvedValue({ excelPath: `${baseArtefactId}.xlsx` });
  });

  it("should return success with excelPath when generation succeeds", async () => {
    // Arrange
    vi.mocked(renderMagistratesAdultCourtList).mockResolvedValue(makeRenderedData() as never);

    // Act
    const result = await generateMagistratesAdultCourtListExcel(baseOptions);

    // Assert
    expect(result.success).toBe(true);
    expect(result.excelPath).toBe(`${baseArtefactId}.xlsx`);
    expect(result.error).toBeUndefined();
  });

  it("should save an Excel buffer to storage", async () => {
    // Arrange
    vi.mocked(renderMagistratesAdultCourtList).mockResolvedValue(makeRenderedData() as never);

    // Act
    await generateMagistratesAdultCourtListExcel(baseOptions);

    // Assert
    const buffer = vi.mocked(saveExcelToStorage).mock.calls[0]![1];
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it("should use header-independent session court name for the court house column", async () => {
    // Arrange
    vi.mocked(renderMagistratesAdultCourtList).mockResolvedValue(makeRenderedData() as never);
    const { sanitiseCellValue } = await import("@hmcts/list-types-common");

    // Act
    await generateMagistratesAdultCourtListExcel(baseOptions);

    // Assert
    expect(sanitiseCellValue).toHaveBeenCalledWith("Manchester Magistrates Court");
  });

  it("should render the sitting-at column as the courtroom label with the room number", async () => {
    // Arrange
    vi.mocked(renderMagistratesAdultCourtList).mockResolvedValue(makeRenderedData() as never);
    const { sanitiseCellValue } = await import("@hmcts/list-types-common");

    // Act
    await generateMagistratesAdultCourtListExcel(baseOptions);

    // Assert
    expect(sanitiseCellValue).toHaveBeenCalledWith("Courtroom 5");
  });

  it("should write the comma-joined offence code, title and summary for a case", async () => {
    // Arrange
    vi.mocked(renderMagistratesAdultCourtList).mockResolvedValue(makeRenderedData() as never);
    const { sanitiseCellValue } = await import("@hmcts/list-types-common");

    // Act
    await generateMagistratesAdultCourtListExcel(baseOptions);

    // Assert
    expect(sanitiseCellValue).toHaveBeenCalledWith("TH68001, TH68002");
    expect(sanitiseCellValue).toHaveBeenCalledWith("Theft, Handling stolen goods");
    expect(sanitiseCellValue).toHaveBeenCalledWith("Stole goods, Handled stolen goods");
  });

  it("should write one row per case across multiple sessions", async () => {
    // Arrange
    const data = makeRenderedData();
    data.listData.sessions.push({
      court: "Second Court",
      lja: "Greater Manchester",
      room: 2,
      sessionStart: "2pm",
      cases: [
        {
          blockStart: "2:15pm",
          caseNumber: "CASE999",
          defendantName: "Doe, Jane",
          dateOfBirth: "02/02/1985",
          age: "40",
          address: "2 Low Street",
          informant: "DVLA",
          offenceCode: "RT88001",
          offenceTitle: "Speeding",
          offenceSummary: "Exceeded speed limit"
        }
      ]
    });
    vi.mocked(renderMagistratesAdultCourtList).mockResolvedValue(data as never);
    const { sanitiseCellValue } = await import("@hmcts/list-types-common");

    // Act
    await generateMagistratesAdultCourtListExcel(baseOptions);

    // Assert
    expect(sanitiseCellValue).toHaveBeenCalledWith("CASE123");
    expect(sanitiseCellValue).toHaveBeenCalledWith("CASE999");
  });

  it("should handle sessions with no cases without error", async () => {
    // Arrange
    const data = makeRenderedData();
    data.listData.sessions[0]!.cases = [];
    vi.mocked(renderMagistratesAdultCourtList).mockResolvedValue(data as never);

    // Act
    const result = await generateMagistratesAdultCourtListExcel(baseOptions);

    // Assert
    expect(result.success).toBe(true);
  });

  it("should use Welsh column labels when the locale is cy", async () => {
    // Arrange
    vi.mocked(renderMagistratesAdultCourtList).mockResolvedValue(makeRenderedData() as never);
    const { sanitiseCellValue } = await import("@hmcts/list-types-common");

    // Act
    await generateMagistratesAdultCourtListExcel({ ...baseOptions, locale: "cy" });

    // Assert — Welsh courtroom label is "Ystafell llys"
    expect(sanitiseCellValue).toHaveBeenCalledWith("Ystafell llys 5");
  });

  it("should return a failure result when saving throws", async () => {
    // Arrange
    vi.mocked(renderMagistratesAdultCourtList).mockResolvedValue(makeRenderedData() as never);
    vi.mocked(saveExcelToStorage).mockRejectedValue(new Error("storage down"));

    // Act
    const result = await generateMagistratesAdultCourtListExcel(baseOptions);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("storage down");
  });
});
