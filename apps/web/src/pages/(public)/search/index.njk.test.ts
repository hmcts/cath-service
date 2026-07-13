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

const TEMPLATE = "(public)/search/index.njk";

describe("search template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required title", () => {
      expect(en.title).toBe("What court or tribunal are you interested in?");
    });

    it("should have error summary title", () => {
      expect(en.errorSummaryTitle).toBe("There is a problem");
    });

    it("should have error message", () => {
      expect(en.errorMessage).toBe("There is nothing matching your criteria");
    });

    it("should have continue button text", () => {
      expect(en.continueButton).toBe("Continue");
    });

    it("should have A-Z list link text", () => {
      expect(en.azListLink).toBe("Select from an A-Z list of courts and tribunals");
    });
  });

  describe("Welsh locale", () => {
    it("should have required title", () => {
      expect(cy.title).toBe("Ym mha lys neu dribiwnlys y mae gennych ddiddordeb?");
    });

    it("should have error summary title", () => {
      expect(cy.errorSummaryTitle).toBe("Mae problem");
    });

    it("should have error message", () => {
      expect(cy.errorMessage).toBe("Nid oes dim sy'n cyfateb i'ch meini prawf");
    });

    it("should have continue button text", () => {
      expect(cy.continueButton).toBe("Parhau");
    });

    it("should have A-Z list link text", () => {
      expect(cy.azListLink).toBe("Dewis o restr A-Y o lysoedd a thribiwnlysoedd");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = ["title", "errorSummaryTitle", "errorMessage", "continueButton", "azListLink"];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });
  });

  describe("Rendering", () => {
    let env: nunjucks.Environment;

    beforeEach(() => {
      env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
    });

    it("should render the English page heading, hint, button and A-Z link", () => {
      // Arrange
      const data = { ...en, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.title);
      expect($(".govuk-hint").text()).toContain(en.searchHint);
      expect($(".govuk-button").text()).toContain(en.continueButton);
      const azLink = $('a[href="/courts-tribunals-list"]');
      expect(azLink.text()).toContain(en.azListLink);
      assertNoErrors($);
    });

    it("should render the search input with autocomplete data attributes", () => {
      // Arrange
      const data = { ...en, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const input = $("#location");
      expect(input).toHaveLength(1);
      expect(input.attr("name")).toBe("locationId");
      expect(input.attr("data-autocomplete")).toBe("true");
      expect(input.attr("data-locale")).toBe("en");
      expect(input.attr("data-no-results-message")).toBe(en.noResultsFound);
    });

    it("should render the Welsh page heading and content", () => {
      // Arrange
      const data = { ...cy, locale: "cy" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.title);
      expect($(".govuk-hint").text()).toContain(cy.searchHint);
      expect($(".govuk-button").text()).toContain(cy.continueButton);
      expect($('a[href="/courts-tribunals-list"]').text()).toContain(cy.azListLink);
    });

    it("should prefill the input with the preselected location name in English", () => {
      // Arrange
      const preselectedLocation = { id: 123, name: "Oxford Combined Court Centre", welshName: "Canolfan Llys Rhydychen" };
      const data = { ...en, locale: "en", preselectedLocation };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const input = $("#location");
      expect(input.attr("value")).toBe("Oxford Combined Court Centre");
      expect(input.attr("data-location-id")).toBe("123");
    });

    it("should prefill the input with the preselected Welsh location name in Welsh", () => {
      // Arrange
      const preselectedLocation = { id: 123, name: "Oxford Combined Court Centre", welshName: "Canolfan Llys Rhydychen" };
      const data = { ...cy, locale: "cy", preselectedLocation };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("#location").attr("value")).toBe("Canolfan Llys Rhydychen");
    });

    it("should render the error summary when errors are present", () => {
      // Arrange
      const errors = [{ text: en.errorMessage, href: "#location" }];
      const data = { ...en, locale: "en", errors };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [en.errorMessage]);
    });
  });
});
