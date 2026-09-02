import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rcjStandardDailyCauseListCy as cy, rcjStandardDailyCauseListEn as en } from "@hmcts/rcj-standard-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "court-of-appeal-criminal-division-daily-cause-list.njk";

const listEn = en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST;
const listCy = cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST;

interface HearingOverrides {
  venue?: string;
  judge?: string;
  time?: string;
  caseNumber?: string;
  caseDetails?: string;
  hearingType?: string;
  additionalInformation?: string;
}

// Fixture builders — each hearing defaults to a realistic minimal row and only
// the varied leaf fields are passed per test.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    venue: "Court 1",
    judge: "Judge Smith",
    time: "10:00am",
    caseNumber: "T123456",
    caseDetails: "R v Jones",
    hearingType: "Appeal",
    additionalInformation: "In person",
    ...overrides
  };
}

function baseData(locale: typeof en | typeof cy = en) {
  const content = locale === cy ? listCy : listEn;
  return {
    common: locale.common,
    listContent: content,
    header: {
      listTitle: content.pageTitle,
      listDate: "13 July 2026",
      lastUpdatedDate: "13 July 2026",
      lastUpdatedTime: "9:00am"
    },
    dataSource: "Test Source"
  };
}

function renderList(hearings: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, hearings });
}

// The rendered hearings table columns, in order.
const COLUMN = { venue: 0, judge: 1, time: 2, caseNumber: 3, caseDetails: 4, hearingType: 5, additionalInformation: 6 } as const;

function rowCells($: CheerioAPI, rowIndex = 0) {
  return $("tbody.govuk-table__body tr")
    .eq(rowIndex)
    .find("td")
    .map((_, el) => $(el).text().trim())
    .get();
}

function headerTexts($: CheerioAPI) {
  return $("thead th")
    .map((_, el) => $(el).text().trim())
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("court-of-appeal-criminal-division-daily-cause-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same top-level keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have the same keys in English and Welsh for the list content", () => {
      expect(Object.keys(listEn).sort()).toEqual(Object.keys(listCy).sort());
    });

    it("should have the same keys in English and Welsh for common", () => {
      expect(Object.keys(en.common).sort()).toEqual(Object.keys(cy.common).sort());
    });

    it("should use https URLs for the FACT and quick guide links", () => {
      expect(en.common.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.common.factLinkUrl).toMatch(/^https:\/\//);
      expect(listEn.quickGuideLinkUrl).toMatch(/^https:\/\//);
      expect(listCy.quickGuideLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the heading with the page title and an anchor id", () => {
      const { $ } = renderList([]);

      const heading = $("h1#top");
      expect(heading).toHaveLength(1);
      expect(heading.text()).toContain(listEn.pageTitle);
    });

    it("should render the location lines", () => {
      const { $ } = renderList([]);

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(listEn.locationLine1);
      expect(bodyText).toContain(listEn.locationLine2);
      expect(bodyText).toContain(listEn.locationLine3);
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.common.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.hasClass("govuk-link")).toBe(true);
      expect(factLink.text()).toContain(en.common.factLinkText);
    });

    it("should render the list date and last updated details", () => {
      const { $ } = renderList([]);

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(en.common.listFor);
      expect(bodyText).toContain("13 July 2026");
      expect(bodyText).toContain(en.common.lastUpdated);
      expect(bodyText).toContain("9:00am");
    });

    it("should render the important information section with the quick guide link", () => {
      const { $ } = renderList([]);

      const details = $("details.govuk-details");
      expect(details).toHaveLength(1);
      expect(details.text()).toContain(en.common.importantInfoTitle);
      expect(details.text()).toContain(listEn.importantInfoText);

      const quickGuideLink = details.find(`a[href="${listEn.quickGuideLinkUrl}"]`);
      expect(quickGuideLink).toHaveLength(1);
      expect(quickGuideLink.text()).toContain(listEn.quickGuideLinkText);
      expect(quickGuideLink.attr("target")).toBe("_blank");
      expect(quickGuideLink.attr("rel")).toBe("noopener noreferrer");
    });

    it("should render the search cases section with an accessible input", () => {
      const { $ } = renderList([]);

      expect($("h2").filter((_, el) => $(el).text().trim() === en.common.searchCasesTitle)).toHaveLength(1);
      const searchInput = $("#case-search-input");
      expect(searchInput).toHaveLength(1);
      expect(searchInput.attr("aria-label")).toBe(en.common.searchCasesLabel);
    });
  });

  describe("Hearings table", () => {
    it("should render the table with role, aria-label and column-scoped headers", () => {
      const { $ } = renderList([]);

      const table = $("table#hearings-table");
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe(listEn.pageTitle);

      const headers = headerTexts($);
      expect(headers).toEqual([
        en.common.tableHeaders.venue,
        en.common.tableHeaders.judge,
        en.common.tableHeaders.time,
        en.common.tableHeaders.caseNumber,
        en.common.tableHeaders.caseDetails,
        en.common.tableHeaders.hearingType,
        en.common.tableHeaders.additionalInformation
      ]);
      expect($("thead th[scope='col']")).toHaveLength(7);
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          venue: "Court 1",
          judge: "Judge Smith",
          time: "10:00am",
          caseNumber: "T123456",
          caseDetails: "R v Jones",
          hearingType: "Appeal",
          additionalInformation: "In person"
        })
      ]);

      const cells = rowCells($);
      expect(cells[COLUMN.venue]).toBe("Court 1");
      expect(cells[COLUMN.judge]).toBe("Judge Smith");
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.caseNumber]).toBe("T123456");
      expect(cells[COLUMN.caseDetails]).toBe("R v Jones");
      expect(cells[COLUMN.hearingType]).toBe("Appeal");
      expect(cells[COLUMN.additionalInformation]).toBe("In person");
    });

    it("should render a row per hearing across multiple hearings", () => {
      const { $ } = renderList([
        buildHearing({ venue: "Court 1", judge: "Judge Smith", caseDetails: "R v Jones", caseNumber: "T123456" }),
        buildHearing({ venue: "Court 2", judge: "Judge Williams", caseDetails: "R v Brown", caseNumber: "T789012", hearingType: "Sentence" }),
        buildHearing({ venue: "Court 3", judge: "Judge Taylor", caseDetails: "R v Green", caseNumber: "T345678", hearingType: "Application" })
      ]);

      expect($("tbody.govuk-table__body tr")).toHaveLength(3);
      const venues = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.venue).text().trim())
        .get();
      expect(venues).toEqual(["Court 1", "Court 2", "Court 3"]);
      const caseDetails = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseDetails).text().trim())
        .get();
      expect(caseDetails).toEqual(["R v Jones", "R v Brown", "R v Green"]);
    });

    it("should render no rows when the hearings array is empty", () => {
      const { $ } = renderList([]);

      expect($("tbody.govuk-table__body")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });

    it("should render empty cells for hearings with empty fields", () => {
      const { $ } = renderList([
        buildHearing({
          venue: "Court 1",
          judge: "",
          time: "10:00am",
          caseNumber: "T123456",
          caseDetails: "R v Test",
          hearingType: "",
          additionalInformation: ""
        })
      ]);

      const cells = rowCells($);
      expect(cells[COLUMN.venue]).toBe("Court 1");
      expect(cells[COLUMN.judge]).toBe("");
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.caseNumber]).toBe("T123456");
      expect(cells[COLUMN.caseDetails]).toBe("R v Test");
      expect(cells[COLUMN.hearingType]).toBe("");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });

    it("should render special characters in case details without corrupting the column", () => {
      const { $ } = renderList([buildHearing({ caseDetails: "R v O'Brien & Others" })]);

      expect(rowCells($)[COLUMN.caseDetails]).toBe("R v O'Brien & Others");
    });

    it("should render long case details in the case details column", () => {
      const longCaseDetails = "R v A Very Long Case Name With Multiple Defendants Including Smith, Jones, Williams, and Others";
      const { $ } = renderList([buildHearing({ caseDetails: longCaseDetails })]);

      expect(rowCells($)[COLUMN.caseDetails]).toBe(longCaseDetails);
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Test Source" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.common.dataSource);
      expect(footer.text()).toContain("Test Source");
    });

    it("should render a back-to-top link", () => {
      const { $ } = renderList([]);

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(en.common.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh heading, location, sections and table headers", () => {
      const { $ } = renderList([], {}, cy);

      expect($("h1#top").text()).toContain(listCy.pageTitle);
      expect($(".govuk-body").text()).toContain(listCy.locationLine1);
      expect($("details.govuk-details").text()).toContain(cy.common.importantInfoTitle);
      expect($("h2").filter((_, el) => $(el).text().trim() === cy.common.searchCasesTitle)).toHaveLength(1);

      const headers = headerTexts($);
      expect(headers).toEqual([
        cy.common.tableHeaders.venue,
        cy.common.tableHeaders.judge,
        cy.common.tableHeaders.time,
        cy.common.tableHeaders.caseNumber,
        cy.common.tableHeaders.caseDetails,
        cy.common.tableHeaders.hearingType,
        cy.common.tableHeaders.additionalInformation
      ]);
      expect($(".back-to-top a").text()).toContain(cy.common.backToTop);
    });
  });
});
