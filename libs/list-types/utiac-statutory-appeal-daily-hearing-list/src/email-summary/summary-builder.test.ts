import { describe, expect, it } from "vitest";
import type { UtiacStatutoryAppealHearingList } from "../models/types.js";
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
    const hearingList: UtiacStatutoryAppealHearingList = [
      {
        hearingTime: "10:00am",
        appellant: "John Smith",
        representative: "Smith & Co",
        appealReferenceNumber: "IA/2025/001",
        judges: "Judge Smith",
        hearingType: "Substantive",
        location: "Field House",
        additionalInformation: ""
      },
      {
        hearingTime: "2:00pm",
        appellant: "Jane Brown",
        representative: "",
        appealReferenceNumber: "IA/2025/002",
        judges: "Judge Brown",
        hearingType: "Preliminary",
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
      { label: "Appeal reference number", value: "IA/2025/001" }
    ]);
    expect(result[1]).toEqual([
      { label: "Hearing time", value: "2:00pm" },
      { label: "Appeal reference number", value: "IA/2025/002" }
    ]);
  });

  it("should handle empty hearing list", () => {
    // Arrange
    const hearingList: UtiacStatutoryAppealHearingList = [];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result).toHaveLength(0);
  });

  it("should handle missing fields with empty string", () => {
    // Arrange
    const hearingList: UtiacStatutoryAppealHearingList = [
      {
        hearingTime: "",
        appellant: "",
        representative: "",
        appealReferenceNumber: "",
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
      { label: "Appeal reference number", value: "" }
    ]);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format single case summary correctly", () => {
    // Arrange
    const items = [
      [
        { label: "Hearing time", value: "10:00am" },
        { label: "Appeal reference number", value: "IA/2025/001" }
      ]
    ];

    // Act
    const result = formatCaseSummaryForEmail(items);

    // Assert
    expect(result).toContain("---");
    expect(result).toContain("Hearing time - 10:00am");
    expect(result).toContain("Appeal reference number - IA/2025/001");
  });

  it("should handle empty case list", () => {
    // Act
    const result = formatCaseSummaryForEmail([]);

    // Assert
    expect(result).toBe("No cases scheduled.");
  });
});
