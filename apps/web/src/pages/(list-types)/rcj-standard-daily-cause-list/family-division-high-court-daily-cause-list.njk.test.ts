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

const TEMPLATE = "family-division-high-court-daily-cause-list.njk";

interface HearingOverrides {
  venue?: string;
  judge?: string;
  time?: string;
  caseNumber?: string;
  caseDetails?: string;
  hearingType?: string;
  additionalInformation?: string;
}

// Fixture builders — each test passes only the varied leaf fields; the flat
// hearing shape and the header/listContent/common wrapper default to a realistic
// minimal shape so scenarios stay focused on the branch under test.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    venue: "Court 1",
    judge: "Mr Justice Smith",
    time: "10:00am",
    caseNumber: "FD/123/2026",
    caseDetails: "Re: A (A Child)",
    hearingType: "Final Hearing",
    additionalInformation: "Remote hearing",
    ...overrides
  };
}

function baseData(locale: typeof en | typeof cy = en) {
  const listContent = locale.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST;
  const isWelsh = locale === cy;
  return {
    header: {
      listTitle: listContent.pageTitle,
      listDate: isWelsh ? "15 Ionawr 2026" : "15 January 2026",
      lastUpdatedDate: isWelsh ? "14 Ionawr 2026" : "14 January 2026",
      lastUpdatedTime: "12:00pm"
    },
    listContent,
    common: locale.common,
    dataSource: isWelsh ? "Lanlwytho â Llaw" : "Manual Upload"
  };
}

function renderList(hearings: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, hearings });
}

// The rendered hearings table columns, in order.
const COLUMN = { venue: 0, judge: 1, time: 2, caseNumber: 3, caseDetails: 4, hearingType: 5, additionalInformation: 6 } as const;

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

describe("family-division-high-court-daily-cause-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same top-level keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have the same Family Division keys in English and Welsh", () => {
      expect(Object.keys(en.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST).sort()).toEqual(Object.keys(cy.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST).sort());
    });

    it("should have the same common keys in English and Welsh", () => {
      expect(Object.keys(en.common).sort()).toEqual(Object.keys(cy.common).sort());
    });

    it("should have the same table header keys in English and Welsh", () => {
      expect(Object.keys(en.common.tableHeaders).sort()).toEqual(Object.keys(cy.common.tableHeaders).sort());
    });

    it("should use https FACT link URLs", () => {
      expect(en.common.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.common.factLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Header", () => {
    it("should render the list title as the h1 anchor target", () => {
      const { $ } = renderList([]);

      const heading = $("h1#top");
      expect(heading).toHaveLength(1);
      expect(heading.text()).toContain(en.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST.pageTitle);
    });

    it("should render the FACT link with the configured text, url and trailing text", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.common.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.common.factLinkText);
      expect($(".govuk-grid-column-full").text()).toContain(en.common.factAdditionalText);
    });

    it("should render each venue location line", () => {
      const { $ } = renderList([]);

      const content = $(".govuk-grid-column-full").text();
      const listContent = en.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST;
      expect(content).toContain(listContent.locationLine1);
      expect(content).toContain(listContent.locationLine2);
      expect(content).toContain(listContent.locationLine3);
    });

    it("should render the list date line", () => {
      const { $ } = renderList([]);

      const listForLine = $("p.govuk-body").filter((_, el) => $(el).text().includes(en.common.listFor));
      expect(listForLine.text()).toContain("15 January 2026");
    });

    it("should render the last updated line with date, separator and time", () => {
      const { $ } = renderList([]);

      const lastUpdatedLine = $("p.govuk-body").filter((_, el) => $(el).text().includes(en.common.lastUpdated));
      const text = lastUpdatedLine.text();
      expect(text).toContain("14 January 2026");
      expect(text).toContain(en.common.at);
      expect(text).toContain("12:00pm");
    });
  });

  describe("Important information", () => {
    it("should render the details component open by default with the configured summary", () => {
      const { $ } = renderList([]);

      const details = $("details.govuk-details");
      expect(details).toHaveLength(1);
      expect(details.is("[open]")).toBe(true);
      expect(details.find(".govuk-details__summary-text").text()).toContain(en.common.importantInfoTitle);
    });

    it("should render the guidance sections with their headings and body text", () => {
      const { $ } = renderList([]);

      const details = $(".govuk-details__text");
      const listContent = en.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST;

      const sectionHeadings = details
        .find("h3.govuk-heading-s")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(sectionHeadings).toEqual([listContent.courtOfProtectionTitle, listContent.tipstaffTitle, listContent.judgmentsTitle]);

      const detailsText = details.text();
      expect(detailsText).toContain("Any application made after 1 March 2022");
      expect(detailsText).toContain("Unlisted applications may only be made");
      expect(detailsText).toContain("020 7947 6200");
      expect(detailsText).toContain("Judgments will be handed down remotely");
      expect(detailsText).toContain("National Archives");
      expect(details.find("p.govuk-body").length).toBeGreaterThan(1);
    });
  });

  describe("Search box", () => {
    it("should render the search title, input and accessible label", () => {
      const { $ } = renderList([]);

      expect($("h2.govuk-heading-s").text()).toContain(en.common.searchCasesTitle);

      const input = $("input#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("name")).toBe("search");
      expect(input.attr("type")).toBe("text");
      expect(input.attr("aria-label")).toBe(en.common.searchCasesLabel);

      const label = $("label.govuk-label.govuk-visually-hidden[for='case-search-input']");
      expect(label).toHaveLength(1);
      expect(label.text().trim()).toBe(en.common.searchCasesLabel);
    });
  });

  describe("Hearings table", () => {
    it("should render the table with the correct role and aria-label", () => {
      const { $ } = renderList([]);

      const table = $("table#hearings-table");
      expect(table).toHaveLength(1);
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe(en.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST.pageTitle);
    });

    it("should render all column headers in order with scope=col", () => {
      const { $ } = renderList([]);

      const headerCells = $("thead th[scope='col']");
      const headers = headerCells.map((_, el) => $(el).text().trim()).get();
      const { tableHeaders } = en.common;
      expect(headers).toEqual([
        tableHeaders.venue,
        tableHeaders.judge,
        tableHeaders.time,
        tableHeaders.caseNumber,
        tableHeaders.caseDetails,
        tableHeaders.hearingType,
        tableHeaders.additionalInformation
      ]);
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          venue: "Court 1",
          judge: "Mr Justice Smith",
          time: "10:00am",
          caseNumber: "FD/123/2026",
          caseDetails: "Re: A (A Child)",
          hearingType: "Final Hearing",
          additionalInformation: "Remote hearing"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.venue]).toBe("Court 1");
      expect(cells[COLUMN.judge]).toBe("Mr Justice Smith");
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.caseNumber]).toBe("FD/123/2026");
      expect(cells[COLUMN.caseDetails]).toBe("Re: A (A Child)");
      expect(cells[COLUMN.hearingType]).toBe("Final Hearing");
      expect(cells[COLUMN.additionalInformation]).toBe("Remote hearing");
    });

    it("should render a row per hearing", () => {
      const { $ } = renderList([
        buildHearing({ caseNumber: "FD/123/2026", caseDetails: "Re: A (A Child)" }),
        buildHearing({ caseNumber: "FD/456/2026", caseDetails: "Re: B (Children)", hearingType: "Case Management" })
      ]);

      const rows = $("tbody.govuk-table__body tr");
      expect(rows).toHaveLength(2);
      const caseNumbers = rows.map((_, row) => $(row).find("td").eq(COLUMN.caseNumber).text().trim()).get();
      expect(caseNumbers).toEqual(["FD/123/2026", "FD/456/2026"]);
      const caseDetails = rows.map((_, row) => $(row).find("td").eq(COLUMN.caseDetails).text().trim()).get();
      expect(caseDetails).toEqual(["Re: A (A Child)", "Re: B (Children)"]);
    });

    it("should render an empty additional information cell without dropping the row", () => {
      const { $ } = renderList([buildHearing({ caseNumber: "FD/456/2026", additionalInformation: "" })]);

      const cells = firstDataRowCells($);
      expect($("tbody.govuk-table__body tr")).toHaveLength(1);
      expect(cells[COLUMN.caseNumber]).toBe("FD/456/2026");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });

    it("should render the table with no rows when there are no hearings", () => {
      const { $ } = renderList([]);

      expect($("table#hearings-table")).toHaveLength(1);
      expect($("tbody.govuk-table__body")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });

    it("should escape special characters in hearing data", () => {
      const { $ } = renderList([buildHearing({ judge: "Judge O'Brien", caseDetails: "Smith & Co v Jones" })]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.judge]).toBe("Judge O'Brien");
      expect(cells[COLUMN.caseDetails]).toBe("Smith & Co v Jones");
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Publications" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.common.dataSource);
      expect(footer.text()).toContain("Publications");
    });

    it("should render each data source value passed in", () => {
      for (const source of ["Manual Upload", "Publications", "Automated Import"]) {
        const { $ } = renderList([], { dataSource: source });
        expect($("p.govuk-body-s").text()).toContain(source);
      }
    });

    it("should render a back-to-top link to the page anchor", () => {
      const { $ } = renderList([]);

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(en.common.backToTop);
    });
  });

  describe("Accessibility structure", () => {
    it("should render a logical heading hierarchy", () => {
      const { $ } = renderList([buildHearing()]);

      expect($("h1")).toHaveLength(1);
      expect($("h2").length).toBeGreaterThanOrEqual(1);
      expect($("h3").length).toBeGreaterThanOrEqual(1);
    });

    it("should use the GOV.UK grid and semantic form and table elements", () => {
      const { $ } = renderList([buildHearing()]);

      expect($(".govuk-grid-row .govuk-grid-column-full")).toHaveLength(1);
      expect($("label")).toHaveLength(1);
      expect($("input")).toHaveLength(1);
      expect($("details")).toHaveLength(1);
      expect($("thead")).toHaveLength(1);
      expect($("tbody")).toHaveLength(1);
      expect($("tbody.govuk-table__body td").length).toBeGreaterThan(0);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, section titles, table headers and footer labels", () => {
      const { $ } = renderList([buildHearing({ venue: "Llys 1", judge: "Mr Ustus Smith" })], {}, cy);

      const listContent = cy.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST;
      expect($("h1#top").text()).toContain(listContent.pageTitle);
      expect($(".govuk-grid-column-full").text()).toContain(listContent.locationLine1);

      const sectionHeadings = $(".govuk-details__text h3.govuk-heading-s")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(sectionHeadings).toEqual([listContent.courtOfProtectionTitle, listContent.tipstaffTitle, listContent.judgmentsTitle]);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(cy.common.tableHeaders.venue);
      expect(headers).toContain(cy.common.tableHeaders.judge);
      expect(headers).toContain(cy.common.tableHeaders.additionalInformation);

      const listForLine = $("p.govuk-body").filter((_, el) => $(el).text().includes(cy.common.listFor));
      expect(listForLine.text()).toContain("15 Ionawr 2026");

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(cy.common.dataSource);
      expect(footer.text()).toContain("Lanlwytho â Llaw");
      expect($(".back-to-top a").text()).toContain(cy.common.backToTop);
    });
  });
});
