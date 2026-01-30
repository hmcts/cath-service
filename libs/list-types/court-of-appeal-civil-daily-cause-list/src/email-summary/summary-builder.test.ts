import { describe, expect, it } from "vitest";
import type { CourtOfAppealCivilData } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});

describe("extractCaseSummary", () => {
  it("should extract case summaries from hearing list", () => {
    const hearingList: CourtOfAppealCivilData = {
      dailyHearings: [
        {
          venue: "Royal Courts of Justice",
          judge: "Judge Smith",
          time: "10:00",
          caseNumber: "A1/2025/0001",
          caseDetails: "Smith v Jones",
          hearingType: "Appeal",
          additionalInformation: ""
        }
      ],
      futureJudgments: [
        {
          date: "15/01/2025",
          venue: "Royal Courts of Justice",
          judge: "Judge Brown",
          time: "14:00",
          caseNumber: "A1/2025/0002",
          caseDetails: "Brown v Green",
          hearingType: "Judgment",
          additionalInformation: ""
        }
      ]
    };

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      caseNumber: "A1/2025/0001",
      caseDetails: "Smith v Jones",
      hearingType: "Appeal"
    });
    expect(result[1]).toEqual({
      caseNumber: "A1/2025/0002",
      caseDetails: "Brown v Green",
      hearingType: "Judgment"
    });
  });

  it("should handle empty hearing list", () => {
    const hearingList: CourtOfAppealCivilData = {
      dailyHearings: [],
      futureJudgments: []
    };
    const result = extractCaseSummary(hearingList);
    expect(result).toHaveLength(0);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format single case summary correctly", () => {
    const items = [
      {
        caseNumber: "A1/2025/0001",
        caseDetails: "Smith v Jones",
        hearingType: "Appeal"
      }
    ];

    const result = formatCaseSummaryForEmail(items);

    expect(result).toContain("Case number - A1/2025/0001");
    expect(result).toContain("Case details - Smith v Jones");
    expect(result).toContain("Hearing type - Appeal");
  });

  it("should handle empty case list", () => {
    const items: never[] = [];
    const result = formatCaseSummaryForEmail(items);
    expect(result).toBe("No cases scheduled.");
  });
});
