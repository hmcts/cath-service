import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import { wpafccWeeklyHearingListCy as cy, wpafccWeeklyHearingListEn as en } from "@hmcts/wpafcc-weekly-hearing-list";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "wpafcc-weekly-hearing-list.njk";

interface HearingOverrides {
  date?: string;
  hearingTime?: string;
  caseReferenceNumber?: string;
  caseName?: string;
  panel?: string;
  modeOfHearing?: string;
  venue?: string;
  additionalInformation?: string;
}

// Fixture builders — each test passes only the varied leaf fields; the flat
// hearing row and the surrounding header/data-source view model are defaulted
// here so individual tests stay focused on the behaviour under test.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    date: "Monday 14 July 2026",
    hearingTime: "10:00am",
    caseReferenceNumber: "WP/2026/0001",
    caseName: "Mr John Smith",
    panel: "Judge A Smith",
    modeOfHearing: "Video",
    venue: "First-tier Tribunal Centre",
    additionalInformation: "",
    ...overrides
  };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    header: {
      listTitle: "Test Tribunal Weekly Hearing List",
      weekCommencingDate: "14 July 2026",
      lastUpdatedDate: "13 July 2026",
      lastUpdatedTime: "10:00am"
    },
    dataSource: "Test Data Source"
  };
}

function renderList(hearings: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, hearings });
}

// The rendered hearings table columns, in template order.
const COLUMN = {
  date: 0,
  hearingTime: 1,
  caseReferenceNumber: 2,
  caseName: 3,
  panel: 4,
  modeOfHearing: 5,
  venue: 6,
  additionalInformation: 7
} as const;

function rowCells($: CheerioAPI, rowIndex = 0) {
  return $("tbody.govuk-table__body tr")
    .eq(rowIndex)
    .find("td")
    .map((_, el) => $(el).text().trim())
    .get();
}

function columnValues($: CheerioAPI, column: number) {
  return $("tbody.govuk-table__body tr")
    .map((_, row) => $(row).find("td").eq(column).text().trim())
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("wpafcc-weekly-hearing-list template", () => {
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

    it("should use https FACT and guidance link URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.importantInformationLinkUrl).toMatch(/^https:\/\//);
      expect(cy.importantInformationLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the list title as the top-anchored heading", () => {
      const { $ } = renderList([]);

      const heading = $("h1#top");
      expect(heading).toHaveLength(1);
      expect(heading.hasClass("govuk-heading-l")).toBe(true);
      expect(heading.text().trim()).toBe("Test Tribunal Weekly Hearing List");
    });

    it("should render the FACT link with the configured text, URL and trailing text", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text().trim()).toBe(en.factLinkText);
      expect(factLink.parent().text()).toContain(en.factAdditionalText);
    });

    it("should render the week commencing line with its date", () => {
      const { $ } = renderList([], { header: { ...baseData().header, weekCommencingDate: "21 July 2026" } });

      const line = $(".govuk-body").filter((_, el) => $(el).text().includes(en.listForWeekCommencing));
      expect(line.text()).toContain("21 July 2026");
    });

    it("should render the last updated line with date and time", () => {
      const { $ } = renderList([], { header: { ...baseData().header, lastUpdatedDate: "13 July 2026", lastUpdatedTime: "9:30am" } });

      const line = $(".govuk-body").filter((_, el) => $(el).text().trim().startsWith(en.lastUpdated));
      expect(line.text()).toContain("13 July 2026");
      expect(line.text()).toContain(en.at);
      expect(line.text()).toContain("9:30am");
    });
  });

  describe("Important information", () => {
    it("should render an open details component with the guidance text", () => {
      const { $ } = renderList([]);

      const details = $("details.govuk-details");
      expect(details).toHaveLength(1);
      expect(details.attr("open")).toBeDefined();
      expect(details.attr("data-module")).toBe("govuk-details");
      expect(details.find(".govuk-details__summary-text").text()).toContain(en.importantInformationTitle);
      expect(details.find(".govuk-details__text").text()).toContain(en.importantInformationText);
    });

    it("should render the guidance link opening in a new tab", () => {
      const { $ } = renderList([]);

      const link = $(`a[href="${en.importantInformationLinkUrl}"]`);
      expect(link).toHaveLength(1);
      expect(link.text().trim()).toBe(en.importantInformationLinkText);
      expect(link.attr("target")).toBe("_blank");
      expect(link.attr("rel")).toBe("noopener noreferrer");
    });
  });

  describe("Case search", () => {
    it("should render the search heading, hidden label and input", () => {
      const { $ } = renderList([]);

      expect($("h2.govuk-heading-s").text()).toContain(en.searchCasesTitle);

      const label = $("label.govuk-label.govuk-visually-hidden[for='case-search-input']");
      expect(label).toHaveLength(1);
      expect(label.text().trim()).toBe(en.searchCasesLabel);

      const input = $("input#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("name")).toBe("search");
      expect(input.attr("type")).toBe("text");
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);
      expect(input.hasClass("govuk-input")).toBe(true);
      expect(input.hasClass("govuk-!-width-one-half")).toBe(true);
    });
  });

  describe("Hearings table", () => {
    it("should render all column headers in order and expose an accessible table", () => {
      const { $ } = renderList([]);

      const table = $("table#hearings-table");
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe(en.pageTitle);

      const headers = $("thead th[scope='col']")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        en.tableHeaders.date,
        en.tableHeaders.hearingTime,
        en.tableHeaders.caseReferenceNumber,
        en.tableHeaders.caseName,
        en.tableHeaders.panel,
        en.tableHeaders.modeOfHearing,
        en.tableHeaders.venue,
        en.tableHeaders.additionalInformation
      ]);
    });

    it("should render no data rows when there are no hearings", () => {
      const { $ } = renderList([]);

      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
      expect($("tbody.govuk-table__body td")).toHaveLength(0);
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          date: "Monday 14 July 2026",
          hearingTime: "10:00am",
          caseReferenceNumber: "WP/2026/0001",
          caseName: "Mr John Smith",
          panel: "Judge A Smith, Panel Member B Jones",
          modeOfHearing: "Video",
          venue: "First-tier Tribunal Centre",
          additionalInformation: "Interpreter required - Welsh"
        })
      ]);

      const cells = rowCells($);
      expect(cells[COLUMN.date]).toBe("Monday 14 July 2026");
      expect(cells[COLUMN.hearingTime]).toBe("10:00am");
      expect(cells[COLUMN.caseReferenceNumber]).toBe("WP/2026/0001");
      expect(cells[COLUMN.caseName]).toBe("Mr John Smith");
      expect(cells[COLUMN.panel]).toBe("Judge A Smith, Panel Member B Jones");
      expect(cells[COLUMN.modeOfHearing]).toBe("Video");
      expect(cells[COLUMN.venue]).toBe("First-tier Tribunal Centre");
      expect(cells[COLUMN.additionalInformation]).toBe("Interpreter required - Welsh");
    });

    it("should render a row per hearing preserving order", () => {
      const { $ } = renderList([
        buildHearing({ caseReferenceNumber: "WP/2026/0001", caseName: "Mr John Smith", modeOfHearing: "Video" }),
        buildHearing({ caseReferenceNumber: "WP/2026/0002", caseName: "Ms Jane Doe", modeOfHearing: "Telephone" }),
        buildHearing({ caseReferenceNumber: "WP/2026/0003", caseName: "Mr Bob Wilson", modeOfHearing: "In person" })
      ]);

      expect($("tbody.govuk-table__body tr")).toHaveLength(3);
      expect(columnValues($, COLUMN.caseReferenceNumber)).toEqual(["WP/2026/0001", "WP/2026/0002", "WP/2026/0003"]);
      expect(columnValues($, COLUMN.caseName)).toEqual(["Mr John Smith", "Ms Jane Doe", "Mr Bob Wilson"]);
      expect(columnValues($, COLUMN.modeOfHearing)).toEqual(["Video", "Telephone", "In person"]);
    });

    it("should render an empty additional information cell when the value is blank", () => {
      const { $ } = renderList([buildHearing({ caseName: "Test Case", additionalInformation: "" })]);

      const cells = rowCells($);
      expect(cells[COLUMN.caseName]).toBe("Test Case");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });

    it("should render a panel with multiple members in the panel column", () => {
      const { $ } = renderList([buildHearing({ panel: "Judge A Smith, Panel Member B Jones, Panel Member C Brown" })]);

      expect(rowCells($)[COLUMN.panel]).toBe("Judge A Smith, Panel Member B Jones, Panel Member C Brown");
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Manual Upload" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("Manual Upload");
    });

    it("should render a back-to-top link targeting the page anchor", () => {
      const { $ } = renderList([]);

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text().trim()).toBe(en.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, labels and table headers", () => {
      const { $ } = renderList([buildHearing()], {}, cy);

      const weekLine = $(".govuk-body").filter((_, el) => $(el).text().includes(cy.listForWeekCommencing));
      expect(weekLine).toHaveLength(1);
      expect($(".govuk-body").filter((_, el) => $(el).text().trim().startsWith(cy.lastUpdated))).toHaveLength(1);
      expect($(".govuk-details__summary-text").text()).toContain(cy.importantInformationTitle);
      expect($("h2.govuk-heading-s").text()).toContain(cy.searchCasesTitle);

      const headers = $("thead th[scope='col']")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(cy.tableHeaders.additionalInformation);

      expect($("p.govuk-body-s").text()).toContain(cy.dataSource);
      expect($(".back-to-top a").text().trim()).toBe(cy.backToTop);
    });
  });

  describe("Layout", () => {
    it("should render the full-width grid layout", () => {
      const { $ } = renderList([]);

      expect($(".govuk-grid-row .govuk-grid-column-full")).toHaveLength(1);
    });
  });
});
