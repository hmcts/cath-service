import { describe, expect, it } from "vitest";
import { validateMiReportSelection } from "./validation.js";

const MESSAGES = { periodError: "Select a reporting period", reportTypeError: "Select a report type" };

describe("validateMiReportSelection", () => {
  it("should return valid with the selected period and report type when both are valid", () => {
    // Arrange
    const body = { period: "7", reportType: "user-accounts" };

    // Act
    const result = validateMiReportSelection(body, MESSAGES);

    // Assert
    expect(result.isValid).toBe(true);
    if (result.isValid) {
      expect(result.period).toBe("7");
      expect(result.reportType).toBe("user-accounts");
    }
  });

  it("should accept the 'all' period (from the beginning)", () => {
    // Arrange
    const body = { period: "all", reportType: "all-data" };

    // Act
    const result = validateMiReportSelection(body, MESSAGES);

    // Assert
    expect(result.isValid).toBe(true);
  });

  it("should return the period error first when period is missing", () => {
    // Arrange
    const body = { reportType: "publications" };

    // Act
    const result = validateMiReportSelection(body, MESSAGES);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([{ text: MESSAGES.periodError, href: "#period" }]);
  });

  it("should return the report type error when report type is missing", () => {
    // Arrange
    const body = { period: "14" };

    // Act
    const result = validateMiReportSelection(body, MESSAGES);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([{ text: MESSAGES.reportTypeError, href: "#reportType" }]);
  });

  it("should return both errors in field order when both are missing", () => {
    // Arrange
    const body = {};

    // Act
    const result = validateMiReportSelection(body, MESSAGES);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([
      { text: MESSAGES.periodError, href: "#period" },
      { text: MESSAGES.reportTypeError, href: "#reportType" }
    ]);
  });

  it("should reject array values (tampered input)", () => {
    // Arrange
    const body = { period: ["7"], reportType: ["user-accounts"] };

    // Act
    const result = validateMiReportSelection(body, MESSAGES);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it("should reject unknown period and report type slugs", () => {
    // Arrange
    const body = { period: "99", reportType: "../../etc/passwd" };

    // Act
    const result = validateMiReportSelection(body, MESSAGES);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });
});
