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
  it("should emit a heading and hearings for each populated section in section order", () => {
    const data = emptyData();
    data.appealList = [
      { judge: "J1", time: "10am", venue: "Court 1", type: "Trial", caseNumber: "CR-1", caseName: "Acme v Widgets", additionalInformation: "" }
    ];

    const result = extractCaseSummary(data);

    // First block is the Appeal List heading, followed by its single hearing.
    expect(result[0]).toEqual([{ label: "__section__", value: "Appeal List" }]);
    expect(result[1]).toEqual([
      { label: "Time", value: "10am" },
      { label: "Case number", value: "CR-1" },
      { label: "Case name", value: "Acme v Widgets" }
    ]);
  });

  it("should use the '&' worksheet form for ampersand section headings", () => {
    const data = emptyData();

    const result = extractCaseSummary(data);
    const headings = result.map((block) => block[0]?.value ?? "");

    expect(headings).toContain("Insolvency & Companies Court");
    expect(headings).toContain("IP & Enterprise Court");
    expect(headings).toContain("Property, Trusts & Probate List");
    expect(headings).toContain("Technology & Construction Court");
  });

  it("should emit a no-hearings block for an empty section", () => {
    const data = emptyData();

    const result = extractCaseSummary(data);

    // Every section is empty, so each contributes a heading + a no-hearings block.
    expect(result).toHaveLength(SECTIONS.length * 2);
    expect(result[0]).toEqual([{ label: "__section__", value: SECTIONS[0].worksheetName }]);
    expect(result[1]).toEqual([{ label: "__note__", value: "No hearings scheduled for this day." }]);
  });

  it("should keep section boundaries when multiple sections are populated", () => {
    const data = emptyData();
    data.appealList = [
      { judge: "J1", time: "10am", venue: "Court 1", type: "Trial", caseNumber: "CR-1", caseName: "Acme v Widgets", additionalInformation: "" }
    ];
    data.revenueList = [
      { judge: "J2", time: "2pm", venue: "Court 2", type: "Hearing", caseNumber: "CR-2", caseName: "Beta v Gamma", additionalInformation: "" }
    ];

    const result = extractCaseSummary(data);

    const revenueHeadingIndex = result.findIndex((block) => block[0]?.value === "Revenue List");
    expect(revenueHeadingIndex).toBeGreaterThan(-1);
    expect(result[revenueHeadingIndex + 1]).toEqual([
      { label: "Time", value: "2pm" },
      { label: "Case number", value: "CR-2" },
      { label: "Case name", value: "Beta v Gamma" }
    ]);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should render section headings with hearings grouped beneath and a rule after each section", () => {
    const data = emptyData();
    data.appealList = [
      { judge: "J1", time: "10:30am", venue: "Court 1", type: "Trial", caseNumber: "1234", caseName: "This is case name", additionalInformation: "" },
      { judge: "J2", time: "11:30am", venue: "Court 2", type: "Trial", caseNumber: "5678", caseName: "This is case name 2", additionalInformation: "" }
    ];

    const result = formatCaseSummaryForEmail(extractCaseSummary(data));

    // Section name is a Notify "##" heading, separated from its first hearing by a blank line.
    expect(result).toContain("## Appeal List\n\nTime - 10:30am\nCase number - 1234\nCase name - This is case name");
    // Hearings within a section are separated by a blank line.
    expect(result).toContain("Case name - This is case name\n\nTime - 11:30am");
    // Each section closes with a horizontal rule.
    expect(result).toContain("Case name - This is case name 2\n\n---");
    // An empty section shows the note beneath its heading, then a rule.
    expect(result).toContain("## Business List\n\nNo hearings scheduled for this day.\n\n---");
    // The last section has no trailing rule (Notify renders one at the end by default).
    expect(result.trimEnd().endsWith("---")).toBe(false);
    expect(result.trimEnd().endsWith("No hearings scheduled for this day.")).toBe(true);
  });

  it("should not use literal ** bold markers (Notify email does not render them)", () => {
    const result = formatCaseSummaryForEmail(extractCaseSummary(emptyData()));

    expect(result).not.toContain("**");
  });

  it("should render ampersand section headings with the '&' worksheet form", () => {
    const result = formatCaseSummaryForEmail(extractCaseSummary(emptyData()));

    expect(result).toContain("## Insolvency & Companies Court");
    expect(result).toContain("## IP & Enterprise Court");
    expect(result).toContain("## Property, Trusts & Probate List");
    expect(result).toContain("## Technology & Construction Court");
  });

  it("should return the empty message when there are no items", () => {
    expect(formatCaseSummaryForEmail([])).toBe("No cases scheduled.");
  });
});
