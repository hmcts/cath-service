import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copDailyCauseListCy as cy, copDailyCauseListEn as en } from "@hmcts/cop-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "cop-daily-cause-list.njk";

interface CaseOverrides {
  caseNumber?: string;
  caseName?: string;
  caseSequenceIndicator?: string;
  caseType?: string;
  formattedReportingRestriction?: string;
}

interface SittingOverrides {
  time?: string;
  durationAsHours?: number;
  durationAsMinutes?: number;
  caseHearingChannel?: string;
  hearingType?: string;
  cases?: ReturnType<typeof buildCase>[];
}

// Fixture builders — each layer defaults to a realistic minimal shape and only
// the varied leaf fields are passed per test, keeping the deep artefact tree
// (courtLists → courtHouse → courtRoom → session → sitting → hearing → case)
// out of individual tests.
function buildCase(overrides: CaseOverrides = {}) {
  return {
    caseNumber: "T123",
    caseName: "Re X",
    caseType: "COP",
    formattedReportingRestriction: "",
    ...overrides
  };
}

function buildSitting({
  time = "10:00am",
  durationAsHours = 1,
  durationAsMinutes = 0,
  caseHearingChannel = "In person",
  hearingType = "Directions",
  cases
}: SittingOverrides = {}) {
  return {
    time,
    durationAsHours,
    durationAsMinutes,
    caseHearingChannel,
    hearing: [{ hearingType, case: cases ?? [buildCase()] }]
  };
}

function buildSession({
  courtRoomName = "Court 1",
  formattedJudiciaries = "",
  sittings
}: {
  courtRoomName?: string;
  formattedJudiciaries?: string;
  sittings?: unknown[];
} = {}) {
  return {
    courtRoomName,
    session: [{ formattedJudiciaries, sittings: sittings ?? [buildSitting()] }]
  };
}

function buildCourtHouse({ courtHouseName = "Test Court", courtRoom = [buildSession()] }: { courtHouseName?: string; courtRoom?: unknown[] } = {}) {
  return { courtHouse: { courtHouseName, courtRoom } };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    header: {
      locationName: "Regional COP Court",
      courtName: "Regional COP Court",
      region: "North",
      regionalJoh: "Judge Regional",
      addressLines: ["123 Test Street", "Test City", "TC1 1AA"],
      contentDate: "10 July 2026",
      lastUpdated: "10 July 2026 at 9:00am"
    },
    openJustice: {
      venueName: "Test Venue",
      email: "test@example.com",
      phone: "01234 567890"
    },
    dataSource: "Test Source"
  };
}

function renderList(courtLists: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  const base = baseData(locale);
  return render(env, TEMPLATE, {
    ...base,
    ...overrides,
    header: { ...base.header, ...(overrides.header as object) },
    listData: { courtLists }
  });
}

// The rendered hearings table columns, in order (7 columns; reporting
// restrictions render on a separate full-width row, not as a column).
const COLUMN = { startTime: 0, caseRef: 1, caseDetails: 2, caseType: 3, hearingType: 4, timeEstimate: 5, hearingChannel: 6 } as const;

function firstDataRowCells($: CheerioAPI) {
  return $("tbody.govuk-table__body tr")
    .first()
    .find("td")
    .map((_, el) => $(el).text().trim())
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("cop-daily-cause-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should use https URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.openJusticeLink).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.openJusticeLink).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the 'In the Court of Protection' heading with the region", () => {
      const { $ } = renderList([]);

      expect($("#page-heading").text().replace(/\s+/g, " ").trim()).toBe(`${en.inCop}: North`);
    });

    it("should render the regional lead judge heading when present", () => {
      const { $ } = renderList([]);

      expect($("#page-heading2").text().replace(/\s+/g, " ").trim()).toBe(`${en.regionalLeadJudge} Judge Regional`);
    });

    it("should omit the regional lead judge heading when absent", () => {
      const { $ } = renderList([], { header: { regionalJoh: "" } });

      expect($("#page-heading2")).toHaveLength(0);
    });

    it("should render the 'Sitting at' heading with the court name", () => {
      const { $ } = renderList([]);

      expect($("#page-heading3").text().replace(/\s+/g, " ").trim()).toBe(`${en.sittingAt} Regional COP Court`);
    });

    it("should omit the region suffix when no region is provided", () => {
      const { $ } = renderList([], { header: { region: "" } });

      expect($("#page-heading").text().replace(/\s+/g, " ").trim()).toBe(en.inCop);
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
    });

    it("should render the open justice link and search cases input", () => {
      const { $ } = renderList([]);

      expect($(`a[href="${en.openJusticeLink}"]`)).toHaveLength(1);
      expect($("h2.govuk-heading-m").text()).toContain(en.searchCases);
      expect($("#case-search-input")).toHaveLength(1);
    });

    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Court of Protection Data" });

      const footer = $("p.govuk-body").last().text();
      expect(footer).toContain(en.dataSource);
      expect(footer).toContain("Court of Protection Data");
    });

    it("should render a back to top link", () => {
      const { $ } = renderList([]);

      const backToTop = $('.back-to-top a[href="#top"]');
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text().trim()).toBe(en.backToTop);
    });
  });

  describe("Session judiciary variations", () => {
    it("should include the judiciary in the section heading when present", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildSession({ courtRoomName: "Court 1", formattedJudiciaries: "Judge Smith" })] })]);

      const heading = $(".govuk-accordion__section-button").text().replace(/\s+/g, " ").trim();
      expect(heading).toBe(`Court 1, ${en.beforeJudge} Judge Smith`);
    });

    it("should render only the court room name when no judiciary is provided", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildSession({ courtRoomName: "Court 2", formattedJudiciaries: "" })] })]);

      const heading = $(".govuk-accordion__section-button").text().replace(/\s+/g, " ").trim();
      expect(heading).toBe("Court 2");
      expect(heading).not.toContain(en.beforeJudge);
    });
  });

  describe("Hearings table", () => {
    it("should render the seven table headers in order", () => {
      const { $ } = renderList([buildCourtHouse()]);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([en.startTime, en.caseRef, en.caseDetails, en.caseType, en.hearingType, en.timeEstimate, en.hearingChannel]);
    });

    it("should place each case field in its correct column", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({
                  time: "10:00am",
                  caseHearingChannel: "Video",
                  hearingType: "Directions",
                  cases: [buildCase({ caseNumber: "12345", caseName: "Re X", caseType: "COP" })]
                })
              ]
            })
          ]
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.startTime]).toBe("10:00am");
      expect(cells[COLUMN.caseRef]).toBe("12345");
      expect(cells[COLUMN.caseDetails]).toBe("Re X");
      expect(cells[COLUMN.caseType]).toBe("COP");
      expect(cells[COLUMN.hearingType]).toBe("Directions");
      expect(cells[COLUMN.hearingChannel]).toBe("Video");
    });

    it("should render a row per case across multiple hearings and cases", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                {
                  time: "10:00am",
                  durationAsHours: 1,
                  durationAsMinutes: 0,
                  caseHearingChannel: "In person",
                  hearing: [
                    {
                      hearingType: "Directions",
                      case: [buildCase({ caseNumber: "12345", caseName: "Case One" }), buildCase({ caseNumber: "12346", caseName: "Case Two" })]
                    },
                    { hearingType: "Hearing", case: [buildCase({ caseNumber: "67890", caseName: "Case Three" })] }
                  ]
                }
              ]
            })
          ]
        })
      ]);

      const caseRefs = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseRef).text().trim())
        .get();
      expect(caseRefs).toEqual(["12345", "12346", "67890"]);
    });
  });

  describe("Duration variations", () => {
    function durationCell(durationAsHours: number, durationAsMinutes: number) {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildSession({ sittings: [buildSitting({ durationAsHours, durationAsMinutes })] })] })]);
      return firstDataRowCells($)[COLUMN.timeEstimate];
    }

    it("should render hours only (plural)", () => {
      expect(durationCell(2, 0)).toBe("2 hours");
    });

    it("should render minutes only (plural)", () => {
      expect(durationCell(0, 30)).toBe("30 mins");
    });

    it("should render hours and minutes", () => {
      expect(durationCell(2, 45)).toBe("2 hours 45 mins");
    });
  });

  describe("Case variations", () => {
    it("should append the sequence indicator to the time estimate when present", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({ sittings: [buildSitting({ durationAsHours: 1, durationAsMinutes: 0, cases: [buildCase({ caseSequenceIndicator: "2 of 3" })] })] })
          ]
        })
      ]);

      expect(firstDataRowCells($)[COLUMN.timeEstimate]).toBe("1 hour [2 of 3]");
    });

    it("should render the reporting restriction on a separate full-width row when present", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [buildSession({ sittings: [buildSitting({ cases: [buildCase({ formattedReportingRestriction: "Section 4 applies" })] })] })]
        })
      ]);

      const restrictionRow = $("tbody.govuk-table__body tr").last();
      const cell = restrictionRow.find("td");
      expect(cell).toHaveLength(1);
      expect(cell.attr("colspan")).toBe("7");
      expect(cell.text()).toContain(en.reportingRestrictions);
      expect(cell.text()).toContain("Section 4 applies");
    });

    it("should not render a reporting restriction row when there is no restriction", () => {
      const { $ } = renderList([
        buildCourtHouse({ courtRoom: [buildSession({ sittings: [buildSitting({ cases: [buildCase({ formattedReportingRestriction: "" })] })] })] })
      ]);

      expect($("tbody.govuk-table__body tr")).toHaveLength(1);
      expect($('td[colspan="7"]')).toHaveLength(0);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, table headers and labels", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildSession({ courtRoomName: "Court 1", formattedJudiciaries: "Barnwr Jones" })] })], {}, cy);

      expect($("#page-heading").text()).toContain(cy.inCop);
      expect($("#page-heading3").text()).toContain(cy.sittingAt);
      expect($(".govuk-accordion__section-button").text()).toContain(cy.beforeJudge);
      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(cy.startTime);
      expect(headers).toContain(cy.hearingChannel);
      expect(headers).toContain(cy.caseDetails);
    });
  });
});
