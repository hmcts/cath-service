import { describe, expect, it } from "vitest";
import type { SendDailyHearingList } from "../models/types.js";
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
    const hearingList: SendDailyHearingList = [
      {
        time: "10:30am",
        caseReferenceNumber: "SEND/2026/001",
        respondent: "Birmingham City Council",
        hearingType: "Case Management Hearing",
        venue: "Video Hearing",
        timeEstimate: "2 hours"
      }
    ];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Time", value: "10:30am" },
      { label: "Case reference number", value: "SEND/2026/001" },
      { label: "Venue", value: "Video Hearing" }
    ]);
  });

  it("should handle empty hearing list", () => {
    // Act
    const result = extractCaseSummary([]);

    // Assert
    expect(result).toHaveLength(0);
  });

  it("should handle missing fields with empty string", () => {
    // Arrange
    const hearingList: SendDailyHearingList = [
      {
        time: "",
        caseReferenceNumber: "",
        respondent: "Test Respondent",
        hearingType: "Test Type",
        venue: "",
        timeEstimate: "1 hour"
      }
    ];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Time", value: "" },
      { label: "Case reference number", value: "" },
      { label: "Venue", value: "" }
    ]);
  });

  it("should extract summaries from multiple hearings", () => {
    // Arrange
    const hearingList: SendDailyHearingList = [
      {
        time: "10:30am",
        caseReferenceNumber: "SEND/2026/001",
        respondent: "Birmingham City Council",
        hearingType: "Case Management",
        venue: "Room 1",
        timeEstimate: "2 hours"
      },
      {
        time: "2:00pm",
        caseReferenceNumber: "SEND/2026/002",
        respondent: "Manchester City Council",
        hearingType: "Final Hearing",
        venue: "Room 2",
        timeEstimate: "3 hours"
      }
    ];

    // Act
    const result = extractCaseSummary(hearingList);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([
      { label: "Time", value: "10:30am" },
      { label: "Case reference number", value: "SEND/2026/001" },
      { label: "Venue", value: "Room 1" }
    ]);
    expect(result[1]).toEqual([
      { label: "Time", value: "2:00pm" },
      { label: "Case reference number", value: "SEND/2026/002" },
      { label: "Venue", value: "Room 2" }
    ]);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format single case summary correctly", () => {
    // Arrange
    const items = [
      [
        { label: "Time", value: "10:30am" },
        { label: "Case reference number", value: "SEND/2026/001" },
        { label: "Venue", value: "Video Hearing" }
      ]
    ];

    // Act
    const result = formatCaseSummaryForEmail(items);

    // Assert
    expect(result).toContain("Time - 10:30am");
    expect(result).toContain("Case reference number - SEND/2026/001");
    expect(result).toContain("Venue - Video Hearing");
  });

  it("should handle empty case list", () => {
    // Act
    const result = formatCaseSummaryForEmail([]);

    // Assert
    expect(result).toBe("No cases scheduled.");
  });

  it("should format multiple case summaries correctly", () => {
    // Arrange
    const items = [
      [
        { label: "Time", value: "10:30am" },
        { label: "Case reference number", value: "SEND/2026/001" },
        { label: "Venue", value: "Room 1" }
      ],
      [
        { label: "Time", value: "2:00pm" },
        { label: "Case reference number", value: "SEND/2026/002" },
        { label: "Venue", value: "Room 2" }
      ]
    ];

    // Act
    const result = formatCaseSummaryForEmail(items);

    // Assert
    expect(result).toContain("SEND/2026/001");
    expect(result).toContain("SEND/2026/002");
    expect(result).toContain("10:30am");
    expect(result).toContain("2:00pm");
  });

  it("should handle empty field values", () => {
    // Arrange
    const items = [
      [
        { label: "Time", value: "" },
        { label: "Case reference number", value: "" },
        { label: "Venue", value: "" }
      ]
    ];

    // Act
    const result = formatCaseSummaryForEmail(items);

    // Assert
    expect(result).toContain("Time - ");
    expect(result).toContain("Case reference number - ");
    expect(result).toContain("Venue - ");
  });
});
