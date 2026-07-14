import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/delete-court-confirm/index.njk";

const buildData = (content: typeof en | typeof cy) => ({
  ...content,
  locationName: "Test Court",
  locationType: "Court",
  jurisdiction: "Civil",
  region: "London"
});

describe("delete-court-confirm template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.pageTitle);
    });

    it("should render the summary list with location details", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const keys = $(".govuk-summary-list__key")
        .map((_, el) => $(el).text().trim())
        .get();
      const values = $(".govuk-summary-list__value")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(keys).toContain(en.tableHeadings.courtName);
      expect(keys).toContain(en.tableHeadings.locationType);
      expect(keys).toContain(en.tableHeadings.jurisdiction);
      expect(keys).toContain(en.tableHeadings.region);
      expect(values).toContain("Test Court");
      expect(values).toContain("Court");
      expect(values).toContain("Civil");
      expect(values).toContain("London");
    });

    it("should render the radio options and continue button", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const radioValues = $("input[name='confirmDelete']")
        .map((_, el) => $(el).attr("value"))
        .get();
      expect(radioValues).toEqual(["yes", "no"]);
      expect($(".govuk-button").text()).toContain(en.continueButtonText);
    });

    it("should not render an error summary when there are no errors", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh page heading and headings", () => {
      const data = buildData(cy);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.pageTitle);
      const keys = $(".govuk-summary-list__key")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(keys).toContain(cy.tableHeadings.courtName);
      expect($(".govuk-button").text()).toContain(cy.continueButtonText);
    });
  });

  describe("Error states", () => {
    it("should render the error summary with a radio validation error", () => {
      const data = { ...buildData(en), errors: [{ text: en.noRadioSelected, href: "#confirm-delete" }] };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.noRadioSelected]);
      expect($(".govuk-error-summary__title").text()).toContain(en.errorSummaryTitle);
      expect($(".govuk-error-message").text()).toContain(en.noRadioSelected);
    });

    it("should render the error summary with a location validation error", () => {
      const data = { ...buildData(en), errors: [{ text: en.activeSubscriptions }] };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.activeSubscriptions]);
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
      expect(Object.keys(en.tableHeadings).sort()).toEqual(Object.keys(cy.tableHeadings).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = [
        "pageTitle",
        "tableHeadings",
        "radioLegend",
        "radioYes",
        "radioNo",
        "continueButtonText",
        "errorSummaryTitle",
        "noRadioSelected",
        "activeSubscriptions",
        "activeArtefacts",
        "locationNotFound"
      ];
      for (const key of requiredKeys) {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      }
    });
  });
});
