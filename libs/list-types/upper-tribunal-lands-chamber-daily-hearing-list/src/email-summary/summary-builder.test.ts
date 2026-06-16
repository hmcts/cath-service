import { describe, expect, it } from "vitest";
import type { UtlcHearingList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});

describe("extractCaseSummary", () => {
  it("should extract case summaries from hearing list", () => {
    const hearingList: UtlcHearingList = [
      {
        time: "10:00am",
        caseReferenceNumber: "LC/2025/0001",
        caseName: "Smith v Jones",
        judges: "Judge Smith",
        members: "Member Jones",
        hearingType: "Substantive hearing",
        venue: "Royal Courts of Justice",
        modeOfHearing: "CVP"
      },
      {
        time: "2:00pm",
        caseReferenceNumber: "LC/2025/0002",
        caseName: "Brown v Green",
        judges: "Judge Brown",
        members: "Member Davis",
        hearingType: "Preliminary hearing",
        venue: "Royal Courts of Justice",
        modeOfHearing: "In person"
      }
    ];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([
      { label: "Time", value: "10:00am" },
      { label: "Case Reference Number", value: "LC/2025/0001" },
      { label: "Case Name", value: "Smith v Jones" }
    ]);
    expect(result[1]).toEqual([
      { label: "Time", value: "2:00pm" },
      { label: "Case Reference Number", value: "LC/2025/0002" },
      { label: "Case Name", value: "Brown v Green" }
    ]);
  });

  it("should handle empty hearing list", () => {
    const hearingList: UtlcHearingList = [];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(0);
  });

  it("should handle missing values with empty string", () => {
    const hearingList: UtlcHearingList = [
      {
        time: "",
        caseReferenceNumber: "",
        caseName: "",
        judges: "",
        members: "",
        hearingType: "",
        venue: "",
        modeOfHearing: ""
      }
    ];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Time", value: "" },
      { label: "Case Reference Number", value: "" },
      { label: "Case Name", value: "" }
    ]);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format single case summary correctly", () => {
    const items = [
      [
        { label: "Time", value: "10:00am" },
        { label: "Case Reference Number", value: "LC/2025/0001" },
        { label: "Case Name", value: "Smith v Jones" }
      ]
    ];

    const result = formatCaseSummaryForEmail(items);

    expect(result).toContain("---");
    expect(result).toContain("Time - 10:00am");
    expect(result).toContain("Case Reference Number - LC/2025/0001");
    expect(result).toContain("Case Name - Smith v Jones");
  });

  it("should handle empty case list", () => {
    const result = formatCaseSummaryForEmail([]);

    expect(result).toBe("No cases scheduled.");
  });
});
