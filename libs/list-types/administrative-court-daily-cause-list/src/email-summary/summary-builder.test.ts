import { describe, expect, it } from "vitest";
import type { StandardHearingList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
  });
});

describe("extractCaseSummary", () => {
  it("should extract case summaries from hearing list", () => {
    const hearingList: StandardHearingList = [
      {
        venue: "Royal Courts of Justice",
        judge: "Judge Smith",
        time: "10:00",
        caseNumber: "CO/1234/2025",
        caseDetails: "R (Smith) v Secretary of State",
        hearingType: "Judicial Review",
        additionalInformation: ""
      }
    ];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("CO/1234/2025");
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format case summary correctly", () => {
    const items = [
      {
        caseNumber: "CO/1234/2025",
        caseDetails: "R (Smith) v Secretary of State",
        hearingType: "Judicial Review"
      }
    ];

    const result = formatCaseSummaryForEmail(items);

    expect(result).toContain("Case number - CO/1234/2025");
  });
});
