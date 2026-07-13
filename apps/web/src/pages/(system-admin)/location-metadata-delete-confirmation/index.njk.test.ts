import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/location-metadata-delete-confirmation/index.njk";

function baseData(lang: typeof en | typeof cy, locationName: string) {
  return {
    ...lang,
    locationName,
    errors: undefined
  };
}

describe("location-metadata-delete-confirmation template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the heading with the location name", () => {
      // Arrange
      const data = baseData(en, "Manchester Crown Court");

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1.govuk-heading-l").text().trim()).toBe(`${en.heading} Manchester Crown Court?`);
    });

    it("should render the confirmation radios and continue button", () => {
      // Arrange
      const data = baseData(en, "Manchester Crown Court");

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const radios = $('input[name="confirmDelete"]');
      expect(radios).toHaveLength(2);
      expect(radios.map((_, el) => $(el).attr("value")).get()).toEqual(["yes", "no"]);

      const labels = $(".govuk-radios__label")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(labels).toEqual([en.radioYes, en.radioNo]);

      const form = $("form");
      expect(form.attr("method")).toBe("post");
      expect(form.attr("novalidate")).toBeDefined();
      expect($("button[type='submit']").text().trim()).toBe(en.continueButtonText);
    });

    it("should not render error summary when no errors", () => {
      // Arrange
      const data = baseData(en, "Manchester Crown Court");

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });

    it("should render error summary when errors exist", () => {
      // Arrange
      const data = {
        ...baseData(en, "Manchester Crown Court"),
        errors: [{ text: en.noRadioSelected, href: "#confirm-delete" }]
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [en.noRadioSelected]);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading with the location name", () => {
      // Arrange
      const data = baseData(cy, "Llys y Goron Caerdydd");

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1.govuk-heading-l").text().trim()).toBe(`${cy.heading} Llys y Goron Caerdydd?`);
    });

    it("should render Welsh radio and button text", () => {
      // Arrange
      const data = baseData(cy, "Llys y Goron Caerdydd");

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("button[type='submit']").text().trim()).toBe(cy.continueButtonText);
      const labels = $(".govuk-radios__label")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(labels).toEqual([cy.radioYes, cy.radioNo]);
    });

    it("should render Welsh error summary", () => {
      // Arrange
      const data = {
        ...baseData(cy, "Llys y Goron Caerdydd"),
        errors: [{ text: cy.noRadioSelected, href: "#confirm-delete" }]
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [cy.noRadioSelected]);
    });
  });
});
