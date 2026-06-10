import { describe, expect, it } from "vitest";
import type { UtccHearingList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});

describe("extractCaseSummary", () => {
  it("should extract case summaries from hearing list", () => {
    const hearingList: UtccHearingList = [
      {
        time: "10:00am",
        caseReference: "UTTC/2025/0001",
        caseName: "Smith v HMRC",
        judges: "Judge Smith",
        members: "Member Jones",
        hearingType: "Substantive hearing",
        venue: "Field House"
      },
      {
        time: "2:00pm",
        caseReference: "UTTC/2025/0002",
        caseName: "Brown v HMRC",
        judges: "Judge Brown",
        members: "Member Davis",
        hearingType: "Preliminary hearing",
        venue: "Field House"
      }
    ];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([
      { label: "Time", value: "10:00am" },
      { label: "Case Reference Number", value: "UTTC/2025/0001" }
    ]);
    expect(result[1]).toEqual([
      { label: "Time", value: "2:00pm" },
      { label: "Case Reference Number", value: "UTTC/2025/0002" }
    ]);
  });

  it("should handle empty hearing list", () => {
    const hearingList: UtccHearingList = [];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(0);
  });

  it("should handle missing values with empty string", () => {
    const hearingList: UtccHearingList = [
      {
        time: "",
        caseReference: "",
        caseName: "",
        judges: "",
        members: "",
        hearingType: "",
        venue: ""
      }
    ];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Time", value: "" },
      { label: "Case Reference Number", value: "" }
    ]);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format single case summary correctly", () => {
    const items = [
      [
        { label: "Time", value: "10:00am" },
        { label: "Case Reference Number", value: "UTTC/2025/0001" }
      ]
    ];

    const result = formatCaseSummaryForEmail(items);

    expect(result).toContain("---");
    expect(result).toContain("Time - 10:00am");
    expect(result).toContain("Case Reference Number - UTTC/2025/0001");
  });

  it("should handle empty case list", () => {
    const result = formatCaseSummaryForEmail([]);

    expect(result).toBe("No cases scheduled.");
  });
});
