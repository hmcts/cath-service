import { describe, expect, it } from "vitest";
import { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./case-summary-formatter.js";

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format single case summary correctly", () => {
    const items = [
      [
        { label: "Time", value: "10:00" },
        { label: "Case number", value: "T20257890" },
        { label: "Case details", value: "Smith v Jones" }
      ]
    ];

    const result = formatCaseSummaryForEmail(items);

    expect(result).toContain("---");
    expect(result).toContain("Time - 10:00");
    expect(result).toContain("Case number - T20257890");
    expect(result).toContain("Case details - Smith v Jones");
  });

  it("should format multiple case summaries with separators", () => {
    const items = [
      [
        { label: "Time", value: "10:00" },
        { label: "Case number", value: "T20257890" }
      ],
      [
        { label: "Time", value: "14:00" },
        { label: "Case number", value: "T20257891" }
      ]
    ];

    const result = formatCaseSummaryForEmail(items);

    const lines = result.split("\n");
    expect(lines[0]).toBe("---");
    expect(lines[2]).toBe("Time - 10:00");
    expect(lines[3]).toBe("Case number - T20257890");
    expect(lines[5]).toBe("---");
    expect(lines[7]).toBe("Time - 14:00");
    expect(lines[8]).toBe("Case number - T20257891");
  });

  it("should handle empty case list", () => {
    const result = formatCaseSummaryForEmail([]);
    expect(result).toBe("No cases scheduled.");
  });

  it("should work with different field configurations", () => {
    const items = [
      [
        { label: "Date", value: "01/01/2025" },
        { label: "Case name", value: "Smith v Care Provider Ltd" }
      ]
    ];

    const result = formatCaseSummaryForEmail(items);

    expect(result).toContain("Date - 01/01/2025");
    expect(result).toContain("Case name - Smith v Care Provider Ltd");
  });
});
