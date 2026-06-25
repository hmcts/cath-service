import { describe, expect, it } from "vitest";
import type { UtaacHearingList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});

describe("extractCaseSummary", () => {
  it("should extract case summaries using caseReferenceNumber field", () => {
    const hearingList: UtaacHearingList = [
      {
        time: "10:00am",
        appellant: "Smith",
        caseReferenceNumber: "UTAAC/2025/0001",
        judges: "Judge Smith",
        members: "Member Jones",
        modeOfHearing: "CVP",
        venue: "Field House",
        additionalInformation: ""
      },
      {
        time: "2:00pm",
        appellant: "Brown",
        caseReferenceNumber: "UTAAC/2025/0002",
        judges: "Judge Brown",
        members: "Member Davis",
        modeOfHearing: "In person",
        venue: "Field House",
        additionalInformation: ""
      }
    ];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([
      { label: "Time", value: "10:00am" },
      { label: "Case Reference Number", value: "UTAAC/2025/0001" },
      { label: "Appellant", value: "Smith" }
    ]);
    expect(result[1]).toEqual([
      { label: "Time", value: "2:00pm" },
      { label: "Case Reference Number", value: "UTAAC/2025/0002" },
      { label: "Appellant", value: "Brown" }
    ]);
  });

  it("should handle empty hearing list", () => {
    const hearingList: UtaacHearingList = [];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(0);
  });

  it("should handle missing values with empty string", () => {
    const hearingList: UtaacHearingList = [
      {
        time: "",
        appellant: "",
        caseReferenceNumber: "",
        judges: "",
        members: "",
        modeOfHearing: "",
        venue: "",
        additionalInformation: ""
      }
    ];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Time", value: "" },
      { label: "Case Reference Number", value: "" },
      { label: "Appellant", value: "" }
    ]);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format single case summary correctly", () => {
    const items = [
      [
        { label: "Time", value: "10:00am" },
        { label: "Case Reference Number", value: "UTAAC/2025/0001" },
        { label: "Appellant", value: "Smith" }
      ]
    ];

    const result = formatCaseSummaryForEmail(items);

    expect(result).toContain("---");
    expect(result).toContain("Time - 10:00am");
    expect(result).toContain("Case Reference Number - UTAAC/2025/0001");
    expect(result).toContain("Appellant - Smith");
  });

  it("should handle empty case list", () => {
    const result = formatCaseSummaryForEmail([]);

    expect(result).toBe("No cases scheduled.");
  });
});
