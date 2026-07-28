import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { autoFitColumns, sanitiseCellValue } from "./excel-utilities.js";

function makeWorksheet(rows: string[][]): ExcelJS.Worksheet {
  const worksheet = new ExcelJS.Workbook().addWorksheet("test");
  for (const row of rows) {
    worksheet.addRow(row);
  }
  return worksheet;
}

describe("sanitiseCellValue", () => {
  it("should prefix a value starting with '=' with a single quote", () => {
    expect(sanitiseCellValue("=SUM(A1)")).toBe("'=SUM(A1)");
  });

  it("should prefix a value starting with '+' with a single quote", () => {
    expect(sanitiseCellValue("+123")).toBe("'+123");
  });

  it("should prefix a value starting with '-' with a single quote", () => {
    expect(sanitiseCellValue("-456")).toBe("'-456");
  });

  it("should prefix a value starting with '@' with a single quote", () => {
    expect(sanitiseCellValue("@user")).toBe("'@user");
  });

  it("should not modify values that do not start with injection characters", () => {
    expect(sanitiseCellValue("John Smith")).toBe("John Smith");
  });

  it("should not modify an empty string", () => {
    expect(sanitiseCellValue("")).toBe("");
  });

  it("should not modify values starting with numbers", () => {
    expect(sanitiseCellValue("123")).toBe("123");
  });

  it("should not modify values starting with letters", () => {
    expect(sanitiseCellValue("ABCxyz")).toBe("ABCxyz");
  });
});

describe("autoFitColumns", () => {
  it("should set each column width to its longest value plus padding", () => {
    // Arrange
    const longest = "Manchester Crown Court";
    const worksheet = makeWorksheet([["Court House"], [longest]]);

    // Act
    autoFitColumns(worksheet);

    // Assert
    expect(worksheet.getColumn(1).width).toBe(longest.length + 2);
  });

  it("should size columns independently of each other", () => {
    // Arrange
    const worksheet = makeWorksheet([
      ["Court House", "LJA"],
      ["Manchester Crown Court", "Greater Manchester Area Office"]
    ]);

    // Act
    autoFitColumns(worksheet);

    // Assert
    expect(worksheet.getColumn(1).width).toBe("Manchester Crown Court".length + 2);
    expect(worksheet.getColumn(2).width).toBe("Greater Manchester Area Office".length + 2);
  });

  it("should apply the minimum width when every value is short", () => {
    // Arrange
    const worksheet = makeWorksheet([["Age"], ["45"]]);

    // Act
    autoFitColumns(worksheet);

    // Assert
    expect(worksheet.getColumn(1).width).toBe(10);
  });

  it("should cap the width for very long values", () => {
    // Arrange
    const worksheet = makeWorksheet([["Offence details"], ["x".repeat(500)]]);

    // Act
    autoFitColumns(worksheet);

    // Assert
    expect(worksheet.getColumn(1).width).toBe(60);
  });

  it("should measure the longest line only for multi-line values", () => {
    // Arrange
    const worksheet = makeWorksheet([["Address"], ["1 Main St\nManchester Metro Borough"]]);

    // Act
    autoFitColumns(worksheet);

    // Assert
    expect(worksheet.getColumn(1).width).toBe("Manchester Metro Borough".length + 2);
  });

  it("should not throw when the worksheet has no rows", () => {
    // Arrange
    const worksheet = makeWorksheet([]);

    // Act & Assert
    expect(() => autoFitColumns(worksheet)).not.toThrow();
  });
});
