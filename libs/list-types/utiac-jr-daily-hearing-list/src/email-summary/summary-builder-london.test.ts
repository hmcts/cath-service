import { describe, expect, it } from "vitest";
import { extractLondonCaseSummary } from "./summary-builder-london.js";

describe("extractLondonCaseSummary", () => {
  it("should extract hearing time and case reference number from each hearing", () => {
    // Arrange
    const hearingList = [
      {
        hearingTime: "10:00am",
        caseTitle: "Smith v Secretary of State",
        representative: "",
        caseReferenceNumber: "JR/2026/001",
        judges: "Judge Smith",
        hearingType: "Permission",
        location: "Field House",
        additionalInformation: ""
      },
      {
        hearingTime: "2:00pm",
        caseTitle: "Jones v Home Office",
        representative: "Mr Jones",
        caseReferenceNumber: "JR/2026/002",
        judges: "Judge Brown",
        hearingType: "Full hearing",
        location: "Field House",
        additionalInformation: "Remote"
      }
    ];

    // Act
    const result = extractLondonCaseSummary(hearingList);

    // Assert
    expect(result).toEqual([
      [
        { label: "Hearing time", value: "10:00am" },
        { label: "Case reference number", value: "JR/2026/001" }
      ],
      [
        { label: "Hearing time", value: "2:00pm" },
        { label: "Case reference number", value: "JR/2026/002" }
      ]
    ]);
  });

  it("should return empty array for empty hearing list", () => {
    // Act
    const result = extractLondonCaseSummary([]);

    // Assert
    expect(result).toEqual([]);
  });

  it("should handle empty string fields gracefully", () => {
    // Arrange
    const hearingList = [
      {
        hearingTime: "",
        caseTitle: "Smith v Secretary of State",
        representative: "",
        caseReferenceNumber: "",
        judges: "Judge Smith",
        hearingType: "Permission",
        location: "Field House",
        additionalInformation: ""
      }
    ];

    // Act
    const result = extractLondonCaseSummary(hearingList);

    // Assert
    expect(result).toEqual([
      [
        { label: "Hearing time", value: "" },
        { label: "Case reference number", value: "" }
      ]
    ]);
  });
});
