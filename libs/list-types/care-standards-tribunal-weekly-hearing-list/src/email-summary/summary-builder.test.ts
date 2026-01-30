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
    expect(result[0]).toEqual({
      caseName: "Smith v Care Provider Ltd",
      hearingDate: "01/01/2025"
    });
    expect(result[1]).toEqual({
      caseName: "Brown v Nursing Home",
      hearingDate: "02/01/2025"
    });
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
    expect(result[0]).toEqual({
      caseName: "N/A",
      hearingDate: "N/A"
    });
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format single case summary correctly", () => {
    const items = [
      {
        caseName: "Smith v Care Provider Ltd",
        hearingDate: "01/01/2025"
      }
    ];

    const result = formatCaseSummaryForEmail(items);

    expect(result).toContain("---");
    expect(result).toContain("Case name - Smith v Care Provider Ltd");
    expect(result).toContain("Hearing date - 01/01/2025");
    expect(result).not.toContain("---\n\n---");
  });

  it("should format multiple case summaries with separators", () => {
    const items = [
      {
        caseName: "Smith v Care Provider Ltd",
        hearingDate: "01/01/2025"
      },
      {
        caseName: "Brown v Nursing Home",
        hearingDate: "02/01/2025"
      }
    ];

    const result = formatCaseSummaryForEmail(items);

    const lines = result.split("\n");
    expect(lines[0]).toBe("---");
    expect(lines[2]).toBe("Case name - Smith v Care Provider Ltd");
    expect(lines[3]).toBe("Hearing date - 01/01/2025");
    expect(lines[5]).toBe("---");
    expect(lines[7]).toBe("Case name - Brown v Nursing Home");
    expect(lines[8]).toBe("Hearing date - 02/01/2025");
  });

  it("should handle empty case list", () => {
    const items: never[] = [];

    const result = formatCaseSummaryForEmail(items);

    expect(result).toBe("No cases scheduled.");
  });

  it("should format three cases with correct separators", () => {
    const items = [
      {
        caseName: "Smith v Care Provider Ltd",
        hearingDate: "01/01/2025"
      },
      {
        caseName: "Brown v Nursing Home",
        hearingDate: "02/01/2025"
      },
      {
        caseName: "White v Care Home",
        hearingDate: "03/01/2025"
      }
    ];

    const result = formatCaseSummaryForEmail(items);

    const separatorCount = (result.match(/---/g) || []).length;
    expect(separatorCount).toBe(3);

    expect(result).toContain("Case name - Smith v Care Provider Ltd");
    expect(result).toContain("Case name - Brown v Nursing Home");
    expect(result).toContain("Case name - White v Care Home");
  });
});
