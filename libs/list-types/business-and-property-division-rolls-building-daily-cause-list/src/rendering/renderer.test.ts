import { describe, expect, it } from "vitest";
import type { BusinessAndPropertyRollsData, ChdKbHearing } from "../models/types.js";
import { SECTIONS } from "../sections.js";
import { renderBusinessAndPropertyRolls } from "./renderer.js";

const baseOptions = {
  locale: "en",
  contentDate: new Date(2026, 0, 15),
  lastReceivedDate: "2026-01-14T09:30:00Z"
};

function emptyData(): BusinessAndPropertyRollsData {
  return Object.fromEntries(SECTIONS.map((s) => [s.key, []])) as BusinessAndPropertyRollsData;
}

function hearing(overrides: Partial<ChdKbHearing> = {}): ChdKbHearing {
  return {
    judge: "Mr Justice Smith",
    time: "10.30am",
    venue: "Court 1",
    type: "Trial",
    caseNumber: "CR-2026-000123",
    caseName: "Acme v Widgets",
    additionalInformation: "",
    ...overrides
  };
}

describe("renderBusinessAndPropertyRolls", () => {
  it("should render the English title and 16 sections in order", () => {
    const result = renderBusinessAndPropertyRolls(emptyData(), baseOptions);

    expect(result.header.listTitle).toBe("Business and Property Division Rolls Building Daily Cause List");
    expect(result.sections).toHaveLength(16);
    expect(result.sections.map((s) => s.key)).toEqual(SECTIONS.map((s) => s.key));
    expect(result.sections[0].title).toBe("Appeal List");
  });

  it("should render Welsh title and Welsh section titles when locale is cy", () => {
    const result = renderBusinessAndPropertyRolls(emptyData(), { ...baseOptions, locale: "cy" });

    expect(result.header.listTitle).toBe("Rhestr Achosion Dyddiol Adran Busnes ac Eiddo - Adeilad Rolls");
    expect(result.sections[0].title).toBe("Y Rhestr Apeliadau");
  });

  it("should normalise hearing time and default missing additional information", () => {
    const data = emptyData();
    data.appealList = [hearing({ time: "2.15pm", additionalInformation: undefined as unknown as string })];

    const result = renderBusinessAndPropertyRolls(data, baseOptions);

    const appeal = result.sections.find((s) => s.key === "appealList");
    expect(appeal?.hearings[0].time).toBe("2:15pm");
    expect(appeal?.hearings[0].additionalInformation).toBe("");
  });

  it("should keep sections that have no hearings as empty arrays", () => {
    const data = emptyData();
    data.revenueList = [hearing()];

    const result = renderBusinessAndPropertyRolls(data, baseOptions);

    expect(result.sections.find((s) => s.key === "appealList")?.hearings).toHaveLength(0);
    expect(result.sections.find((s) => s.key === "revenueList")?.hearings).toHaveLength(1);
  });

  it("should format the last updated time", () => {
    const result = renderBusinessAndPropertyRolls(emptyData(), baseOptions);
    expect(result.header.lastUpdatedTime).toMatch(/9:30am/);
  });
});
