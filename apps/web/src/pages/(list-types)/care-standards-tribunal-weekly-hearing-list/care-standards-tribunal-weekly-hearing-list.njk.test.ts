import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  careStandardsTribunalWeeklyHearingListCy as cy,
  careStandardsTribunalWeeklyHearingListEn as en
} from "@hmcts/care-standards-tribunal-weekly-hearing-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "care-standards-tribunal-weekly-hearing-list.njk";

interface HearingOverrides {
  date?: string;
  caseName?: string;
  hearingLength?: string;
  hearingType?: string;
  venue?: string;
  additionalInformation?: string;
}

// Fixture builders — each test passes only the varied leaf fields; the header
// and hearing shapes default to a realistic minimal form.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    date: "Monday 6 January 2026",
    caseName: "Smith v Care Quality Commission",
    hearingLength: "2 hours",
    hearingType: "Final Hearing",
    venue: "Remote - Video",
    additionalInformation: "Interpreter required: Spanish",
    ...overrides
  };
}

function buildHeader(overrides: Record<string, string> = {}) {
  return {
    listTitle: "Care Standards Tribunal Weekly Hearing List",
    weekCommencingDate: "Monday 6 January 2026",
    lastUpdatedDate: "14 January 2026",
    lastUpdatedTime: "12:00pm",
    ...overrides
  };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    en,
    cy,
    t: locale,
    header: buildHeader(),
    dataSource: "Manual Upload"
  };
}

function renderList(hearings: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, hearings });
}

// The rendered hearings table columns, in order.
const COLUMN = { date: 0, caseName: 1, hearingLength: 2, hearingType: 3, venue: 4, additionalInformation: 5 } as const;

function firstDataRowCells($: CheerioAPI) {
  return $("tbody.govuk-table__body tr")
    .first()
    .find("td")
    .map((_, el) => $(el).text().trim())
    .get();
}

function headerCells($: CheerioAPI) {
  return $("thead th")
    .map((_, el) => $(el).text().trim())
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("Care Standards Tribunal Weekly Hearing List template", () => {
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

  describe("Header section", () => {
    it("should render the list title as the h1 anchor target", () => {
      const { $ } = renderList([], { header: buildHeader({ listTitle: "My Care Standards List" }) });

      const heading = $("h1#top");
      expect(heading).toHaveLength(1);
      expect(heading.text().trim()).toBe("My Care Standards List");
    });

    it("should render the FACT link with the configured URL and text", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text().trim()).toBe(en.factLinkText);
      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(en.factAdditionalText);
    });

    it("should render the week commencing date", () => {
      const { $ } = renderList([], { header: buildHeader({ weekCommencingDate: "Monday 6 January 2026" }) });

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(en.listForWeekCommencing);
      expect(bodyText).toContain("Monday 6 January 2026");
    });

    it("should render the last updated date and time", () => {
      const { $ } = renderList([], { header: buildHeader({ lastUpdatedDate: "14 January 2026", lastUpdatedTime: "12:00pm" }) });

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(en.lastUpdated);
      expect(bodyText).toContain("14 January 2026");
      expect(bodyText).toContain(en.at);
      expect(bodyText).toContain("12:00pm");
    });
  });

  describe("Important information section", () => {
    it("should render an open details component with the title and contact text", () => {
      const { $ } = renderList([]);

      const details = $("details.govuk-details[data-module='govuk-details']");
      expect(details).toHaveLength(1);
      expect(details.attr("open")).toBeDefined();
      expect(details.find(".govuk-details__summary-text").text().trim()).toBe(en.importantInformationTitle);
      const detailsText = details.find(".govuk-details__text").text();
      expect(detailsText).toContain(en.importantInformationText);
      expect(detailsText).toContain("cst@justice.gov.uk");
    });

    it("should render the guidance link with external link security attributes", () => {
      const { $ } = renderList([]);

      const guidanceLink = $(`a[href="${en.importantInformationLinkUrl}"]`);
      expect(guidanceLink).toHaveLength(1);
      expect(guidanceLink.text().trim()).toBe(en.importantInformationLinkText);
      expect(guidanceLink.attr("target")).toBe("_blank");
      expect(guidanceLink.attr("rel")).toBe("noopener noreferrer");
    });
  });

  describe("Search section", () => {
    it("should render the search title and a labelled search input", () => {
      const { $ } = renderList([]);

      expect($("h2").filter((_, el) => $(el).text().trim() === en.searchCasesTitle)).toHaveLength(1);

      const input = $("input#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("name")).toBe("search");
      expect(input.attr("type")).toBe("text");
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);
    });

    it("should associate a visually hidden label with the search input", () => {
      const { $ } = renderList([]);

      const label = $("label.govuk-label.govuk-visually-hidden[for='case-search-input']");
      expect(label).toHaveLength(1);
      expect(label.text().trim()).toBe(en.searchCasesLabel);
    });
  });

  describe("Table structure", () => {
    it("should render the table with the correct role and aria-label", () => {
      const { $ } = renderList([]);

      const table = $("table#hearings-table");
      expect(table).toHaveLength(1);
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe(en.pageTitle);
    });

    it("should render all six column headers with scope=col in order", () => {
      const { $ } = renderList([]);

      const scopedHeaders = $("thead th[scope='col']");
      expect(scopedHeaders).toHaveLength(6);
      expect(headerCells($)).toEqual([
        en.tableHeaders.date,
        en.tableHeaders.caseName,
        en.tableHeaders.hearingLength,
        en.tableHeaders.hearingType,
        en.tableHeaders.venue,
        en.tableHeaders.additionalInformation
      ]);
    });
  });

  describe("Hearings data", () => {
    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          date: "Monday 6 January 2026",
          caseName: "Smith v Care Quality Commission",
          hearingLength: "2 hours",
          hearingType: "Final Hearing",
          venue: "Remote - Video",
          additionalInformation: "Interpreter required: Spanish"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.date]).toBe("Monday 6 January 2026");
      expect(cells[COLUMN.caseName]).toBe("Smith v Care Quality Commission");
      expect(cells[COLUMN.hearingLength]).toBe("2 hours");
      expect(cells[COLUMN.hearingType]).toBe("Final Hearing");
      expect(cells[COLUMN.venue]).toBe("Remote - Video");
      expect(cells[COLUMN.additionalInformation]).toBe("Interpreter required: Spanish");
    });

    it("should render one row per hearing with distinct field values per column", () => {
      const hearings = [
        buildHearing({
          caseName: "Smith v Care Quality Commission",
          hearingLength: "2 hours",
          hearingType: "Final Hearing",
          venue: "Remote - Video",
          additionalInformation: "Interpreter required: Spanish"
        }),
        buildHearing({
          caseName: "Jones v Ofsted",
          hearingLength: "1 hour 30 mins",
          hearingType: "Case Management",
          venue: "Pocock Street, London",
          additionalInformation: ""
        }),
        buildHearing({
          caseName: "Brown v Care Quality Commission",
          hearingLength: "3 hours 15 mins",
          hearingType: "Final Hearing",
          venue: "Remote - Video",
          additionalInformation: "Vulnerable witness"
        })
      ];
      const { $ } = renderList(hearings);

      const rows = $("tbody.govuk-table__body tr");
      expect(rows).toHaveLength(3);

      const columnValues = (column: number) => rows.map((_, row) => $(row).find("td").eq(column).text().trim()).get();

      expect(columnValues(COLUMN.caseName)).toEqual(["Smith v Care Quality Commission", "Jones v Ofsted", "Brown v Care Quality Commission"]);
      expect(columnValues(COLUMN.hearingLength)).toEqual(["2 hours", "1 hour 30 mins", "3 hours 15 mins"]);
      expect(columnValues(COLUMN.hearingType)).toEqual(["Final Hearing", "Case Management", "Final Hearing"]);
      expect(columnValues(COLUMN.venue)).toEqual(["Remote - Video", "Pocock Street, London", "Remote - Video"]);
      expect(columnValues(COLUMN.additionalInformation)).toEqual(["Interpreter required: Spanish", "", "Vulnerable witness"]);
    });

    it("should render an empty additional information cell without dropping the row", () => {
      const { $ } = renderList([buildHearing({ caseName: "Jones v Ofsted", additionalInformation: "" })]);

      const cells = firstDataRowCells($);
      expect($("tbody.govuk-table__body tr")).toHaveLength(1);
      expect(cells[COLUMN.caseName]).toBe("Jones v Ofsted");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });

    it("should render the table with headers but no data rows when there are no hearings", () => {
      const { $ } = renderList([]);

      expect($("table.govuk-table")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
      expect(headerCells($)).toContain(en.tableHeaders.caseName);
    });

    it("should render a data row for each hearing across varying counts", () => {
      for (const count of [0, 1, 5, 10]) {
        const hearings = Array.from({ length: count }, (_, i) => buildHearing({ caseName: `Case ${i + 1}` }));
        const { $ } = renderList(hearings);

        expect($("table.govuk-table")).toHaveLength(1);
        expect($("tbody.govuk-table__body tr")).toHaveLength(count);
      }
    });
  });

  describe("Footer section", () => {
    it("should render the data source, escaping special characters", () => {
      for (const value of ["Manual Upload", "CaTH", "P&I", "UNKNOWN_SOURCE"]) {
        const { $ } = renderList([], { dataSource: value });

        const footer = $("p.govuk-body-s");
        expect(footer.text()).toContain(en.dataSource);
        expect(footer.text()).toContain(value);
      }
    });

    it("should render a back-to-top link to the page top", () => {
      const { $ } = renderList([]);

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text().trim()).toBe(en.backToTop);
    });
  });

  describe("Accessibility", () => {
    it("should use the GOV.UK full-width grid structure", () => {
      const { $ } = renderList([]);

      expect($(".govuk-grid-row .govuk-grid-column-full")).toHaveLength(1);
    });

    it("should have a single h1 followed by section h2 headings", () => {
      const { $ } = renderList([]);

      expect($("h1")).toHaveLength(1);
      expect($("h2").length).toBeGreaterThanOrEqual(1);
    });

    it("should use semantic table markup with a head, body and column headers", () => {
      const { $ } = renderList([buildHearing()]);

      expect($("table.govuk-table thead")).toHaveLength(1);
      expect($("table.govuk-table tbody")).toHaveLength(1);
      expect($("thead th[scope='col']").length).toBeGreaterThan(0);
    });

    it("should render the search control as a labelled input", () => {
      const { $ } = renderList([]);

      expect($("label[for='case-search-input']")).toHaveLength(1);
      expect($("input.govuk-input#case-search-input")).toHaveLength(1);
    });
  });

  describe("Custom styling", () => {
    it("should include the back-to-top styles in the head block", () => {
      const { $ } = renderList([]);

      const styleText = $("style").text();
      expect(styleText).toContain(".back-to-top");
      expect(styleText).toContain("margin-top: 40px");
    });
  });

  describe("Welsh rendering", () => {
    const welshHeader = {
      listTitle: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal",
      weekCommencingDate: "Dydd Llun 6 Ionawr 2026",
      lastUpdatedDate: "14 Ionawr 2026",
      lastUpdatedTime: "12:00pm"
    };

    it("should render Welsh header, search and footer content", () => {
      const { $ } = renderList([], { header: welshHeader, dataSource: "Lanlwytho â Llaw" }, cy);

      expect($("h1#top").text().trim()).toBe(welshHeader.listTitle);
      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(cy.listForWeekCommencing);
      expect(bodyText).toContain(cy.lastUpdated);
      expect(bodyText).toContain(cy.at);
      expect($("h2").filter((_, el) => $(el).text().trim() === cy.searchCasesTitle)).toHaveLength(1);
      const footer = $("p.govuk-body-s").text();
      expect(footer).toContain(cy.dataSource);
      expect($(".back-to-top a").text().trim()).toBe(cy.backToTop);
    });

    it("should render Welsh important information", () => {
      const { $ } = renderList([], { header: welshHeader, dataSource: "Lanlwytho â Llaw" }, cy);

      const details = $("details.govuk-details");
      expect(details.find(".govuk-details__summary-text").text().trim()).toBe(cy.importantInformationTitle);
      expect(details.find(".govuk-details__text").text()).toContain("Swyddfa Safonau Gofal");
    });

    it("should render all Welsh table headers in order", () => {
      const { $ } = renderList([], { header: welshHeader, dataSource: "Lanlwytho â Llaw" }, cy);

      expect(headerCells($)).toEqual([
        cy.tableHeaders.date,
        cy.tableHeaders.caseName,
        cy.tableHeaders.hearingLength,
        cy.tableHeaders.hearingType,
        cy.tableHeaders.venue,
        cy.tableHeaders.additionalInformation
      ]);
    });
  });
});
