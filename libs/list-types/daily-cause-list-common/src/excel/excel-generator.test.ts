import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn().mockResolvedValue({ name: "Test Court", welshName: "Llys Prawf" })
}));

vi.mock("@hmcts/azure-blob", () => ({
  CONTAINER: { PUBLICATIONS: "publications" },
  uploadBlob: vi.fn().mockResolvedValue(undefined)
}));

import { uploadBlob } from "@hmcts/azure-blob";
import { type CauseListExcelColumn, combinePartyWithRepresentative, formatCaseName, formatDuration, generateCauseListExcel } from "./excel-generator.js";

const CONTEXT_HEADERS = { courtHouse: "Court House", courtRoom: "Court Room", judge: "Judge" };

const COLUMNS: CauseListExcelColumn[] = [
  { header: "Time", accessor: (c) => c.sitting.time ?? "" },
  { header: "Case ref", accessor: (c) => c.caseItem.caseNumber ?? "" },
  { header: "Case name", accessor: (c) => c.caseItem.caseName ?? "" },
  { header: "Duration", accessor: (c) => c.duration },
  { header: "Reporting Restriction", accessor: (c) => c.caseItem.formattedReportingRestriction ?? "" }
];

function buildCase(overrides: Record<string, unknown> = {}) {
  return {
    caseNumber: "CASE1",
    caseName: "Smith v Jones",
    caseType: "Civil",
    reportingRestrictionDetail: [],
    party: [],
    ...overrides
  };
}

function buildJsonData(cases: Array<Record<string, unknown>>) {
  return {
    document: { publicationDate: "2025-01-13T10:00:00Z" },
    venue: { venueName: "Test Court" },
    courtLists: [
      {
        courtHouse: {
          courtHouseName: "Test Court House",
          courtRoom: [
            {
              courtRoomName: "Court 1",
              session: [
                {
                  judiciary: [{ johKnownAs: "Judge Smith", isPresiding: true }],
                  sessionChannel: ["In Person"],
                  sittings: [
                    {
                      sittingStart: "2025-01-13T10:00:00Z",
                      sittingEnd: "2025-01-13T12:30:00Z",
                      hearing: [{ hearingType: "Trial", case: cases }]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  } as never;
}

const baseOptions = {
  artefactId: "test-id",
  locationId: "1",
  contentDate: new Date("2025-01-13"),
  locale: "en",
  worksheetName: "Civil Daily Cause List",
  contextHeaders: CONTEXT_HEADERS,
  columns: COLUMNS
};

async function readWorkbook(): Promise<ExcelJS.Worksheet> {
  const [, buffer] = vi.mocked(uploadBlob).mock.calls[0];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as Buffer);
  return workbook.worksheets[0];
}

function rowValues(worksheet: ExcelJS.Worksheet, rowNumber: number): string[] {
  const values: string[] = [];
  worksheet.getRow(rowNumber).eachCell({ includeEmpty: true }, (cell) => {
    values.push(String(cell.value ?? ""));
  });
  return values;
}

describe("generateCauseListExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should write the context columns followed by the configured columns in the header row", async () => {
    // Arrange
    const options = { ...baseOptions, jsonData: buildJsonData([buildCase()]) };

    // Act
    const result = await generateCauseListExcel(options);

    // Assert
    expect(result.success).toBe(true);
    expect(result.excelPath).toBe("test-id.xlsx");
    const worksheet = await readWorkbook();
    expect(rowValues(worksheet, 1)).toEqual(["Court House", "Court Room", "Judge", "Time", "Case ref", "Case name", "Duration", "Reporting Restriction"]);
  });

  it("should emit one row per case carrying court house, court room and judge context on every row", async () => {
    // Arrange
    const options = { ...baseOptions, jsonData: buildJsonData([buildCase({ caseNumber: "C1" }), buildCase({ caseNumber: "C2" })]) };

    // Act
    await generateCauseListExcel(options);

    // Assert
    const worksheet = await readWorkbook();
    expect(worksheet.rowCount).toBe(3);
    expect(rowValues(worksheet, 2).slice(0, 3)).toEqual(["Test Court House", "Court 1", "Judge Smith"]);
    expect(rowValues(worksheet, 3).slice(0, 3)).toEqual(["Test Court House", "Court 1", "Judge Smith"]);
    expect(rowValues(worksheet, 2)[4]).toBe("C1");
    expect(rowValues(worksheet, 3)[4]).toBe("C2");
  });

  it("should place the formatted duration in the duration column", async () => {
    // Arrange
    const options = { ...baseOptions, jsonData: buildJsonData([buildCase()]) };

    // Act
    await generateCauseListExcel(options);

    // Assert
    const worksheet = await readWorkbook();
    expect(rowValues(worksheet, 2)[6]).toBe("2 hours 30 mins");
  });

  it("should write reporting restrictions in their own column", async () => {
    // Arrange
    const options = { ...baseOptions, jsonData: buildJsonData([buildCase({ reportingRestrictionDetail: ["Restricted"] })]) };

    // Act
    await generateCauseListExcel(options);

    // Assert
    const worksheet = await readWorkbook();
    expect(rowValues(worksheet, 2)[7]).toBe("Restricted");
  });

  it("should escape a formula-like case name to prevent CSV injection", async () => {
    // Arrange
    const options = { ...baseOptions, jsonData: buildJsonData([buildCase({ caseName: "=cmd()" })]) };

    // Act
    await generateCauseListExcel(options);

    // Assert
    const worksheet = await readWorkbook();
    expect(rowValues(worksheet, 2)[5]).toBe("'=cmd()");
  });

  it("should write a header-only workbook when the list has no cases", async () => {
    // Arrange
    const options = { ...baseOptions, jsonData: buildJsonData([]) };

    // Act
    await generateCauseListExcel(options);

    // Assert
    const worksheet = await readWorkbook();
    expect(worksheet.rowCount).toBe(1);
  });

  it("should return failure when saving throws", async () => {
    // Arrange
    vi.mocked(uploadBlob).mockRejectedValueOnce(new Error("upload failed"));
    const options = { ...baseOptions, jsonData: buildJsonData([buildCase()]) };

    // Act
    const result = await generateCauseListExcel(options);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("upload failed");
  });
});

describe("combinePartyWithRepresentative", () => {
  it("should join the party and representative with the legal advisor label", () => {
    expect(combinePartyWithRepresentative("John Smith", "Jane Doe", "Legal Advisor")).toBe("John Smith, Legal Advisor: Jane Doe");
  });

  it("should return the party alone when there is no representative", () => {
    expect(combinePartyWithRepresentative("John Smith", "", "Legal Advisor")).toBe("John Smith");
  });

  it("should return the labelled representative alone when there is no party", () => {
    expect(combinePartyWithRepresentative("", "Jane Doe", "Legal Advisor")).toBe("Legal Advisor: Jane Doe");
  });

  it("should return an empty string when neither party nor representative is present", () => {
    expect(combinePartyWithRepresentative("", "", "Legal Advisor")).toBe("");
  });
});

describe("formatCaseName", () => {
  it("should append the sequence indicator in brackets when present", () => {
    expect(formatCaseName("Smith v Jones", "1 of 2")).toBe("Smith v Jones [1 of 2]");
  });

  it("should return the case name unchanged when there is no sequence indicator", () => {
    expect(formatCaseName("Smith v Jones", undefined)).toBe("Smith v Jones");
  });

  it("should return an empty string when the case name is undefined", () => {
    expect(formatCaseName(undefined, undefined)).toBe("");
  });
});

describe("formatDuration", () => {
  it("should format hours and minutes", () => {
    expect(formatDuration(2, 30)).toBe("2 hours 30 mins");
  });

  it("should use singular forms for one hour and one minute", () => {
    expect(formatDuration(1, 1)).toBe("1 hour 1 min");
  });

  it("should return an empty string when there is no duration", () => {
    expect(formatDuration(0, 0)).toBe("");
  });
});
