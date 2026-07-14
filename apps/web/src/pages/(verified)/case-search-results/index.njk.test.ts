import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/case-search-results/index.njk";

const RESULTS = [
  { caseName: "Adams v Jones", caseNumber: "AB-123" },
  { caseName: "Brown v Crown", caseNumber: "AB-456" }
];

function buildData(t: typeof en, overrides: Record<string, unknown> = {}) {
  return {
    ...t,
    results: RESULTS,
    searchSource: "/case-name-search",
    ...overrides
  };
}

describe("case-search-results template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading and results count", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.heading);
      expect($("p.govuk-body").text()).toContain(`${RESULTS.length} ${en.resultsFound}`);
    });

    it("should render the table headers and a checkbox row per result", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([en.columnSelect, en.columnCaseName, en.columnReferenceNumber]);
      expect($("tbody tr")).toHaveLength(RESULTS.length);
      expect($("input#selectedCase-1[type='checkbox']")).toHaveLength(1);
      expect($("input#selectedCase-1").attr("value")).toBe("Adams v Jones|||AB-123");
      expect($("tbody tr").first().text()).toContain("Adams v Jones");
      expect($("tbody tr").first().text()).toContain("AB-123");
    });

    it("should render the continue button and a back link to the search source", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("button.govuk-button").text()).toContain(en.continueButton);
      expect($("a.govuk-back-link").attr("href")).toBe("/case-name-search");
      expect($("a.govuk-back-link").text()).toContain(en.back);
    });

    it("should not render an error summary when there are no errors", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading, count and continue button", () => {
      const data = buildData(cy);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.heading);
      expect($("p.govuk-body").text()).toContain(`${RESULTS.length} ${cy.resultsFound}`);
      expect($("button.govuk-button").text()).toContain(cy.continueButton);
    });
  });

  describe("Error states", () => {
    it("should render an error summary and inline error when no case is selected", () => {
      const errors = {
        titleText: en.errorSummaryTitle,
        errorList: [{ text: en.errorNoSelection, href: "#selectedCase-1" }]
      };
      const data = buildData(en, { errors });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorNoSelection]);
      expect($("#selectedCase-error").text()).toContain(en.errorNoSelection);
      expect($("input#selectedCase-1").hasClass("govuk-checkboxes__input--error")).toBe(true);
    });
  });
});
