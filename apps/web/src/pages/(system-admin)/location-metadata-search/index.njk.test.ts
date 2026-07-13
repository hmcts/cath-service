import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The controller spreads the selected locale content directly into the render
// data (res.render("location-metadata-search/index", { ...content, errors })),
// so the template variables are the locale object's keys plus `errors`.
const TEMPLATE = "(system-admin)/location-metadata-search/index.njk";

describe("location-metadata-search template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the heading", () => {
      // Arrange
      const data = { ...en, errors: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.heading);
    });

    it("should render the search input with label and hint", () => {
      // Arrange
      const data = { ...en, errors: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const input = $("input#location-search");
      expect(input).toHaveLength(1);
      expect(input.attr("name")).toBe("locationId");
      expect($("label[for='location-search']").text()).toContain(en.searchInstruction);
      expect($("#location-search-hint").text()).toContain(en.searchHint);
    });

    it("should render the autocomplete data attributes on the input", () => {
      // Arrange
      const data = { ...en, errors: undefined, lng: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const input = $("input#location-search");
      expect(input.attr("data-autocomplete")).toBe("true");
      expect(input.attr("data-locale")).toBe("en");
      expect(input.attr("data-search-label")).toBe(en.locationNameLabel);
    });

    it("should render the continue button inside a post form", () => {
      // Arrange
      const data = { ...en, errors: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("form").attr("method")).toBe("post");
      expect($("button.govuk-button").text()).toContain(en.continueButtonText);
    });

    it("should not render an error summary when there are no errors", () => {
      // Arrange
      const data = { ...en, errors: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading", () => {
      // Arrange
      const data = { ...cy, errors: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.heading);
    });

    it("should render the Welsh label, hint and button", () => {
      // Arrange
      const data = { ...cy, errors: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("label[for='location-search']").text()).toContain(cy.searchInstruction);
      expect($("#location-search-hint").text()).toContain(cy.searchHint);
      expect($("button.govuk-button").text()).toContain(cy.continueButtonText);
    });
  });

  describe("error state", () => {
    it("should render the error summary with the session error message", () => {
      // Arrange
      const errors = [{ text: en.locationNotFound, href: "#location-search" }];
      const data = { ...en, errors };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [en.locationNotFound]);
    });

    it("should mark the input as errored when there are errors", () => {
      // Arrange
      const errors = [{ text: en.locationNameRequired, href: "#location-search" }];
      const data = { ...en, errors };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("input#location-search").hasClass("govuk-input--error")).toBe(true);
    });
  });
});
