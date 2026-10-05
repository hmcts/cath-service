import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { ExcelConverterConfig } from "./excel-to-json.js";
import { createMultiSheetConverter, resolveWorksheet } from "./multi-sheet-converter.js";

const CONFIG: ExcelConverterConfig = {
  fields: [{ header: "Venue", fieldName: "venue", required: true }],
  minRows: 0
};

function buildWorkbook(sheetNames: string[]): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  for (const name of sheetNames) {
    const worksheet = workbook.addWorksheet(name);
    worksheet.addRow(["Venue"]);
    worksheet.addRow([`${name} venue`]);
  }
  return workbook;
}

describe("resolveWorksheet", () => {
  it("should return the worksheet matching the name", () => {
    // Arrange
    const workbook = buildWorkbook(["Other", "Planning Court"]);

    // Act
    const worksheet = resolveWorksheet(workbook, { worksheetName: "Planning Court", worksheetIndex: 0 });

    // Assert
    expect(worksheet?.name).toBe("Planning Court");
  });

  it("should fall back to the index when the name is not found", () => {
    // Arrange
    const workbook = buildWorkbook(["Sheet1", "Sheet2"]);

    // Act
    const worksheet = resolveWorksheet(workbook, { worksheetName: "Planning Court", worksheetIndex: 1 });

    // Assert
    expect(worksheet?.name).toBe("Sheet2");
  });

  it("should use the index when no name is given", () => {
    // Arrange
    const workbook = buildWorkbook(["Sheet1", "Sheet2"]);

    // Act
    const worksheet = resolveWorksheet(workbook, { worksheetIndex: 1 });

    // Assert
    expect(worksheet?.name).toBe("Sheet2");
  });

  it("should return undefined when neither name nor index resolve", () => {
    // Arrange
    const workbook = buildWorkbook(["Sheet1"]);

    // Act
    const worksheet = resolveWorksheet(workbook, { worksheetName: "Missing", worksheetIndex: 3 });

    // Assert
    expect(worksheet).toBeUndefined();
  });
});

describe("createMultiSheetConverter", () => {
  it("should convert sheets resolved by name and by index fallback", async () => {
    // Arrange
    const buffer = Buffer.from(await buildWorkbook(["Main hearings", "Second"]).xlsx.writeBuffer());

    // Act
    const result = await createMultiSheetConverter(buffer, [
      { worksheetName: "Main hearings", worksheetIndex: 0, dataKey: "main", config: CONFIG },
      { worksheetName: "Planning Court", worksheetIndex: 1, dataKey: "planning", config: CONFIG }
    ]);

    // Assert
    expect(result).toEqual({
      main: [{ venue: "Main hearings venue" }],
      planning: [{ venue: "Second venue" }]
    });
  });

  it("should return an empty array for a sheet that cannot be resolved", async () => {
    // Arrange
    const buffer = Buffer.from(await buildWorkbook(["Main hearings"]).xlsx.writeBuffer());

    // Act
    const result = await createMultiSheetConverter(buffer, [
      { worksheetName: "Main hearings", worksheetIndex: 0, dataKey: "main", config: CONFIG },
      { worksheetName: "Planning Court", worksheetIndex: 1, dataKey: "planning", config: CONFIG }
    ]);

    // Assert
    expect(result.planning).toEqual([]);
  });
});
