import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/subscription-configure-list-language/index.njk";

describe("subscription-configure-list-language template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the heading as the fieldset legend", () => {
      // Arrange
      const data = { ...en, selectedLanguage: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.heading);
    });

    it("should render the three language radio options", () => {
      // Arrange
      const data = { ...en, selectedLanguage: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const values = $('input[name="language"]')
        .map((_, el) => $(el).attr("value"))
        .get();
      expect(values).toEqual(["ENGLISH", "WELSH", "ENGLISH_AND_WELSH"]);
      expect($("label").text()).toContain(en.englishOption);
      expect($("label").text()).toContain(en.welshOption);
      expect($("label").text()).toContain(en.englishAndWelshOption);
    });

    it("should render the continue button and back link", () => {
      // Arrange
      const data = { ...en, selectedLanguage: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-button").text()).toContain(en.continueButton);
      const backLink = $(".govuk-back-link");
      expect(backLink.attr("href")).toBe("/subscription-configure-list");
      expect(backLink.text()).toContain(en.back);
    });

    it("should pre-check the selected language radio", () => {
      // Arrange
      const data = { ...en, selectedLanguage: "WELSH" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($('input[value="WELSH"]').attr("checked")).toBeDefined();
      expect($('input[value="ENGLISH"]').attr("checked")).toBeUndefined();
    });

    it("should not render an error summary when there are no errors", () => {
      // Arrange
      const data = { ...en, selectedLanguage: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });

    it("should render the error summary when errors are present", () => {
      // Arrange
      const data = {
        ...en,
        selectedLanguage: undefined,
        errors: {
          titleText: en.errorSummaryTitle,
          errorList: [{ text: en.errorSelectVersion, href: "#language" }]
        }
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [en.errorSelectVersion]);
      expect($(".govuk-error-message").text()).toContain(en.errorSelectVersion);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and options", () => {
      // Arrange
      const data = { ...cy, selectedLanguage: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.heading);
      expect($("label").text()).toContain(cy.englishAndWelshOption);
      expect($(".govuk-button").text()).toContain(cy.continueButton);
    });

    it("should render the Welsh error summary when errors are present", () => {
      // Arrange
      const data = {
        ...cy,
        selectedLanguage: undefined,
        errors: {
          titleText: cy.errorSummaryTitle,
          errorList: [{ text: cy.errorSelectVersion, href: "#language" }]
        }
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [cy.errorSelectVersion]);
    });
  });
});
