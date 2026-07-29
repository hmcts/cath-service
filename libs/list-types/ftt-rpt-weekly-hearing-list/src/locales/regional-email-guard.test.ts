import { listTypeData } from "@hmcts/list-types-common";
import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const RPT_URL_PATH = "ftt-rpt-weekly-hearing-list";

describe("guard: every FTT RPT list type must have a regional email configured", () => {
  const rptListTypeNames = listTypeData.filter((listType) => listType.urlPath === RPT_URL_PATH).map((listType) => listType.name);

  it("should find at least one FTT RPT list type in list-type-data.ts", () => {
    expect(rptListTypeNames.length).toBeGreaterThan(0);
  });

  it("should have a matching en.rptRegionalEmail entry for every FTT RPT list type", () => {
    const missing = rptListTypeNames.filter((name) => !(name in en.rptRegionalEmail));
    expect(missing).toEqual([]);
  });

  it("should have a matching cy.rptRegionalEmail entry for every FTT RPT list type", () => {
    const missing = rptListTypeNames.filter((name) => !(name in cy.rptRegionalEmail));
    expect(missing).toEqual([]);
  });

  it("should not have stale rptRegionalEmail entries with no corresponding list type", () => {
    const enStale = Object.keys(en.rptRegionalEmail).filter((name) => !rptListTypeNames.includes(name));
    const cyStale = Object.keys(cy.rptRegionalEmail).filter((name) => !rptListTypeNames.includes(name));
    expect(enStale).toEqual([]);
    expect(cyStale).toEqual([]);
  });
});
