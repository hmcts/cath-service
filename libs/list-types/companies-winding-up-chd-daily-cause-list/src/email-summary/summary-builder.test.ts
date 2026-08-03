import { describe, expect, it } from "vitest";
import type { CompaniesWindingUpHearingList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});

describe("extractCaseSummary", () => {
  it("should extract case summaries from hearing list", () => {
    const hearingList: CompaniesWindingUpHearingList = [
      {
        judge: "Judge A",
        time: "9am",
        venue: "Venue A",
        type: "Type A",
        caseNumber: "12345",
        caseName: "Case name A",
        additionalInformation: "This is additional information"
      },
      {
        judge: "Judge B",
        time: "10:30pm",
        venue: "Venue B",
        type: "Type B",
        caseNumber: "12346",
        caseName: "Case name B",
        additionalInformation: ""
      }
    ];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([
      { label: "Time", value: "9am" },
      { label: "Case number", value: "12345" },
      { label: "Case name", value: "Case name A" }
    ]);
    expect(result[1]).toEqual([
      { label: "Time", value: "10:30pm" },
      { label: "Case number", value: "12346" },
      { label: "Case name", value: "Case name B" }
    ]);
  });

  it("should handle empty hearing list", () => {
    const hearingList: CompaniesWindingUpHearingList = [];
    const result = extractCaseSummary(hearingList);
    expect(result).toHaveLength(0);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format single case summary correctly", () => {
    const items = [
      [
        { label: "Time", value: "9am" },
        { label: "Case number", value: "12345" },
        { label: "Case name", value: "Case name A" }
      ]
    ];

    const result = formatCaseSummaryForEmail(items);

    expect(result).toContain("Time - 9am");
    expect(result).toContain("Case number - 12345");
    expect(result).toContain("Case name - Case name A");
  });

  it("should handle empty case list", () => {
    const result = formatCaseSummaryForEmail([]);
    expect(result).toBe("No cases scheduled.");
  });
});
