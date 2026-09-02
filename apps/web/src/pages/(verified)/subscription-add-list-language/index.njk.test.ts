import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/subscription-add-list-language/index.njk";

describe("subscription-add-list-language template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the heading as the fieldset legend", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-fieldset__heading").text().trim()).toBe(en.heading);
    });

    it("should render a back link to the previous step", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      const backLink = $("a.govuk-back-link");
      expect(backLink.attr("href")).toBe("/subscription-add-list");
      expect(backLink.text().trim()).toBe(en.back);
    });

    it("should render the three language radio options", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      const radios = $('input[type="radio"][name="language"]');
      expect(radios).toHaveLength(3);
      expect(radios.map((_, el) => $(el).attr("value")).get()).toEqual(["ENGLISH", "WELSH", "ENGLISH_AND_WELSH"]);
      expect($('label[for="language"]').text().trim()).toBe(en.englishOption);
    });

    it("should render the submit button", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      const form = $("form");
      expect(form.attr("method")).toBe("post");
      expect(form.attr("novalidate")).toBeDefined();
      expect($("button.govuk-button").text().trim()).toBe(en.continueButton);
    });

    it("should not render an error summary when there are no errors", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should mark the previously selected option as checked", () => {
      const data = { ...en, selectedLanguage: "WELSH" };

      const { $ } = render(env, TEMPLATE, data);

      expect($('input[value="WELSH"]').attr("checked")).toBeDefined();
      expect($('input[value="ENGLISH"]').attr("checked")).toBeUndefined();
    });

    it("should render the error summary when validation fails", () => {
      const data = {
        ...en,
        errors: {
          titleText: en.errorSummaryTitle,
          errorList: [{ text: en.errorSelectVersion, href: "#language" }]
        }
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorSelectVersion]);
      expect($(".govuk-error-summary__title").text().trim()).toBe(en.errorSummaryTitle);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading, options and button", () => {
      const data = { ...cy };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-fieldset__heading").text().trim()).toBe(cy.heading);
      expect($('label[for="language"]').text().trim()).toBe(cy.englishOption);
      expect($("button.govuk-button").text().trim()).toBe(cy.continueButton);
      expect($("a.govuk-back-link").text().trim()).toBe(cy.back);
    });

    it("should render the Welsh error summary title", () => {
      const data = {
        ...cy,
        errors: {
          titleText: cy.errorSummaryTitle,
          errorList: [{ text: cy.errorSelectVersion, href: "#language" }]
        }
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.errorSelectVersion]);
      expect($(".govuk-error-summary__title").text().trim()).toBe(cy.errorSummaryTitle);
    });
  });
});
