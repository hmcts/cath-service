import type { ExcelValidationIssue } from "@hmcts/list-types-common";
import { describe, expect, it } from "vitest";
import { formatExcelValidationErrors } from "./excel-error-messages.js";

function buildIssue(overrides: Partial<ExcelValidationIssue> = {}): ExcelValidationIssue {
  return { reason: "Missing required value", message: "legacy message", ...overrides };
}

describe("formatExcelValidationErrors", () => {
  it("should format a multi-tab cell issue with tab, row and column only, without the reason", () => {
    // Arrange
    const issues = [buildIssue({ sheetName: "Appeal List", rowNumber: 5, columnHeader: "Time", reason: "Invalid time format 'half ten'" })];

    // Act
    const result = formatExcelValidationErrors(issues);

    // Assert
    expect(result).toEqual([{ text: "Sheet 'Appeal List' - Row 5 of 'Time' column", href: "#file" }]);
  });

  it("should format a single-tab cell issue with row and column only, without the reason", () => {
    // Arrange
    const issues = [buildIssue({ rowNumber: 5, columnHeader: "Judge" })];

    // Act
    const result = formatExcelValidationErrors(issues);

    // Assert
    expect(result).toEqual([{ text: "Row 5 of 'Judge' column", href: "#file" }]);
  });

  it("should keep the reason for a tab-level issue", () => {
    // Arrange
    const issues = [buildIssue({ sheetName: "Patents Court", reason: "Missing columns: Time, Venue" })];

    // Act
    const result = formatExcelValidationErrors(issues);

    // Assert
    expect(result[0].text).toBe("Sheet 'Patents Court': Missing columns: Time, Venue");
  });

  it("should format a missing tab issue", () => {
    // Arrange
    const issues = [buildIssue({ sheetName: "Patents Court", reason: "Sheet is missing from the file" })];

    // Act
    const result = formatExcelValidationErrors(issues);

    // Assert
    expect(result[0].text).toBe("Sheet 'Patents Court': Sheet is missing from the file");
  });

  it("should format row-level issues with and without a tab, without the reason", () => {
    // Arrange
    const issues = [
      buildIssue({ sheetName: "Appeal List", rowNumber: 7, reason: "must have required property 'judge'" }),
      buildIssue({ rowNumber: 3, reason: "must be object" })
    ];

    // Act
    const result = formatExcelValidationErrors(issues);

    // Assert
    expect(result.map((error) => error.text)).toEqual(["Sheet 'Appeal List' - Row 7", "Row 3"]);
  });

  it("should show the reason on its own when the issue has no location", () => {
    // Arrange
    const issues = [buildIssue({ reason: "must be array" })];

    // Act
    const result = formatExcelValidationErrors(issues);

    // Assert
    expect(result[0].text).toBe("must be array");
  });

  it("should list every issue with no cap", () => {
    // Arrange
    const issues = Array.from({ length: 150 }, (_, index) => buildIssue({ rowNumber: index + 1, columnHeader: "Judge" }));

    // Act
    const result = formatExcelValidationErrors(issues);

    // Assert
    expect(result).toHaveLength(150);
    expect(result.every((error) => error.href === "#file")).toBe(true);
  });

  it("should order rows numerically within a tab, keeping tab and column order as received", () => {
    // Arrange
    const issues = [
      buildIssue({ sheetName: "Appeal List", rowNumber: 10, columnHeader: "Judge" }),
      buildIssue({ sheetName: "Appeal List", rowNumber: 2, columnHeader: "Venue" }),
      buildIssue({ sheetName: "Business List", rowNumber: 1, columnHeader: "Judge" }),
      buildIssue({ sheetName: "Appeal List", rowNumber: 2, columnHeader: "Time" })
    ];

    // Act
    const result = formatExcelValidationErrors(issues);

    // Assert
    expect(result.map((error) => error.text)).toEqual([
      "Sheet 'Appeal List' - Row 2 of 'Venue' column",
      "Sheet 'Appeal List' - Row 2 of 'Time' column",
      "Sheet 'Appeal List' - Row 10 of 'Judge' column",
      "Sheet 'Business List' - Row 1 of 'Judge' column"
    ]);
  });

  it("should put a tab-level issue before the rows of its tab", () => {
    // Arrange
    const issues = [
      buildIssue({ sheetName: "Appeal List", rowNumber: 1, columnHeader: "Judge" }),
      buildIssue({ sheetName: "Appeal List", reason: "Missing columns: Time" })
    ];

    // Act
    const result = formatExcelValidationErrors(issues);

    // Assert
    expect(result[0].text).toBe("Sheet 'Appeal List': Missing columns: Time");
  });

  it("should list identical locations once", () => {
    // Arrange
    const issues = [
      buildIssue({ rowNumber: 2, columnHeader: "Time", reason: "must be string" }),
      buildIssue({ rowNumber: 2, columnHeader: "Time", reason: "must match pattern" })
    ];

    // Act
    const result = formatExcelValidationErrors(issues);

    // Assert
    expect(result).toEqual([{ text: "Row 2 of 'Time' column", href: "#file" }]);
  });

  it("should return an empty list when there are no issues", () => {
    expect(formatExcelValidationErrors([])).toEqual([]);
  });
});
