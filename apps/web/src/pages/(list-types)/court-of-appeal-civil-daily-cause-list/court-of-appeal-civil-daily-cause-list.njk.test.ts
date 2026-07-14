import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { courtOfAppealCivilDailyCauseListCy as cy, courtOfAppealCivilDailyCauseListEn as en } from "@hmcts/court-of-appeal-civil-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "court-of-appeal-civil-daily-cause-list.njk";

interface HearingOverrides {
  venue?: string;
  judge?: string;
  time?: string;
  caseNumber?: string;
  caseDetails?: string;
  hearingType?: string;
  additionalInformation?: string;
}

interface JudgmentOverrides extends HearingOverrides {
  date?: string;
}

// Fixture builders — a single realistic row is the default; individual tests
// only pass the leaf fields they vary.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    venue: "Court 1",
    judge: "Lady Justice Smith",
    time: "10:30am",
    caseNumber: "A1/2026/0001",
    caseDetails: "Smith v Jones",
    hearingType: "Application",
    additionalInformation: "Remote hearing",
    ...overrides
  };
}

function buildJudgment(overrides: JudgmentOverrides = {}) {
  return {
    date: "15 July 2026",
    venue: "Court 3",
    judge: "Lord Justice Davis",
    time: "9:30am",
    caseNumber: "A1/2026/0003",
    caseDetails: "Taylor v Anderson",
    hearingType: "Judgment",
    additionalInformation: "Reserved judgment",
    ...overrides
  };
}

function buildHeader(locale: typeof en | typeof cy = en) {
  return {
    listTitle: locale.pageTitle,
    listDate: "10 July 2026",
    lastUpdatedDate: "10 July 2026",
    lastUpdatedTime: "10:30am"
  };
}

function renderPage(overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, {
    t: locale,
    en,
    cy,
    header: buildHeader(locale),
    dailyHearings: [],
    futureJudgments: [],
    dataSource: "Test Source",
    ...overrides
  });
}

// Column order for each table (matches the .njk template header/cell order).
const DAILY_COLUMN = { venue: 0, judge: 1, time: 2, caseNumber: 3, caseDetails: 4, hearingType: 5, additionalInformation: 6 } as const;
const FUTURE_COLUMN = { date: 0, venue: 1, judge: 2, time: 3, caseNumber: 4, caseDetails: 5, hearingType: 6, additionalInformation: 7 } as const;

function tableByLabel($: CheerioAPI, label: string) {
  return $(`table[aria-label="${label}"]`);
}

function headerTexts($: CheerioAPI, label: string) {
  return tableByLabel($, label)
    .find("thead th")
    .map((_, el) => $(el).text().trim())
    .get();
}

function rowCells($: CheerioAPI, label: string, rowIndex = 0) {
  return tableByLabel($, label)
    .find("tbody tr")
    .eq(rowIndex)
    .find("td")
    .map((_, el) => $(el).text().trim())
    .get();
}

function columnValues($: CheerioAPI, label: string, columnIndex: number) {
  return tableByLabel($, label)
    .find("tbody tr")
    .map((_, row) => $(row).find("td").eq(columnIndex).text().trim())
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("court-of-appeal-civil-daily-cause-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have the same table header keys in English and Welsh", () => {
      expect(Object.keys(en.tableHeaders).sort()).toEqual(Object.keys(cy.tableHeaders).sort());
    });

    it("should use https FACT and live-stream link URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.liveStreamingLinkUrl).toMatch(/^https:\/\//);
      expect(cy.liveStreamingLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the list title in the h1 with the back-to-top anchor id", () => {
      const { $ } = renderPage();

      const heading = $("h1#top");
      expect(heading).toHaveLength(1);
      expect(heading.text()).toContain(en.pageTitle);
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderPage();

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
    });

    it("should render the location lines", () => {
      const { $ } = renderPage();

      const bodyText = $(".govuk-grid-column-full").text();
      expect(bodyText).toContain(en.locationLine1);
      expect(bodyText).toContain(en.locationLine2);
      expect(bodyText).toContain(en.locationLine3);
    });

    it("should render the list date and last updated information", () => {
      const { $ } = renderPage();

      const bodyText = $(".govuk-grid-column-full").text();
      expect(bodyText).toContain(`${en.listFor} 10 July 2026`);
      expect(bodyText).toContain(`${en.lastUpdated} 10 July 2026 ${en.at} 10:30am`);
    });
  });

  describe("Important information section", () => {
    it("should render the details component with the important information content and live-stream link", () => {
      const { $ } = renderPage();

      const details = $(".govuk-details");
      expect(details).toHaveLength(1);
      const detailsText = details.text();
      expect(detailsText).toContain(en.importantInfoTitle);
      expect(detailsText).toContain(en.liveStreamingTitle);
      expect(detailsText).toContain(en.liveStreamingText1);
      expect(detailsText).toContain(en.liveStreamingLinkText);
      expect(detailsText).toContain(en.judgmentsTitle);
      expect(detailsText).toContain(en.judgmentsText);
      expect(details.find(`a[href="${en.liveStreamingLinkUrl}"]`).length).toBeGreaterThan(0);
    });
  });

  describe("Search section", () => {
    it("should render the search input with a visually hidden label", () => {
      const { $ } = renderPage();

      expect($("h2.govuk-heading-s").text()).toContain(en.searchCasesTitle);

      const input = $("input#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("type")).toBe("text");
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);

      const label = $("label.govuk-label.govuk-visually-hidden");
      expect(label.attr("for")).toBe("case-search-input");
    });
  });

  describe("Daily hearings section", () => {
    it("should render the daily hearings table headers in order", () => {
      const { $ } = renderPage({ dailyHearings: [buildHearing()] });

      expect(headerTexts($, en.dailyHearingsTitle)).toEqual([
        en.tableHeaders.venue,
        en.tableHeaders.judge,
        en.tableHeaders.time,
        en.tableHeaders.caseNumber,
        en.tableHeaders.caseDetails,
        en.tableHeaders.hearingType,
        en.tableHeaders.additionalInformation
      ]);
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderPage({
        dailyHearings: [
          buildHearing({
            venue: "Court 1",
            judge: "Lady Justice Smith",
            time: "10:30am",
            caseNumber: "A1/2026/0001",
            caseDetails: "Smith v Jones",
            hearingType: "Application",
            additionalInformation: "Remote hearing"
          })
        ]
      });

      const cells = rowCells($, en.dailyHearingsTitle);
      expect(cells[DAILY_COLUMN.venue]).toBe("Court 1");
      expect(cells[DAILY_COLUMN.judge]).toBe("Lady Justice Smith");
      expect(cells[DAILY_COLUMN.time]).toBe("10:30am");
      expect(cells[DAILY_COLUMN.caseNumber]).toBe("A1/2026/0001");
      expect(cells[DAILY_COLUMN.caseDetails]).toBe("Smith v Jones");
      expect(cells[DAILY_COLUMN.hearingType]).toBe("Application");
      expect(cells[DAILY_COLUMN.additionalInformation]).toBe("Remote hearing");
    });

    it("should render a row per hearing when there are multiple hearings", () => {
      const { $ } = renderPage({
        dailyHearings: [
          buildHearing({ caseNumber: "A1/2026/0001", judge: "Lady Justice Smith" }),
          buildHearing({ caseNumber: "A1/2026/0002", judge: "Lord Justice Brown" })
        ]
      });

      expect(columnValues($, en.dailyHearingsTitle, DAILY_COLUMN.caseNumber)).toEqual(["A1/2026/0001", "A1/2026/0002"]);
      expect(columnValues($, en.dailyHearingsTitle, DAILY_COLUMN.judge)).toEqual(["Lady Justice Smith", "Lord Justice Brown"]);
    });

    it("should render empty cells for empty hearing fields while keeping the populated one", () => {
      const { $ } = renderPage({
        dailyHearings: [
          buildHearing({ venue: "", judge: "", time: "", caseNumber: "A1/2026/0001", caseDetails: "", hearingType: "", additionalInformation: "" })
        ]
      });

      const cells = rowCells($, en.dailyHearingsTitle);
      expect(cells[DAILY_COLUMN.caseNumber]).toBe("A1/2026/0001");
      expect(cells[DAILY_COLUMN.venue]).toBe("");
      expect(cells[DAILY_COLUMN.judge]).toBe("");
      expect(cells[DAILY_COLUMN.additionalInformation]).toBe("");
    });

    it("should render the empty-state message and no table when there are no daily hearings", () => {
      const { $ } = renderPage({ dailyHearings: [] });

      expect(tableByLabel($, en.dailyHearingsTitle)).toHaveLength(0);
      expect($("#daily-hearings-section")).toHaveLength(0);
      expect($(".govuk-grid-column-full").text()).toContain(en.noHearingsMessage);
    });
  });

  describe("Future judgments section", () => {
    it("should render the future judgments table headers in order, including the date column", () => {
      const { $ } = renderPage({ futureJudgments: [buildJudgment()] });

      expect(headerTexts($, en.futureJudgmentsTitle)).toEqual([
        en.tableHeaders.date,
        en.tableHeaders.venue,
        en.tableHeaders.judge,
        en.tableHeaders.time,
        en.tableHeaders.caseNumber,
        en.tableHeaders.caseDetails,
        en.tableHeaders.hearingType,
        en.tableHeaders.additionalInformation
      ]);
    });

    it("should place each judgment field in its correct column", () => {
      const { $ } = renderPage({
        futureJudgments: [
          buildJudgment({
            date: "15 July 2026",
            venue: "Court 3",
            judge: "Lord Justice Davis",
            time: "9:30am",
            caseNumber: "A1/2026/0003",
            caseDetails: "Taylor v Anderson",
            hearingType: "Judgment",
            additionalInformation: "Reserved judgment"
          })
        ]
      });

      const cells = rowCells($, en.futureJudgmentsTitle);
      expect(cells[FUTURE_COLUMN.date]).toBe("15 July 2026");
      expect(cells[FUTURE_COLUMN.venue]).toBe("Court 3");
      expect(cells[FUTURE_COLUMN.judge]).toBe("Lord Justice Davis");
      expect(cells[FUTURE_COLUMN.time]).toBe("9:30am");
      expect(cells[FUTURE_COLUMN.caseNumber]).toBe("A1/2026/0003");
      expect(cells[FUTURE_COLUMN.caseDetails]).toBe("Taylor v Anderson");
      expect(cells[FUTURE_COLUMN.hearingType]).toBe("Judgment");
      expect(cells[FUTURE_COLUMN.additionalInformation]).toBe("Reserved judgment");
    });

    it("should render a row per judgment when there are multiple judgments", () => {
      const { $ } = renderPage({
        futureJudgments: [
          buildJudgment({ caseNumber: "A1/2026/0003", date: "15 July 2026" }),
          buildJudgment({ caseNumber: "A1/2026/0004", date: "16 July 2026" })
        ]
      });

      expect(columnValues($, en.futureJudgmentsTitle, FUTURE_COLUMN.caseNumber)).toEqual(["A1/2026/0003", "A1/2026/0004"]);
      expect(columnValues($, en.futureJudgmentsTitle, FUTURE_COLUMN.date)).toEqual(["15 July 2026", "16 July 2026"]);
    });

    it("should render the empty-state message and no table when there are no future judgments", () => {
      const { $ } = renderPage({ futureJudgments: [] });

      expect(tableByLabel($, en.futureJudgmentsTitle)).toHaveLength(0);
      expect($("#future-judgments-section")).toHaveLength(0);
      const emptySection = $(".hearings-section.section-divider");
      expect(emptySection).toHaveLength(1);
      expect(emptySection.find("h2").text()).toContain(en.futureJudgmentsTitle);
      expect(emptySection.text()).toContain(en.noHearingsMessage);
    });

    it("should apply the section-divider class to the future judgments section when populated", () => {
      const { $ } = renderPage({ futureJudgments: [buildJudgment()] });

      const section = $("#future-judgments-section");
      expect(section).toHaveLength(1);
      expect(section.hasClass("section-divider")).toBe(true);
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderPage({ dataSource: "HMCTS Publishing Service" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("HMCTS Publishing Service");
    });

    it("should render a back-to-top link pointing at the heading anchor", () => {
      const { $ } = renderPage();

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(en.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, table headers and labels", () => {
      const { $ } = renderPage({ dailyHearings: [buildHearing({ venue: "Llys 1", judge: "Yr Arglwyddes Gyfiawnder Smith" })] }, cy);

      expect($("h1#top").text()).toContain(cy.pageTitle);
      expect($(".govuk-grid-column-full").text()).toContain(cy.locationLine1);
      expect($("h2.govuk-heading-s").text()).toContain(cy.searchCasesTitle);

      const headers = headerTexts($, cy.dailyHearingsTitle);
      expect(headers).toContain(cy.tableHeaders.venue);
      expect(headers).toContain(cy.tableHeaders.judge);
      expect(headers).toContain(cy.tableHeaders.time);
      expect(headers).toContain(cy.tableHeaders.caseNumber);

      expect(rowCells($, cy.dailyHearingsTitle)[DAILY_COLUMN.venue]).toBe("Llys 1");
      expect($(".back-to-top a").text()).toContain(cy.backToTop);
    });
  });
});
