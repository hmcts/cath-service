import { describe, expect, it } from "vitest";
import type { CareStandardsTribunalHearingList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});

describe("extractCaseSummary", () => {
  it("should extract case summaries from hearing list", () => {
    const hearingList: CareStandardsTribunalHearingList = [
      {
        date: "01/01/2025",
        caseName: "Smith v Care Provider Ltd",
        hearingLength: "2 hours",
        hearingType: "Final Hearing",
        venue: "Royal Courts of Justice",
        additionalInformation: ""
      },
      {
        date: "02/01/2025",
        caseName: "Brown v Nursing Home",
        hearingLength: "1 hour",
        hearingType: "Preliminary Hearing",
        venue: "Royal Courts of Justice",
        additionalInformation: ""
      }
    ];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([
      { label: "Date", value: "01/01/2025" },
      { label: "Case name", value: "Smith v Care Provider Ltd" }
    ]);
    expect(result[1]).toEqual([
      { label: "Date", value: "02/01/2025" },
      { label: "Case name", value: "Brown v Nursing Home" }
    ]);
  });

  it("should handle empty hearing list", () => {
    const hearingList: CareStandardsTribunalHearingList = [];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(0);
  });

  it("should handle missing case details with N/A", () => {
    const hearingList: CareStandardsTribunalHearingList = [
      {
        date: "",
        caseName: "",
        hearingLength: "",
        hearingType: "",
        venue: "",
        additionalInformation: ""
      }
    ];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Date", value: "N/A" },
      { label: "Case name", value: "N/A" }
    ]);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format single case summary correctly", () => {
    const items = [
      [
        { label: "Date", value: "01/01/2025" },
        { label: "Case name", value: "Smith v Care Provider Ltd" }
      ]
    ];

    const result = formatCaseSummaryForEmail(items);

    expect(result).toContain("---");
    expect(result).toContain("Date - 01/01/2025");
    expect(result).toContain("Case name - Smith v Care Provider Ltd");
    expect(result).not.toContain("---\n\n---");
  });

  it("should handle empty case list", () => {
    const result = formatCaseSummaryForEmail([]);

    expect(result).toBe("No cases scheduled.");
  });
});
