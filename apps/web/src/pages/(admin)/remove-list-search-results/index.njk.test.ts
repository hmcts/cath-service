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
    sensitivity: "Public"
  },
  {
    artefactId: "artefact-2",
    listType: "Family Daily Cause List",
    courtName: "Reading County Court",
    contentDate: "3 January 2026",
    displayDates: "3 January 2026 to 4 January 2026",
    language: "Welsh",
    sensitivity: "Private"
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
    isDefaultSort: true,
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
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.heading);
      expect($("h2").text()).toContain(en.subHeading);
      expect($("p.govuk-body").text()).toContain(en.showingResults);
      expect($("p.govuk-body").text()).toContain(String(sampleRows.length));
      expect($("p.govuk-body").text()).toContain(en.resultsText);
      assertNoErrors($);
    });

    it("should render a table row and checkbox per artefact", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("tbody.govuk-table__body tr")).toHaveLength(sampleRows.length);
      expect($('input[name="artefacts"]')).toHaveLength(sampleRows.length);
      expect($('input[name="artefacts"]').first().attr("value")).toBe("artefact-1");
      expect($("tbody.govuk-table__body").text()).toContain("Oxford Combined Court Centre");
      expect($("tbody.govuk-table__body").text()).toContain("Civil Daily Cause List");
    });

    it("should render sortable column headers with English labels", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
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
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("button.govuk-button").text()).toContain(en.continueButton);
    });
  });

  describe("no results", () => {
    it("should not render the table or form when resultCount is zero", () => {
      // Arrange
      const data = buildData(en, { artefactRows: [], resultCount: 0 });

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h2").text()).not.toContain(en.subHeading);
      expect($("table")).toHaveLength(0);
      expect($("form")).toHaveLength(0);
      expect($("p.govuk-body").text()).toContain(en.showingResults);
    });
  });

  describe("sorting state", () => {
    it("should mark the active sorted column with aria-sort when not default sort", () => {
      // Arrange
      const data = buildData(en, { sortBy: "listType", order: "asc", isDefaultSort: false });

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const listTypeHeader = $("th")
        .filter((_, el) => $(el).text().includes(en.tableHeaders.listType))
        .first();
      expect(listTypeHeader.attr("aria-sort")).toBe("ascending");
    });
  });

  describe("error state", () => {
    it("should render the error summary when a selection error is passed", () => {
      // Arrange
      const data = buildData(en, {
        errors: [{ text: en.errorNoSelection, href: "#artefacts" }],
        errorSummaryTitle: en.errorSummaryTitle
      });

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [en.errorNoSelection]);
      expect($(".govuk-error-summary__title").text()).toContain(en.errorSummaryTitle);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading and table headers", () => {
      // Arrange
      const data = buildData(cy, { locale: "cy" });

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.heading);
      expect($("h2").text()).toContain(cy.subHeading);
      const headerText = $("thead").text();
      expect(headerText).toContain(cy.tableHeaders.listType);
      expect(headerText).toContain(cy.tableHeaders.sensitivity);
      expect($("button.govuk-button").text()).toContain(cy.continueButton);
    });
  });
});
