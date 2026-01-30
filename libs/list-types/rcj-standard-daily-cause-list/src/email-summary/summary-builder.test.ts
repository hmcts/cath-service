import { describe, expect, it } from "vitest";
import type { StandardHearingList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("reporting restrictions");
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
      },
      {
        venue: "Royal Courts of Justice",
        judge: "Judge Brown",
        time: "14:00",
        caseNumber: "T20257891",
        caseDetails: "Brown v Green",
        hearingType: "Case Management Hearing",
        additionalInformation: ""
      }
    ];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      caseNumber: "T20257890",
      caseDetails: "Smith v Jones",
      hearingType: "Trial"
    });
    expect(result[1]).toEqual({
      caseNumber: "T20257891",
      caseDetails: "Brown v Green",
      hearingType: "Case Management Hearing"
    });
  });

  it("should handle empty hearing list", () => {
    const hearingList: StandardHearingList = [];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(0);
  });

  it("should handle missing case details with N/A", () => {
    const hearingList: StandardHearingList = [
      {
        venue: "Royal Courts of Justice",
        judge: "Judge Smith",
        time: "10:00",
        caseNumber: "",
        caseDetails: "",
        hearingType: "",
        additionalInformation: ""
      }
    ];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      caseNumber: "N/A",
      caseDetails: "N/A",
      hearingType: "N/A"
    });
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format single case summary correctly", () => {
    const items = [
      {
        caseNumber: "T20257890",
        caseDetails: "Smith v Jones",
        hearingType: "Trial"
      }
    ];

    const result = formatCaseSummaryForEmail(items);

    expect(result).toContain("---");
    expect(result).toContain("Case number - T20257890");
    expect(result).toContain("Case details - Smith v Jones");
    expect(result).toContain("Hearing type - Trial");
    expect(result).not.toContain("---\n\n---");
  });

  it("should format multiple case summaries with separators", () => {
    const items = [
      {
        caseNumber: "T20257890",
        caseDetails: "Smith v Jones",
        hearingType: "Trial"
      },
      {
        caseNumber: "T20257891",
        caseDetails: "Brown v Green",
        hearingType: "Case Management Hearing"
      }
    ];

    const result = formatCaseSummaryForEmail(items);

    const lines = result.split("\n");
    expect(lines[0]).toBe("---");
    expect(lines[2]).toBe("Case number - T20257890");
    expect(lines[3]).toBe("Case details - Smith v Jones");
    expect(lines[4]).toBe("Hearing type - Trial");
    expect(lines[6]).toBe("---");
    expect(lines[8]).toBe("Case number - T20257891");
    expect(lines[9]).toBe("Case details - Brown v Green");
    expect(lines[10]).toBe("Hearing type - Case Management Hearing");
  });

  it("should handle empty case list", () => {
    const items: never[] = [];

    const result = formatCaseSummaryForEmail(items);

    expect(result).toBe("No cases scheduled.");
  });

  it("should format three cases with correct separators", () => {
    const items = [
      {
        caseNumber: "T20257890",
        caseDetails: "Smith v Jones",
        hearingType: "Trial"
      },
      {
        caseNumber: "T20257891",
        caseDetails: "Brown v Green",
        hearingType: "Hearing"
      },
      {
        caseNumber: "T20257892",
        caseDetails: "White v Black",
        hearingType: "Directions"
      }
    ];

    const result = formatCaseSummaryForEmail(items);

    const separatorCount = (result.match(/---/g) || []).length;
    expect(separatorCount).toBe(3);

    expect(result).toContain("Case number - T20257890");
    expect(result).toContain("Case number - T20257891");
    expect(result).toContain("Case number - T20257892");
  });
});
