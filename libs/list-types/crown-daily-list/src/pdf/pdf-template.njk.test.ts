import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import type { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATE = "pdf-template.njk";

function buildCourtRoomWithCase(overrides: Record<string, unknown> = {}, sessionOverrides: Record<string, unknown> = {}) {
  return {
    courtHouse: {
      courtHouseName: "Main Crown Court",
      courtHouseAddressLines: ["1 Court Street"],
      courtHousePhone: "",
      courtRoom: [
        {
          courtRoomName: "Courtroom 1",
          session: [
            {
              formattedJudiciaries: "",
              hasListingNotes: false,
              sittings: [
                {
                  hearing: [
                    {
                      displayHearingType: "Trial",
                      case: [
                        {
                          timeMarkingNote: "10:00am",
                          caseNumber: "CASE-123",
                          defendants: "John Smith",
                          prosecutingAuthority: "CPS",
                          listingNotes: "",
                          formattedReportingRestriction: "",
                          ...overrides
                        }
                      ]
                    }
                  ]
                }
              ],
              ...sessionOverrides
            }
          ]
        }
      ]
    }
  };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    pdfStyles: "",
    dataSource: "Test Source",
    header: {
      locationName: "Main Crown Court",
      contentDate: "13 July 2026",
      lastUpdated: "13 July 2026 at 9:00am",
      version: "",
      addressLines: ["1 Court Street"]
    }
  };
}

function renderPdf(courtLists: unknown[] = [], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, listData: { courtLists } });
}

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([__dirname]);
});

describe("crown-daily-list pdf-template", () => {
  describe("Reporting restriction row", () => {
    it("should render the restriction-row class on the restriction row when a case has a reporting restriction", () => {
      const { $ } = renderPdf([buildCourtRoomWithCase({ formattedReportingRestriction: "No reporting until trial concludes" })]);

      const restrictionRow = $("tr.restriction-row");
      expect(restrictionRow).toHaveLength(1);
      expect(restrictionRow.text()).toContain("No reporting until trial concludes");
    });

    it("should not render a restriction row when a case has no reporting restriction", () => {
      const { $ } = renderPdf([buildCourtRoomWithCase({ formattedReportingRestriction: "" })]);

      expect($("tr.restriction-row")).toHaveLength(0);
    });
  });
});
