import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sscsDailyHearingListCy as cy, sscsDailyHearingListEn as en } from "@hmcts/sscs-daily-hearing-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "sscs-daily-hearing-list.njk";

interface HearingOverrides {
  venue?: string;
  appealReferenceNumber?: string;
  hearingType?: string;
  appellant?: string;
  courtroom?: string;
  hearingTime?: string;
  tribunal?: string;
  respondent?: string;
  additionalInformation?: string;
}

// Fixture builders — each hearing defaults to a realistic full row and only the
// varied leaf fields are passed per test, keeping the flat table row shape out
// of individual tests.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    venue: "Birmingham",
    appealReferenceNumber: "SC123/45/67890",
    hearingType: "Final Hearing",
    appellant: "John Smith",
    courtroom: "Court 1",
    hearingTime: "10:00am",
    tribunal: "Judge A Smith",
    respondent: "HMRC",
    additionalInformation: "Video hearing",
    ...overrides
  };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    header: {
      listTitle: "Upper Tribunal (Immigration and Asylum) Chamber Hearing List",
      listDate: "15 January 2026",
      lastUpdatedDate: "14 January 2026",
      lastUpdatedTime: "12:00pm"
    },
    importantInformationText:
      "Open justice is a fundamental principle of our justice system.\nFor more information, please visit https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing",
    dataSource: "Manual Upload",
    hearings: [] as unknown[]
  };
}

function renderList(hearings: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, hearings });
}

// The rendered hearings table columns, in order.
const COLUMN = {
  venue: 0,
  appealRef: 1,
  hearingType: 2,
  appellant: 3,
  courtroom: 4,
  hearingTime: 5,
  tribunal: 6,
  respondent: 7,
  additionalInformation: 8
} as const;

function rowCells($: CheerioAPI, rowIndex = 0) {
  return $("tbody.govuk-table__body tr")
    .eq(rowIndex)
    .find("td")
    .map((_, el) => $(el).text().trim())
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("sscs-daily-hearing-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have the same tableHeaders keys in English and Welsh", () => {
      expect(Object.keys(en.tableHeaders).sort()).toEqual(Object.keys(cy.tableHeaders).sort());
    });

    it("should use https FACT and important-information link URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.importantInformationLinkUrl).toMatch(/^https:\/\//);
      expect(cy.importantInformationLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the list title as the top heading", () => {
      const { $ } = renderList([]);

      const heading = $("h1.govuk-heading-l#top");
      expect(heading).toHaveLength(1);
      expect(heading.text().trim()).toBe("Upper Tribunal (Immigration and Asylum) Chamber Hearing List");
    });

    it("should render the FACT link with the configured text, URL and additional text", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
      expect(factLink.parent().text()).toContain(en.factAdditionalText);
    });

    it("should render the list date line", () => {
      const { $ } = renderList([]);

      const dateLine = $("p.govuk-\\!-font-weight-bold");
      expect(dateLine.text()).toContain(en.listForDate);
      expect(dateLine.text()).toContain("15 January 2026");
    });

    it("should render the last-updated date and time", () => {
      const { $ } = renderList([]);

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(en.lastUpdated);
      expect(bodyText).toContain("14 January 2026");
      expect(bodyText).toContain(en.at);
      expect(bodyText).toContain("12:00pm");
    });
  });

  describe("Important information section", () => {
    it("should render an open details element with the section title", () => {
      const { $ } = renderList([]);

      const details = $("details.govuk-details");
      expect(details).toHaveLength(1);
      expect(details.attr("open")).toBeDefined();
      expect(details.find(".govuk-details__summary-text").text()).toContain(en.importantInformationTitle);
    });

    it("should render one paragraph per non-empty line and skip empty lines", () => {
      const { $ } = renderList([], { importantInformationText: "First line\n\nThird line" });

      const paragraphs = $("details.govuk-details .govuk-details__text p")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(paragraphs).toEqual(["First line", "Third line"]);
    });

    it("should render the observe link as a new-tab anchor", () => {
      const { $ } = renderList([]);

      const link = $(`details.govuk-details a[href="${en.importantInformationLinkUrl}"]`);
      expect(link).toHaveLength(1);
      expect(link.attr("target")).toBe("_blank");
      expect(link.attr("rel")).toBe("noopener noreferrer");
    });
  });

  describe("Search section", () => {
    it("should render a labelled text search input", () => {
      const { $ } = renderList([]);

      expect($("h2.govuk-heading-s").text()).toContain(en.searchCasesTitle);
      const input = $("input#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("type")).toBe("text");
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);
      expect(input.attr("class") ?? "").toContain("govuk-!-width-one-half");
      const label = $('label[for="case-search-input"]');
      expect(label.hasClass("govuk-visually-hidden")).toBe(true);
    });
  });

  describe("Hearings table", () => {
    it("should render the table headers in order sourced from the locale", () => {
      const { $ } = renderList([]);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        en.tableHeaders.venue,
        en.tableHeaders.appealReferenceNumber,
        en.tableHeaders.hearingType,
        en.tableHeaders.appellant,
        en.tableHeaders.courtroom,
        en.tableHeaders.hearingTime,
        en.tableHeaders.tribunal,
        en.tableHeaders.respondent,
        en.tableHeaders.additionalInformation
      ]);
    });

    it("should render an accessible table with a container", () => {
      const { $ } = renderList([]);

      const table = $("table#hearings-table");
      expect(table).toHaveLength(1);
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe("Upper Tribunal (Immigration and Asylum) Chamber Hearing List");
      expect($("#hearings-table-container")).toHaveLength(1);
    });

    it("should render an empty table body when there are no hearings", () => {
      const { $ } = renderList([]);

      expect($("tbody.govuk-table__body")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          venue: "Birmingham",
          appealReferenceNumber: "SC123/45/67890",
          hearingType: "Final Hearing",
          appellant: "John Smith",
          courtroom: "Court 1",
          hearingTime: "10:00am",
          tribunal: "Judge A Smith",
          respondent: "HMRC",
          additionalInformation: "Video hearing"
        })
      ]);

      const cells = rowCells($);
      expect(cells[COLUMN.venue]).toBe("Birmingham");
      expect(cells[COLUMN.appealRef]).toBe("SC123/45/67890");
      expect(cells[COLUMN.hearingType]).toBe("Final Hearing");
      expect(cells[COLUMN.appellant]).toBe("John Smith");
      expect(cells[COLUMN.courtroom]).toBe("Court 1");
      expect(cells[COLUMN.hearingTime]).toBe("10:00am");
      expect(cells[COLUMN.tribunal]).toBe("Judge A Smith");
      expect(cells[COLUMN.respondent]).toBe("HMRC");
      expect(cells[COLUMN.additionalInformation]).toBe("Video hearing");
    });

    it("should render a row per hearing", () => {
      const { $ } = renderList([
        buildHearing({ appealReferenceNumber: "SC123/45/67890", appellant: "John Smith" }),
        buildHearing({ venue: "London", appealReferenceNumber: "SC987/65/43210", appellant: "Jane Doe" })
      ]);

      expect($("tbody.govuk-table__body tr")).toHaveLength(2);
      const appealRefs = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.appealRef).text().trim())
        .get();
      expect(appealRefs).toEqual(["SC123/45/67890", "SC987/65/43210"]);
      const appellants = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.appellant).text().trim())
        .get();
      expect(appellants).toEqual(["John Smith", "Jane Doe"]);
    });

    it("should render empty cells for empty optional fields", () => {
      const { $ } = renderList([
        buildHearing({
          venue: "Birmingham",
          appealReferenceNumber: "SC123/45/67890",
          hearingType: "",
          appellant: "John Smith",
          courtroom: "",
          hearingTime: "10:00am",
          tribunal: "",
          respondent: "",
          additionalInformation: ""
        })
      ]);

      const cells = rowCells($);
      expect(cells[COLUMN.venue]).toBe("Birmingham");
      expect(cells[COLUMN.appealRef]).toBe("SC123/45/67890");
      expect(cells[COLUMN.appellant]).toBe("John Smith");
      expect(cells[COLUMN.hearingTime]).toBe("10:00am");
      expect(cells[COLUMN.hearingType]).toBe("");
      expect(cells[COLUMN.courtroom]).toBe("");
      expect(cells[COLUMN.tribunal]).toBe("");
      expect(cells[COLUMN.respondent]).toBe("");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });

    it("should render multi-line tribunal text in a pre-wrapped cell", () => {
      const { $ } = renderList([buildHearing({ tribunal: "Judge A Smith\nJudge B Jones" })]);

      const tribunalCell = $("tbody.govuk-table__body tr").first().find("td").eq(COLUMN.tribunal);
      expect(tribunalCell.hasClass("new-line-wrap")).toBe(true);
      expect(tribunalCell.text()).toBe("Judge A Smith\nJudge B Jones");
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Manual Upload" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("Manual Upload");
    });

    it("should render a back-to-top link", () => {
      const { $ } = renderList([]);

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(en.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, table headers, FACT link and footer", () => {
      const { $ } = renderList([buildHearing()], {}, cy);

      expect($("details.govuk-details .govuk-details__summary-text").text()).toContain(cy.importantInformationTitle);
      expect($("h2.govuk-heading-s").text()).toContain(cy.searchCasesTitle);
      expect($(".govuk-body").text()).toContain(cy.listForDate);
      expect($(".govuk-body").text()).toContain(cy.lastUpdated);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        cy.tableHeaders.venue,
        cy.tableHeaders.appealReferenceNumber,
        cy.tableHeaders.hearingType,
        cy.tableHeaders.appellant,
        cy.tableHeaders.courtroom,
        cy.tableHeaders.hearingTime,
        cy.tableHeaders.tribunal,
        cy.tableHeaders.respondent,
        cy.tableHeaders.additionalInformation
      ]);

      expect($(`a[href="${cy.factLinkUrl}"]`).text()).toContain(cy.factLinkText);
      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(cy.dataSource);
      expect($(".back-to-top a").text()).toContain(cy.backToTop);
    });
  });
});
