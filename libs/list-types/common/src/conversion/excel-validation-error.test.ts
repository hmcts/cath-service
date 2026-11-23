import { describe, expect, it } from "vitest";
import { ExcelFileReadError, ExcelValidationError, type ExcelValidationIssue, isExcelFileReadError, isExcelValidationError } from "./excel-validation-error.js";

const ISSUES: ExcelValidationIssue[] = [
  {
    sheetName: "Appeal List",
    rowNumber: 1,
    columnHeader: "Judge",
    reason: "Missing required value",
    message: "Error in row 2: Missing required field 'Judge' in row 2"
  },
  {
    sheetName: "Appeal List",
    rowNumber: 2,
    columnHeader: "Time",
    reason: "Invalid time format '25pm'",
    message: "Error in row 3: Invalid time format '25pm' in row 3"
  }
];

describe("ExcelValidationError", () => {
  it("should use the first issue's legacy message and keep every issue and the partial data", () => {
    // Arrange
    const partialData = { appealList: [] };

    // Act
    const error = new ExcelValidationError(ISSUES, partialData);

    // Assert
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ExcelValidationError");
    expect(error.message).toBe("Error in row 2: Missing required field 'Judge' in row 2");
    expect(error.issues).toEqual(ISSUES);
    expect(error.partialData).toBe(partialData);
  });

  it("should fall back to a generic message when there are no issues", () => {
    // Act
    const error = new ExcelValidationError([]);

    // Assert
    expect(error.message).toBe("Excel file contains invalid data");
    expect(error.partialData).toBeUndefined();
  });
});

describe("ExcelFileReadError", () => {
  it("should keep the original error as its cause", () => {
    // Arrange
    const cause = new Error("Corrupted zip");

    // Act
    const error = new ExcelFileReadError(cause);

    // Assert
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ExcelFileReadError");
    expect(error.message).toBe("Excel file could not be read");
    expect(error.cause).toBe(cause);
  });
});

describe("isExcelValidationError", () => {
  it("should return true for an ExcelValidationError", () => {
    expect(isExcelValidationError(new ExcelValidationError(ISSUES))).toBe(true);
  });

  it.each([new Error("plain"), new ExcelFileReadError(new Error("bad")), "text", undefined])("should return false for %s", (value) => {
    expect(isExcelValidationError(value)).toBe(false);
  });
});

describe("isExcelFileReadError", () => {
  it("should return true for an ExcelFileReadError", () => {
    expect(isExcelFileReadError(new ExcelFileReadError(new Error("bad")))).toBe(true);
  });

  it.each([new Error("plain"), new ExcelValidationError(ISSUES), null])("should return false for %s", (value) => {
    expect(isExcelFileReadError(value)).toBe(false);
  });
});
