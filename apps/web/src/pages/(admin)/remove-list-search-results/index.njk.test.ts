import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(admin)/remove-list-search-results/index.njk";

const sampleRows = [
  {
    artefactId: "artefact-1",
    listType: "Civil Daily Cause List",
    courtName: "Oxford Combined Court Centre",
    contentDate: "1 January 2026",
    displayDates: "1 January 2026 to 2 January 2026",
    language: "English",
    sensitivity: "Public",
    contentDateSortValue: Date.UTC(2026, 0, 1)
  },
  {
    artefactId: "artefact-2",
    listType: "Family Daily Cause List",
    courtName: "Reading County Court",
    contentDate: "3 January 2026",
    displayDates: "3 January 2026 to 4 January 2026",
    language: "Welsh",
    sensitivity: "Private",
    contentDateSortValue: Date.UTC(2026, 0, 3)
  }
];

function buildData(t: typeof en, overrides: Record<string, unknown> = {}) {
  return {
    pageTitle: t.pageTitle,
    heading: t.heading,
    subHeading: t.subHeading,
    showingResults: t.showingResults,
    resultsText: t.resultsText,
    noResults: t.noResults,
    tableHeaders: t.tableHeaders,
    continueButton: t.continueButton,
    artefactRows: sampleRows,
    resultCount: sampleRows.length,
    sortBy: "contentDate",
    order: "desc",
    ...overrides
  };
}

describe("remove-list-search-results template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the heading, sub-heading and results count", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.heading);
      expect($("table caption.govuk-table__caption--m").text().trim()).toBe(en.subHeading);
      expect($("main h2")).toHaveLength(0);
      expect($("p.govuk-body").text()).toContain(en.showingResults);
      expect($("p.govuk-body").text()).toContain(String(sampleRows.length));
      expect($("p.govuk-body").text()).toContain(en.resultsText);
      assertNoErrors($);
    });

    it("should render a table row and checkbox per artefact", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("tbody.govuk-table__body tr")).toHaveLength(sampleRows.length);
      expect($('input[name="artefacts"]')).toHaveLength(sampleRows.length);
      expect($('input[name="artefacts"]').first().attr("value")).toBe("artefact-1");
      expect($("tbody.govuk-table__body").text()).toContain("Oxford Combined Court Centre");
      expect($("tbody.govuk-table__body").text()).toContain("Civil Daily Cause List");
    });

    it("should render sortable column headers with English labels", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const headerText = $("thead").text();
      expect(headerText).toContain(en.tableHeaders.listType);
      expect(headerText).toContain(en.tableHeaders.courtName);
      expect(headerText).toContain(en.tableHeaders.contentDate);
      expect(headerText).toContain(en.tableHeaders.displayDates);
      expect(headerText).toContain(en.tableHeaders.language);
      expect(headerText).toContain(en.tableHeaders.sensitivity);
      expect(headerText).toContain(en.tableHeaders.select);
    });

    it("should render the continue button", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("button.govuk-button").text()).toContain(en.continueButton);
    });
  });

  describe("no results", () => {
    it("should not render the table or form when resultCount is zero", () => {
      const data = buildData(en, { artefactRows: [], resultCount: 0 });

      const { $ } = render(env, TEMPLATE, data);

      expect($("caption")).toHaveLength(0);
      expect($("table")).toHaveLength(0);
      expect($("form")).toHaveLength(0);
      expect($("p.govuk-body").text()).toContain(en.showingResults);
    });
  });

  describe("sorting state", () => {
    it("should mark the table as a MoJ sortable table", () => {
      const { $ } = render(env, TEMPLATE, buildData(en));

      expect($('table[data-module="moj-sortable-table"]')).toHaveLength(1);
    });

    it("should mark the default content date column as sorted descending and the others as unsorted", () => {
      const { $ } = render(env, TEMPLATE, buildData(en));

      const sortStates = $("thead th[aria-sort]")
        .map((_, el) => $(el).attr("aria-sort"))
        .get();
      expect(sortStates).toEqual(["none", "none", "descending", "none", "none"]);
    });

    it("should leave the display dates and select columns unsortable", () => {
      const { $ } = render(env, TEMPLATE, buildData(en));

      const unsortable = $("thead th:not([aria-sort])")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(unsortable).toEqual([en.tableHeaders.displayDates, en.tableHeaders.select]);
    });

    it("should keep a query-string link in each sortable header as the no-JavaScript fallback", () => {
      const { $ } = render(env, TEMPLATE, buildData(en));

      const contentDateLink = $("thead th[aria-sort] a").eq(2);
      expect($("thead th[aria-sort] a")).toHaveLength(5);
      expect(contentDateLink.attr("href")).toBe("?sort=contentDate&order=asc");
    });

    it("should put a numeric sort value on each content date cell", () => {
      const { $ } = render(env, TEMPLATE, buildData(en));

      const sortValues = $("tbody td[data-sort-value]")
        .map((_, el) => $(el).attr("data-sort-value"))
        .get();
      expect(sortValues).toEqual([String(Date.UTC(2026, 0, 1)), String(Date.UTC(2026, 0, 3))]);
    });

    it("should mark the active sorted column with aria-sort when not default sort", () => {
      const data = buildData(en, { sortBy: "listType", order: "asc" });

      const { $ } = render(env, TEMPLATE, data);

      const listTypeHeader = $("th")
        .filter((_, el) => $(el).text().includes(en.tableHeaders.listType))
        .first();
      expect(listTypeHeader.attr("aria-sort")).toBe("ascending");
    });
  });

  describe("error state", () => {
    it("should render the error summary when a selection error is passed", () => {
      const data = buildData(en, {
        errors: [{ text: en.errorNoSelection, href: "#artefacts" }],
        errorSummaryTitle: en.errorSummaryTitle
      });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorNoSelection]);
      expect($(".govuk-error-summary__title").text()).toContain(en.errorSummaryTitle);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading and table headers", () => {
      const data = buildData(cy, { locale: "cy" });

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.heading);
      expect($("table caption").text().trim()).toBe(cy.subHeading);
      const headerText = $("thead").text();
      expect(headerText).toContain(cy.tableHeaders.listType);
      expect(headerText).toContain(cy.tableHeaders.sensitivity);
      expect($("button.govuk-button").text()).toContain(cy.continueButton);
    });
  });
});
