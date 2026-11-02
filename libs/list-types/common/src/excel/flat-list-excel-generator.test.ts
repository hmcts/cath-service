import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/azure-blob", () => ({
  CONTAINER: { PUBLICATIONS: "publications" },
  uploadBlob: vi.fn().mockResolvedValue(undefined)
}));

import { CONTAINER, uploadBlob } from "@hmcts/azure-blob";
import { generateFlatListExcel } from "./flat-list-excel-generator.js";

interface TestRow {
  name: string;
  note?: string;
}

const COLUMNS = [
  { header: "Name", value: (row: TestRow) => row.name },
  { header: "Note", value: (row: TestRow) => row.note }
];

async function loadWorksheet(): Promise<ExcelJS.Worksheet> {
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

describe("generateFlatListExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(uploadBlob).mockResolvedValue(undefined as never);
  });

  it("should write a bold header row followed by one row per item", async () => {
    // Arrange
    const rows = [
      { name: "Alpha", note: "First" },
      { name: "Beta", note: "Second" }
    ];

    // Act
    const result = await generateFlatListExcel({ artefactId: "abc", columns: COLUMNS, rows });

    // Assert
    expect(result).toEqual({ success: true, excelPath: "abc.xlsx" });
    const worksheet = await loadWorksheet();
    expect(rowValues(worksheet, 1)).toEqual(["Name", "Note"]);
    expect(worksheet.getRow(1).font?.bold).toBe(true);
    expect(rowValues(worksheet, 2)).toEqual(["Alpha", "First"]);
    expect(rowValues(worksheet, 3)).toEqual(["Beta", "Second"]);
    expect(worksheet.rowCount).toBe(3);
  });

  it("should prefix values that start with a formula character", async () => {
    // Arrange
    const rows = [{ name: '=HYPERLINK("http://x")', note: "@cmd" }];

    // Act
    await generateFlatListExcel({ artefactId: "abc", columns: COLUMNS, rows });

    // Assert
    const worksheet = await loadWorksheet();
    expect(rowValues(worksheet, 2)).toEqual(['\'=HYPERLINK("http://x")', "'@cmd"]);
  });

  it("should write an empty string when a value is undefined", async () => {
    // Arrange
    const rows = [{ name: "Alpha" }];

    // Act
    const result = await generateFlatListExcel({ artefactId: "abc", columns: COLUMNS, rows });

    // Assert
    expect(result.success).toBe(true);
    const worksheet = await loadWorksheet();
    expect(worksheet.getRow(2).getCell(1).value).toBe("Alpha");
    expect(worksheet.getRow(2).getCell(2).value ?? "").toBe("");
  });

  it("should write a header-only sheet when there are no rows", async () => {
    // Act
    const result = await generateFlatListExcel<TestRow>({ artefactId: "abc", columns: COLUMNS, rows: [] });

    // Assert
    expect(result.success).toBe(true);
    const worksheet = await loadWorksheet();
    expect(worksheet.rowCount).toBe(1);
    expect(rowValues(worksheet, 1)).toEqual(["Name", "Note"]);
  });

  it("should name the single worksheet Sheet1", async () => {
    // Act
    await generateFlatListExcel({ artefactId: "abc", columns: COLUMNS, rows: [{ name: "Alpha" }] });

    // Assert
    const worksheet = await loadWorksheet();
    expect(worksheet.name).toBe("Sheet1");
  });

  it("should upload the workbook as <artefactId>.xlsx to the publications container", async () => {
    // Act
    await generateFlatListExcel({ artefactId: "artefact-123", columns: COLUMNS, rows: [{ name: "Alpha" }] });

    // Assert
    expect(uploadBlob).toHaveBeenCalledWith(
      "artefact-123.xlsx",
      expect.any(Buffer),
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      CONTAINER.PUBLICATIONS
    );
  });

  it("should return success false with the error message when the upload fails", async () => {
    // Arrange
    vi.mocked(uploadBlob).mockRejectedValueOnce(new Error("Blob unavailable"));

    // Act
    const result = await generateFlatListExcel({ artefactId: "abc", columns: COLUMNS, rows: [{ name: "Alpha" }] });

    // Assert
    expect(result).toEqual({ success: false, error: "Blob unavailable" });
  });

  it("should stringify non-Error failures", async () => {
    // Arrange
    vi.mocked(uploadBlob).mockRejectedValueOnce("network down");

    // Act
    const result = await generateFlatListExcel({ artefactId: "abc", columns: COLUMNS, rows: [{ name: "Alpha" }] });

    // Assert
    expect(result).toEqual({ success: false, error: "network down" });
  });
});
