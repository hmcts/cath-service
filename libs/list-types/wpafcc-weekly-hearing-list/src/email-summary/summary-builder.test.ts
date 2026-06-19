import { describe, expect, it } from "vitest";
import type { WpafccWeeklyHearingList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});

describe("extractCaseSummary", () => {
  it("should extract case summaries from hearing list", () => {
    // Arrange
    const hearingList: WpafccWeeklyHearingList = [
      {
        date: "01/01/2025",
        hearingTime: "10:00am",
        caseReferenceNumber: "WPAFCC/2025/001",
        caseName: "Smith v MOD",
        judges: "Judge Smith",
        members: "",
        modeOfHearing: "Remote",
        venue: "WPAFCC Hearing Centre",
        additionalInformation: ""
      },
      {
        date: "02/01/2025",
        hearingTime: "2:00pm",
        caseReferenceNumber: "WPAFCC/2025/002",
        caseName: "Brown v Armed Forces",
        judges: "Judge Brown",
        members: "Member Jones",
        modeOfHearing: "In person",
        venue: "WPAFCC Office",
        additionalInformation: ""
      }
    ];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([
      { label: "Date", value: "01/01/2025" },
      { label: "Hearing time", value: "10:00am" },
      { label: "Case reference number", value: "WPAFCC/2025/001" }
    ]);
    expect(result[1]).toEqual([
      { label: "Date", value: "02/01/2025" },
      { label: "Hearing time", value: "2:00pm" },
      { label: "Case reference number", value: "WPAFCC/2025/002" }
    ]);
  });

  it("should handle empty hearing list", () => {
    // Arrange
    const hearingList: WpafccWeeklyHearingList = [];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result).toHaveLength(0);
  });

  it("should handle missing fields with empty string", () => {
    // Arrange
    const hearingList: WpafccWeeklyHearingList = [
      {
        date: "",
        hearingTime: "",
        caseReferenceNumber: "",
        caseName: "",
        judges: "",
        members: "",
        modeOfHearing: "",
        venue: "",
        additionalInformation: ""
      }
    ];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Date", value: "" },
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
        { label: "Date", value: "01/01/2025" },
        { label: "Hearing time", value: "10:00am" },
        { label: "Case reference number", value: "WPAFCC/2025/001" }
      ]
    ];

    // Act
    const result = formatCaseSummaryForEmail(items);

    // Assert
    expect(result).toContain("---");
    expect(result).toContain("Date - 01/01/2025");
    expect(result).toContain("Hearing time - 10:00am");
    expect(result).toContain("Case reference number - WPAFCC/2025/001");
  });

  it("should handle empty case list", () => {
    // Act
    const result = formatCaseSummaryForEmail([]);

    // Assert
    expect(result).toBe("No cases scheduled.");
  });
});
