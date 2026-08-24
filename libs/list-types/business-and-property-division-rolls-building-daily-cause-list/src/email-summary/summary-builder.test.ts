import { describe, expect, it } from "vitest";
import type { BusinessAndPropertyRollsData } from "../models/types.js";
import { SECTIONS } from "../sections.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

function emptyData(): BusinessAndPropertyRollsData {
  return Object.fromEntries(SECTIONS.map((s) => [s.key, []])) as BusinessAndPropertyRollsData;
}

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain the required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
  });
});

describe("extractCaseSummary", () => {
  it("should extract summaries across sections in section order", () => {
    const data = emptyData();
    data.appealList = [
      { judge: "J1", time: "10am", venue: "Court 1", type: "Trial", caseNumber: "CR-1", caseName: "Acme v Widgets", additionalInformation: "" }
    ];
    data.revenueList = [
      { judge: "J2", time: "2pm", venue: "Court 2", type: "Hearing", caseNumber: "CR-2", caseName: "Beta v Gamma", additionalInformation: "" }
    ];

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([
      { label: "Time", value: "10am" },
      { label: "Case number", value: "CR-1" },
      { label: "Case name", value: "Acme v Widgets" }
    ]);
    expect(result[1][1]).toEqual({ label: "Case number", value: "CR-2" });
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format a summary for email", () => {
    const result = formatCaseSummaryForEmail([
      [
        { label: "Time", value: "10am" },
        { label: "Case number", value: "CR-1" },
        { label: "Case name", value: "Acme v Widgets" }
      ]
    ]);

    expect(result).toContain("Time - 10am");
    expect(result).toContain("Case number - CR-1");
    expect(result).toContain("Case name - Acme v Widgets");
  });
});
