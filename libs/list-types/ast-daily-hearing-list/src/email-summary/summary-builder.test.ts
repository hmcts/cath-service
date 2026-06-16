import { describe, expect, it } from "vitest";
import type { AstDailyHearingList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    // Assert
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});

describe("extractCaseSummary", () => {
  it("should extract case summaries from hearing list", () => {
    // Arrange
    const hearingList: AstDailyHearingList = [
      {
        appellant: "John Smith",
        appealReferenceNumber: "AST/2025/00123",
        caseType: "Section 95",
        hearingType: "Remote - Teams",
        hearingTime: "10:30am",
        additionalInformation: "Interpreter required"
      }
    ];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Appellant", value: "John Smith" },
      { label: "Appeal reference number", value: "AST/2025/00123" },
      { label: "Hearing time", value: "10:30am" }
    ]);
  });

  it("should handle empty hearing list", () => {
    // Arrange
    const hearingList: AstDailyHearingList = [];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result).toHaveLength(0);
  });

  it("should handle missing fields with empty string", () => {
    // Arrange
    const hearingList: AstDailyHearingList = [
      {
        appellant: "",
        appealReferenceNumber: "",
        caseType: "",
        hearingType: "",
        hearingTime: "",
        additionalInformation: ""
      }
    ];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Appellant", value: "" },
      { label: "Appeal reference number", value: "" },
      { label: "Hearing time", value: "" }
    ]);
  });

  it("should extract multiple case summaries", () => {
    // Arrange
    const hearingList: AstDailyHearingList = [
      {
        appellant: "John Smith",
        appealReferenceNumber: "AST/2025/00123",
        caseType: "Section 95",
        hearingType: "Remote - Teams",
        hearingTime: "10:30am",
        additionalInformation: "Interpreter required"
      },
      {
        appellant: "Jane Doe",
        appealReferenceNumber: "AST/2025/00124",
        caseType: "Section 4",
        hearingType: "In-person",
        hearingTime: "2pm",
        additionalInformation: ""
      }
    ];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0][0]).toEqual({ label: "Appellant", value: "John Smith" });
    expect(result[1][0]).toEqual({ label: "Appellant", value: "Jane Doe" });
  });

  it("should only extract specified fields", () => {
    // Arrange
    const hearingList: AstDailyHearingList = [
      {
        appellant: "John Smith",
        appealReferenceNumber: "AST/2025/00123",
        caseType: "Section 95",
        hearingType: "Remote - Teams",
        hearingTime: "10:30am",
        additionalInformation: "Interpreter required"
      }
    ];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result[0]).toHaveLength(3);
    expect(result[0].map((item) => item.label)).toEqual(["Appellant", "Appeal reference number", "Hearing time"]);
    expect(result[0].some((item) => item.label === "Case type")).toBe(false);
    expect(result[0].some((item) => item.label === "Hearing type")).toBe(false);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format single case summary correctly", () => {
    // Arrange
    const items = [
      [
        { label: "Appellant", value: "John Smith" },
        { label: "Appeal reference number", value: "AST/2025/00123" },
        { label: "Hearing time", value: "10:30am" }
      ]
    ];

    // Act
    const result = formatCaseSummaryForEmail(items);

    // Assert
    expect(result).toContain("Appellant - John Smith");
    expect(result).toContain("Appeal reference number - AST/2025/00123");
    expect(result).toContain("Hearing time - 10:30am");
  });

  it("should handle empty case list", () => {
    // Arrange
    const items: any[] = [];

    // Act
    const result = formatCaseSummaryForEmail(items);

    // Assert
    expect(result).toBe("No cases scheduled.");
  });

  it("should format multiple case summaries", () => {
    // Arrange
    const items = [
      [
        { label: "Appellant", value: "John Smith" },
        { label: "Appeal reference number", value: "AST/2025/00123" },
        { label: "Hearing time", value: "10:30am" }
      ],
      [
        { label: "Appellant", value: "Jane Doe" },
        { label: "Appeal reference number", value: "AST/2025/00124" },
        { label: "Hearing time", value: "2pm" }
      ]
    ];

    // Act
    const result = formatCaseSummaryForEmail(items);

    // Assert
    expect(result).toContain("John Smith");
    expect(result).toContain("Jane Doe");
    expect(result).toContain("AST/2025/00123");
    expect(result).toContain("AST/2025/00124");
  });

  it("should handle empty values in case summary", () => {
    // Arrange
    const items = [
      [
        { label: "Appellant", value: "" },
        { label: "Appeal reference number", value: "" },
        { label: "Hearing time", value: "" }
      ]
    ];

    // Act
    const result = formatCaseSummaryForEmail(items);

    // Assert
    expect(result).toContain("Appellant -");
    expect(result).toContain("Appeal reference number -");
    expect(result).toContain("Hearing time -");
  });
});
