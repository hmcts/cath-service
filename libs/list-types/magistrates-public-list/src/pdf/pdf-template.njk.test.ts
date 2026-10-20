import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import type { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATE = "pdf-template.njk";

function buildCourtRoomWithCase(overrides: Record<string, unknown> = {}) {
  return {
    courtHouse: {
      courtRoom: [
        {
          courtRoomName: "Courtroom 1",
          session: [
            {
              formattedJudiciaries: "",
              sittings: [
                {
                  time: "10:00am",
                  hearing: [
                    {
                      hearingType: "Hearing",
                      case: [
                        {
                          caseUrn: "URN-123",
                          defendant: "John Smith",
                          prosecutingAuthority: "CPS",
                          offences: [],
                          reportingRestriction: false,
                          ...overrides
                        }
                      ],
                      application: []
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
      locationName: "Preston Magistrates Court",
      contentDate: "13 July 2026",
      publishedDate: "13 July 2026",
      publishedTime: "9am",
      venueAddress: []
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

describe("magistrates-public-list pdf-template", () => {
  describe("Reporting restriction row", () => {
    it("should render the restriction-row class on the restriction row when a case has a reporting restriction", () => {
      const { $ } = renderPdf([buildCourtRoomWithCase({ reportingRestriction: true })]);

      const restrictionRow = $("tr.restriction-row");
      expect(restrictionRow).toHaveLength(1);
      expect(restrictionRow.text()).toContain(en.reportingRestrictionText);
    });

    it("should keep the existing split-cell border overrides on the restriction row", () => {
      const { $ } = renderPdf([buildCourtRoomWithCase({ reportingRestriction: true })]);

      const cells = $("tr.restriction-row td");
      expect(cells).toHaveLength(2);
      expect(cells.first().attr("style")).toContain("border-right: none");
      expect(cells.last().attr("style")).toContain("border-left: none");
    });

    it("should not render a restriction row when a case has no reporting restriction", () => {
      const { $ } = renderPdf([buildCourtRoomWithCase({ reportingRestriction: false })]);

      expect($("tr.restriction-row")).toHaveLength(0);
    });
  });
});
