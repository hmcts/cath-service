import { describe, expect, it } from "vitest";
import type { LondonAdminCourtData } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
  });
});

describe("extractCaseSummary", () => {
  it("should extract case summaries from hearing list", () => {
    const hearingList: LondonAdminCourtData = {
      mainHearings: [
        {
          venue: "Royal Courts of Justice",
          judge: "Judge Smith",
          time: "10:00",
          caseNumber: "LO/1234/2025",
          caseDetails: "R (Smith) v Mayor of London",
          hearingType: "Judicial Review",
          additionalInformation: ""
        }
      ],
      planningCourt: [
        {
          venue: "Planning Court",
          judge: "Judge Jones",
          time: "14:00",
          caseNumber: "LO/5678/2025",
          caseDetails: "Planning Appeal",
          hearingType: "Appeal",
          additionalInformation: ""
        }
      ]
    };

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      time: "10:00",
      caseNumber: "LO/1234/2025",
      caseDetails: "R (Smith) v Mayor of London"
    });
    expect(result[1]).toEqual({
      time: "14:00",
      caseNumber: "LO/5678/2025",
      caseDetails: "Planning Appeal"
    });
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format case summary correctly", () => {
    const items = [
      {
        time: "10:00",
        caseNumber: "LO/1234/2025",
        caseDetails: "R (Smith) v Mayor of London"
      }
    ];

    const result = formatCaseSummaryForEmail(items);

    expect(result).toContain("Time - 10:00");
    expect(result).toContain("Case number - LO/1234/2025");
    expect(result).toContain("Case details - R (Smith) v Mayor of London");
  });
});
