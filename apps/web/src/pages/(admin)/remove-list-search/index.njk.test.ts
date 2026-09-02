import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(admin)/remove-list-search/index.njk";

describe("remove-list-search template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = {
        pageTitle: en.pageTitle,
        heading: en.heading,
        searchLabel: en.searchLabel,
        searchHint: en.searchHint,
        continueButton: en.continueButton,
        locationId: "",
        locationName: ""
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text().trim()).toBe(en.heading);
    });

    it("should render the search input with label and hint", () => {
      const data = {
        pageTitle: en.pageTitle,
        heading: en.heading,
        searchLabel: en.searchLabel,
        searchHint: en.searchHint,
        continueButton: en.continueButton,
        locationId: "",
        locationName: ""
      };

      const { $ } = render(env, TEMPLATE, data);

      const input = $("#locationId");
      expect(input).toHaveLength(1);
      expect(input.attr("name")).toBe("locationId");
      expect($('label[for="locationId"]').text().trim()).toBe(en.searchLabel);
      expect($("#locationId-hint").text().trim()).toBe(en.searchHint);
    });

    it("should render the input autocomplete data attributes", () => {
      const data = {
        pageTitle: en.pageTitle,
        heading: en.heading,
        searchLabel: en.searchLabel,
        searchHint: en.searchHint,
        continueButton: en.continueButton,
        locationId: "42",
        locationName: "Blackburn Crown Court"
      };

      const { $ } = render(env, TEMPLATE, data);

      const input = $("#locationId");
      expect(input.attr("data-autocomplete")).toBe("true");
      expect(input.attr("data-location-id")).toBe("42");
      expect(input.attr("data-search-label")).toBe(en.searchLabel);
      expect(input.attr("value")).toBe("Blackburn Crown Court");
    });

    it("should render the continue button inside a post form", () => {
      const data = {
        pageTitle: en.pageTitle,
        heading: en.heading,
        searchLabel: en.searchLabel,
        searchHint: en.searchHint,
        continueButton: en.continueButton,
        locationId: "",
        locationName: ""
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("form").attr("method")).toBe("post");
      expect($("button[type='submit']").text().trim()).toBe(en.continueButton);
    });

    it("should not render an error summary when there are no errors", () => {
      const data = {
        pageTitle: en.pageTitle,
        heading: en.heading,
        searchLabel: en.searchLabel,
        searchHint: en.searchHint,
        continueButton: en.continueButton,
        locationId: "",
        locationName: ""
      };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render an error summary and field error when validation fails", () => {
      const data = {
        pageTitle: en.pageTitle,
        heading: en.heading,
        searchLabel: en.searchLabel,
        searchHint: en.searchHint,
        continueButton: en.continueButton,
        locationId: "",
        locationName: "",
        errors: [{ text: en.errorLocationRequired, href: "#locationId" }],
        errorSummaryTitle: en.errorSummaryTitle,
        locationError: { text: en.errorLocationRequired }
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorLocationRequired]);
      expect($("#locationId-error").text()).toContain(en.errorLocationRequired);
      expect($("#locationId").closest(".govuk-form-group").hasClass("govuk-form-group--error")).toBe(true);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and button", () => {
      const data = {
        pageTitle: cy.pageTitle,
        heading: cy.heading,
        searchLabel: cy.searchLabel,
        searchHint: cy.searchHint,
        continueButton: cy.continueButton,
        locationId: "",
        locationName: ""
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text().trim()).toBe(cy.heading);
      expect($('label[for="locationId"]').text().trim()).toBe(cy.searchLabel);
      expect($("button[type='submit']").text().trim()).toBe(cy.continueButton);
    });

    it("should render the Welsh error summary when validation fails", () => {
      const data = {
        pageTitle: cy.pageTitle,
        heading: cy.heading,
        searchLabel: cy.searchLabel,
        searchHint: cy.searchHint,
        continueButton: cy.continueButton,
        locationId: "",
        locationName: "",
        errors: [{ text: cy.errorLocationRequired, href: "#locationId" }],
        errorSummaryTitle: cy.errorSummaryTitle,
        locationError: { text: cy.errorLocationRequired }
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.errorLocationRequired]);
    });
  });
});
