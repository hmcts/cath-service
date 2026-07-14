import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { astDailyHearingListCy as cy, astDailyHearingListEn as en } from "@hmcts/ast-daily-hearing-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "ast-daily-hearing-list.njk";

interface HearingOverrides {
  appellant?: string;
  appealReferenceNumber?: string;
  caseType?: string;
  hearingType?: string;
  hearingTime?: string;
  additionalInformation?: string;
}

// Fixture builders — the AST view model is flat (a header object plus a list of
// hearings), so each test only passes the leaf fields it varies.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    appellant: "John Smith",
    appealReferenceNumber: "AST/2026/001",
    caseType: "Section 95",
    hearingType: "Remote - Video",
    hearingTime: "10:00am",
    additionalInformation: "Interpreter required",
    ...overrides
  };
}

function buildHeader(overrides: Record<string, unknown> = {}) {
  return {
    listTitle: "Asylum Support Tribunal Daily Hearing List",
    listForDate: "15 January 2026",
    lastUpdatedDate: "14 January 2026",
    lastUpdatedTime: "12:00pm",
    ...overrides
  };
}

function renderList(hearings: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, {
    en,
    cy,
    t: locale,
    header: buildHeader(),
    dataSource: "Manual Upload",
    ...overrides,
    hearings
  });
}

// The rendered hearings table columns, in order.
const COLUMN = { appellant: 0, appealReference: 1, caseType: 2, hearingType: 3, hearingTime: 4, additionalInformation: 5 } as const;

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

describe("ast-daily-hearing-list template", () => {
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

  describe("Header section", () => {
    it("should render the list title as the top-anchored h1", () => {
      const { $ } = renderList([]);

      const heading = $("h1#top");
      expect(heading).toHaveLength(1);
      expect(heading.text()).toContain("Asylum Support Tribunal Daily Hearing List");
    });

    it("should render the FACT link with the configured text, URL and trailing text", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
      expect($(".govuk-body").text()).toContain(en.factAdditionalText);
    });

    it("should render each venue address line", () => {
      const { $ } = renderList([]);

      const bodyText = $(".govuk-body").text();
      for (const line of en.venueAddressLines) {
        expect(bodyText).toContain(line);
      }
    });

    it("should render the list date with its label", () => {
      const { $ } = renderList([]);

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(en.listForDate);
      expect(bodyText).toContain("15 January 2026");
    });

    it("should render the last-updated line with date and time", () => {
      const { $ } = renderList([]);

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(en.lastUpdated);
      expect(bodyText).toContain("14 January 2026");
      expect(bodyText).toContain(en.at);
      expect(bodyText).toContain("12:00pm");
    });
  });

  describe("Important information section", () => {
    it("should render an open details component with the title", () => {
      const { $ } = renderList([]);

      const details = $("details.govuk-details[data-module='govuk-details']");
      expect(details).toHaveLength(1);
      expect(details.is("[open]")).toBe(true);
      expect(details.find(".govuk-details__summary-text").text()).toContain(en.importantInformationTitle);
    });

    it("should render every important-information paragraph", () => {
      const { $ } = renderList([]);

      const detailsText = $("details.govuk-details .govuk-details__text").text();
      for (const paragraph of en.importantInformationParagraphs) {
        expect(detailsText).toContain(paragraph);
      }
    });

    it("should render the guidance link with prefix, text and URL", () => {
      const { $ } = renderList([]);

      const guidanceLink = $(`details.govuk-details a[href="${en.importantInformationLinkUrl}"]`);
      expect(guidanceLink).toHaveLength(1);
      expect(guidanceLink.text()).toContain(en.importantInformationLinkText);
      expect($("details.govuk-details .govuk-details__text").text()).toContain(en.importantInformationLinkPrefix);
    });
  });

  describe("Search section", () => {
    it("should render the search title", () => {
      const { $ } = renderList([]);

      expect($("h2.govuk-heading-s").text()).toContain(en.searchCasesTitle);
    });

    it("should render a text search input wired to a visually hidden label", () => {
      const { $ } = renderList([]);

      const input = $("#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("name")).toBe("search");
      expect(input.attr("type")).toBe("text");
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);

      const label = $("label[for='case-search-input']");
      expect(label).toHaveLength(1);
      expect(label.hasClass("govuk-visually-hidden")).toBe(true);
      expect(label.text()).toContain(en.searchCasesLabel);
    });
  });

  describe("Table structure", () => {
    it("should render the hearings table with role and aria-label", () => {
      const { $ } = renderList([]);

      const table = $("#hearings-table");
      expect(table).toHaveLength(1);
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe(en.pageTitle);
    });

    it("should render all six column headers in order with scope=col", () => {
      const { $ } = renderList([]);

      const headers = $("thead th[scope='col']")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        en.tableHeaders.appellant,
        en.tableHeaders.appealReferenceNumber,
        en.tableHeaders.caseType,
        en.tableHeaders.hearingType,
        en.tableHeaders.hearingTime,
        en.tableHeaders.additionalInformation
      ]);
    });
  });

  describe("Hearings data", () => {
    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          appellant: "John Smith",
          appealReferenceNumber: "AST/2026/001",
          caseType: "Section 95",
          hearingType: "Remote - Video",
          hearingTime: "10:00am",
          additionalInformation: "Interpreter required"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.appellant]).toBe("John Smith");
      expect(cells[COLUMN.appealReference]).toBe("AST/2026/001");
      expect(cells[COLUMN.caseType]).toBe("Section 95");
      expect(cells[COLUMN.hearingType]).toBe("Remote - Video");
      expect(cells[COLUMN.hearingTime]).toBe("10:00am");
      expect(cells[COLUMN.additionalInformation]).toBe("Interpreter required");
    });

    it("should render one row per hearing", () => {
      const { $ } = renderList([
        buildHearing({ appellant: "John Smith", appealReferenceNumber: "AST/2026/001" }),
        buildHearing({ appellant: "Jane Doe", appealReferenceNumber: "AST/2026/002" })
      ]);

      const rows = $("tbody.govuk-table__body tr");
      expect(rows).toHaveLength(2);
      const appellants = rows.map((_, row) => $(row).find("td").eq(COLUMN.appellant).text().trim()).get();
      expect(appellants).toEqual(["John Smith", "Jane Doe"]);
      const references = rows.map((_, row) => $(row).find("td").eq(COLUMN.appealReference).text().trim()).get();
      expect(references).toEqual(["AST/2026/001", "AST/2026/002"]);
    });

    it("should render an empty additional-information cell without collapsing columns", () => {
      const { $ } = renderList([buildHearing({ appellant: "Jane Doe", additionalInformation: "" })]);

      const cells = firstDataRowCells($);
      expect(cells).toHaveLength(6);
      expect(cells[COLUMN.appellant]).toBe("Jane Doe");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });

    it("should render the headers but no rows when there are no hearings", () => {
      const { $ } = renderList([]);

      expect($("table.govuk-table")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(en.tableHeaders.appellant);
    });
  });

  describe("Footer section", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Manual Upload" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("Manual Upload");
    });

    it("should render a back-to-top link pointing at the top anchor", () => {
      const { $ } = renderList([]);

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(en.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, labels, table headers and footer", () => {
      const { $ } = renderList(
        [buildHearing()],
        {
          header: buildHeader({
            listTitle: cy.pageTitle,
            listForDate: "15 Ionawr 2026",
            lastUpdatedDate: "14 Ionawr 2026"
          }),
          dataSource: "Lanlwytho â Llaw"
        },
        cy
      );

      expect($("h1#top").text()).toContain(cy.pageTitle);
      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(cy.listForDate);
      expect(bodyText).toContain(cy.lastUpdated);
      expect(bodyText).toContain(cy.at);
      expect($("h2.govuk-heading-s").text()).toContain(cy.searchCasesTitle);
      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(cy.tableHeaders.appellant);
      expect($("p.govuk-body-s").text()).toContain(cy.dataSource);
      expect($(".back-to-top a").text()).toContain(cy.backToTop);
    });

    it("should render the Welsh venue address lines", () => {
      const { $ } = renderList([], { header: buildHeader({ listTitle: cy.pageTitle }) }, cy);

      const bodyText = $(".govuk-body").text();
      for (const line of cy.venueAddressLines) {
        expect(bodyText).toContain(line);
      }
    });
  });

  describe("Accessibility", () => {
    it("should use the GOV.UK full-width grid structure", () => {
      const { $ } = renderList([]);

      expect($(".govuk-grid-row")).toHaveLength(1);
      expect($(".govuk-grid-column-full")).toHaveLength(1);
    });

    it("should render a single h1 and at least one h2", () => {
      const { $ } = renderList([]);

      expect($("h1")).toHaveLength(1);
      expect($("h2").length).toBeGreaterThanOrEqual(1);
    });

    it("should render semantic table structure with header, body and labelled input", () => {
      const { $ } = renderList([buildHearing()]);

      expect($("table.govuk-table thead")).toHaveLength(1);
      expect($("table.govuk-table tbody")).toHaveLength(1);
      expect($("th[scope='col']")).toHaveLength(6);
      expect($("label[for='case-search-input']")).toHaveLength(1);
      expect($("input.govuk-input#case-search-input")).toHaveLength(1);
    });
  });
});
