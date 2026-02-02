import { describe, expect, it } from "vitest";
import type { AdministrativeCourtHearingList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
  });
});

describe("extractCaseSummary", () => {
  it("should extract case summaries from hearing list", () => {
    const hearingList: AdministrativeCourtHearingList = [
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
    expect(result[0]).toEqual({
      time: "10:00",
      caseNumber: "CO/1234/2025",
      hearingType: "Judicial Review",
      caseDetails: "R (Smith) v Secretary of State"
    });
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format case summary correctly", () => {
    const items = [
      {
        time: "10:00",
        caseNumber: "CO/1234/2025",
        hearingType: "Judicial Review",
        caseDetails: "R (Smith) v Secretary of State"
      }
    ];

    const result = formatCaseSummaryForEmail(items);

    expect(result).toContain("Time - 10:00");
    expect(result).toContain("Case number - CO/1234/2025");
    expect(result).toContain("Hearing type - Judicial Review");
    expect(result).toContain("Case details - R (Smith) v Secretary of State");
  });
});
