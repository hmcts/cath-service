import { describe, expect, it } from "vitest";
import type { StandardHearingList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});

describe("extractCaseSummary", () => {
  it("should extract case summaries from hearing list", () => {
    const hearingList: StandardHearingList = [
      {
        venue: "Royal Courts of Justice",
        judge: "Judge Smith",
        time: "10:00",
        caseNumber: "T20257890",
        caseDetails: "Smith v Jones",
        hearingType: "Trial",
        additionalInformation: "Remote hearing"
      }
    ];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Time", value: "10:00" },
      { label: "Case number", value: "T20257890" },
      { label: "Case details", value: "Smith v Jones" }
    ]);
  });

  it("should handle empty hearing list", () => {
    const result = extractCaseSummary([]);
    expect(result).toHaveLength(0);
  });

  it("should handle missing case details with empty string", () => {
    const hearingList: StandardHearingList = [
      {
        venue: "Royal Courts of Justice",
        judge: "Judge Smith",
        time: "",
        caseNumber: "",
        caseDetails: "",
        hearingType: "",
        additionalInformation: ""
      }
    ];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Time", value: "" },
      { label: "Case number", value: "" },
      { label: "Case details", value: "" }
    ]);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format single case summary correctly", () => {
    const items = [
      [
        { label: "Time", value: "10:00" },
        { label: "Case number", value: "T20257890" },
        { label: "Case details", value: "Smith v Jones" }
      ]
    ];

    const result = formatCaseSummaryForEmail(items);

    expect(result).toContain("Time - 10:00");
    expect(result).toContain("Case number - T20257890");
    expect(result).toContain("Case details - Smith v Jones");
  });

  it("should handle empty case list", () => {
    const result = formatCaseSummaryForEmail([]);
    expect(result).toBe("No cases scheduled.");
  });
});
