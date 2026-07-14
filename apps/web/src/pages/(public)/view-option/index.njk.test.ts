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

const TEMPLATE = "(public)/view-option/index.njk";

describe("view-option template", () => {
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

  describe("Template rendering", () => {
    it("should render the English heading as the fieldset legend", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.title);
    });

    it("should render both radio options with their hints and HTML labels", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      const radios = $("input[type='radio'][name='viewOption']");
      expect(radios).toHaveLength(2);
      expect($("input[value='court-tribunal']")).toHaveLength(1);
      expect($("input[value='sjp-case']")).toHaveLength(1);
      expect($(".govuk-hint").text()).toContain(en.courtTribunalHint);
      expect($(".govuk-hint").text()).toContain(en.sjpCaseHint);
      const labelsHtml = $(".govuk-radios__label")
        .map((_, el) => $(el).html())
        .get()
        .join("");
      expect(labelsHtml).toContain(en.courtTribunalLabel);
      expect(labelsHtml).toContain(en.sjpCaseLabel);
    });

    it("should render the continue button and post the form to itself", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-button").text()).toContain(en.continueButton);
      const form = $("form");
      expect(form).toHaveLength(1);
      expect(form.attr("method")).toBe("post");
    });

    it("should render the Welsh heading and button", () => {
      const data = { ...cy };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.title);
      expect($(".govuk-button").text()).toContain(cy.continueButton);
    });

    it("should not render an error summary when there are no errors", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render the error summary and highlight the form group when there are errors", () => {
      const data = {
        ...en,
        errors: [{ text: en.errorMessage, href: "#viewOption" }]
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorMessage]);
      expect($(".govuk-form-group--error")).toHaveLength(1);
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = [
        "title",
        "errorSummaryTitle",
        "errorMessage",
        "courtTribunalLabel",
        "courtTribunalHint",
        "sjpCaseLabel",
        "sjpCaseHint",
        "continueButton"
      ];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });
  });
});
