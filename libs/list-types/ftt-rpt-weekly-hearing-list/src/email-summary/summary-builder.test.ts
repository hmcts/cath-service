import { describe, expect, it } from "vitest";
import type { FttRptHearingList } from "../models/types.js";
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
    const hearingList: FttRptHearingList = [
      {
        date: "01/01/2025",
        time: "10:00am",
        venue: "London",
        caseType: "Leasehold",
        caseReferenceNumber: "RPT/00001/2025",
        judges: "Judge Smith",
        members: "",
        hearingMethod: "In person",
        additionalInformation: ""
      },
      {
        date: "02/01/2025",
        time: "2:00pm",
        venue: "Manchester",
        caseType: "Rent",
        caseReferenceNumber: "RPT/00002/2025",
        judges: "Judge Brown",
        members: "Member Jones",
        hearingMethod: "Video",
        additionalInformation: ""
      }
    ];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([
      { label: "Date", value: "01/01/2025" },
      { label: "Time", value: "10:00am" },
      { label: "Case Reference Number", value: "RPT/00001/2025" }
    ]);
    expect(result[1]).toEqual([
      { label: "Date", value: "02/01/2025" },
      { label: "Time", value: "2:00pm" },
      { label: "Case Reference Number", value: "RPT/00002/2025" }
    ]);
  });

  it("should handle empty hearing list", () => {
    // Arrange
    const hearingList: FttRptHearingList = [];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result).toHaveLength(0);
  });

  it("should handle missing case details with empty string", () => {
    // Arrange
    const hearingList: FttRptHearingList = [
      {
        date: "",
        time: "",
        venue: "",
        caseType: "",
        caseReferenceNumber: "",
        judges: "",
        members: "",
        hearingMethod: "",
        additionalInformation: ""
      }
    ];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Date", value: "" },
      { label: "Time", value: "" },
      { label: "Case Reference Number", value: "" }
    ]);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format single case summary correctly", () => {
    // Arrange
    const items = [
      [
        { label: "Date", value: "01/01/2025" },
        { label: "Time", value: "10:00am" },
        { label: "Case Reference Number", value: "RPT/00001/2025" }
      ]
    ];

    // Act
    const result = formatCaseSummaryForEmail(items);

    // Assert
    expect(result).toContain("---");
    expect(result).toContain("Date - 01/01/2025");
    expect(result).toContain("Time - 10:00am");
    expect(result).toContain("Case Reference Number - RPT/00001/2025");
  });

  it("should handle empty case list", () => {
    // Act
    const result = formatCaseSummaryForEmail([]);

    // Assert
    expect(result).toBe("No cases scheduled.");
  });
});
