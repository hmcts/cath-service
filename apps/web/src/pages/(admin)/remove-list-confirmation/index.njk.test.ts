import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(admin)/remove-list-confirmation/index.njk";

const sampleArtefact = {
  listType: "Civil Daily Cause List",
  court: "Manchester Crown Court",
  contentDate: "1 Jan 2026",
  displayDates: "1 Jan 2026 to 2 Jan 2026",
  language: "English",
  sensitivity: "Public"
};

function baseData(lang: typeof en | typeof cy) {
  return {
    pageTitle: lang.pageTitle,
    heading: lang.heading,
    tableHeaders: lang.tableHeaders,
    radioYes: lang.radioYes,
    radioNo: lang.radioNo,
    continueButton: lang.continueButton,
    artefactData: [sampleArtefact]
  };
}

describe("remove-list-confirmation template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-l").text().trim()).toBe(en.heading);
    });

    it("should render the table headers", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      const headers = $("thead .govuk-table__header")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        en.tableHeaders.listType,
        en.tableHeaders.court,
        en.tableHeaders.contentDate,
        en.tableHeaders.displayDates,
        en.tableHeaders.language,
        en.tableHeaders.sensitivity
      ]);
    });

    it("should render a row for each artefact", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      const rows = $("tbody .govuk-table__row");
      expect(rows).toHaveLength(1);
      const cells = rows
        .first()
        .find(".govuk-table__cell")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(cells).toEqual([
        sampleArtefact.listType,
        sampleArtefact.court,
        sampleArtefact.contentDate,
        sampleArtefact.displayDates,
        sampleArtefact.language,
        sampleArtefact.sensitivity
      ]);
    });

    it("should render the confirmation radios and continue button", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      const radios = $('input[name="confirmation"]');
      expect(radios).toHaveLength(2);
      expect(radios.map((_, el) => $(el).attr("value")).get()).toEqual(["yes", "no"]);

      const form = $("form");
      expect(form.attr("method")).toBe("post");
      expect(form.attr("novalidate")).toBeDefined();
      expect($("button[type='submit']").text().trim()).toBe(en.continueButton);
    });

    it("should not render error summary when no errors", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render error summary when errors exist", () => {
      const data = {
        ...baseData(en),
        errorSummaryTitle: en.errorSummaryTitle,
        errors: [{ text: en.errorNoSelection, href: "#confirmation" }]
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorNoSelection]);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and headers", () => {
      const data = baseData(cy);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-l").text().trim()).toBe(cy.heading);
      const headers = $("thead .govuk-table__header")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(cy.tableHeaders.listType);
      expect(headers).toContain(cy.tableHeaders.sensitivity);
    });

    it("should render Welsh radio and button text", () => {
      const data = baseData(cy);

      const { $ } = render(env, TEMPLATE, data);

      expect($("button[type='submit']").text().trim()).toBe(cy.continueButton);
      const labels = $(".govuk-radios__label")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(labels).toEqual([cy.radioYes, cy.radioNo]);
    });

    it("should render Welsh error summary", () => {
      const data = {
        ...baseData(cy),
        errorSummaryTitle: cy.errorSummaryTitle,
        errors: [{ text: cy.errorNoSelection, href: "#confirmation" }]
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.errorNoSelection]);
    });
  });
});
