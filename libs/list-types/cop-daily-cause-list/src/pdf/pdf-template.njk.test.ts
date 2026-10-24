import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATE = "pdf-template.njk";

function buildCourtRoomWithCase(overrides: Record<string, unknown> = {}) {
  return {
    courtHouse: {
      courtHouseName: "Court of Protection",
      courtRoom: [
        {
          courtRoomName: "Courtroom 1",
          session: [
            {
              formattedJudiciaries: "",
              sittings: [
                {
                  time: "10:00am",
                  durationAsHours: 0,
                  durationAsMinutes: 0,
                  caseHearingChannel: "In person",
                  hearing: [
                    {
                      hearingType: "Hearing",
                      case: [
                        {
                          caseNumber: "CASE-123",
                          caseName: "Smith v Jones",
                          caseType: "Civil",
                          formattedReportingRestriction: "",
                          ...overrides
                        }
                      ]
                    }
                  ]
                }
              ]
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
      courtName: "Court of Protection",
      contentDate: "13 July 2026",
      lastUpdated: "13 July 2026 at 9:00am"
    },
    openJustice: {
      venueName: "Court of Protection",
      email: "cop@justice.gov.uk",
      phone: "0300 123 5577"
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

describe("cop-daily-cause-list pdf-template", () => {
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

  describe("Caution box", () => {
    it("should render the caution box with the caution note and reporting text", () => {
      const { $ } = renderPdf();

      const cautionBox = $(".caution-box");
      expect(cautionBox).toHaveLength(1);
      expect(cautionBox.text()).toContain(en.cautionNote);
      expect(cautionBox.text()).toContain(en.cautionReporting);
    });

    it("should render the caution box in Welsh when the cy locale is used", () => {
      const { $ } = renderPdf([], {}, cy);

      expect($(".caution-box").text()).toContain(cy.cautionNote);
    });
  });
});
