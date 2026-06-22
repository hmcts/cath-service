import { describe, expect, it } from "vitest";
import type { UtiacJrBirminghamHearingList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});

describe("extractCaseSummary", () => {
  it("should extract case summaries", () => {
    // Arrange
    const hearingList: UtiacJrBirminghamHearingList = [
      {
        hearingTime: "10:00am",
        caseTitle: "Smith v Secretary of State",
        representative: "Smith & Co",
        caseReferenceNumber: "JR/2025/001",
        judges: "Judge Smith",
        hearingType: "Permission",
        location: "Field House",
        additionalInformation: ""
      },
      {
        hearingTime: "2:00pm",
        caseTitle: "Brown v Home Office",
        representative: "",
        caseReferenceNumber: "JR/2025/002",
        judges: "Judge Brown",
        hearingType: "Full hearing",
        location: "Manchester",
        additionalInformation: ""
      }
    ];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([
      { label: "Hearing time", value: "10:00am" },
      { label: "Case reference number", value: "JR/2025/001" }
    ]);
    expect(result[1]).toEqual([
      { label: "Hearing time", value: "2:00pm" },
      { label: "Case reference number", value: "JR/2025/002" }
    ]);
  });

  it("should handle empty hearing list", () => {
    // Arrange
    const hearingList: UtiacJrBirminghamHearingList = [];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result).toHaveLength(0);
  });

  it("should handle missing fields with empty string", () => {
    // Arrange
    const hearingList: UtiacJrBirminghamHearingList = [
      {
        hearingTime: "",
        caseTitle: "",
        representative: "",
        caseReferenceNumber: "",
        judges: "",
        hearingType: "",
        location: "",
        additionalInformation: ""
      }
    ];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Hearing time", value: "" },
      { label: "Case reference number", value: "" }
    ]);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format single case summary correctly", () => {
    // Arrange
    const items = [
      [
        { label: "Hearing time", value: "10:00am" },
        { label: "Case reference number", value: "JR/2025/001" }
      ]
    ];

    // Act
    const result = formatCaseSummaryForEmail(items);

    // Assert
    expect(result).toContain("---");
    expect(result).toContain("Hearing time - 10:00am");
    expect(result).toContain("Case reference number - JR/2025/001");
  });

  it("should handle empty case list", () => {
    // Act
    const result = formatCaseSummaryForEmail([]);

    // Assert
    expect(result).toBe("No cases scheduled.");
  });
});
