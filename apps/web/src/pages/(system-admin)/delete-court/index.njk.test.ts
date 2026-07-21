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

const TEMPLATE = "(system-admin)/delete-court/index.njk";

describe("delete-court template", () => {
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
    it("should render the English heading, form field and continue button", () => {
      const data = { ...en, errors: undefined };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.pageTitle);
      expect($("form[method='post']")).toHaveLength(1);
      expect($("input#court-search[name='locationId']")).toHaveLength(1);
      expect($("label[for='court-search']").text()).toContain(en.courtNameLabel);
      expect($("button.govuk-button").text()).toContain(en.continueButtonText);
    });

    it("should render the Welsh heading, label and button", () => {
      const data = { ...cy, errors: undefined };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.pageTitle);
      expect($("label[for='court-search']").text()).toContain(cy.courtNameLabel);
      expect($("button.govuk-button").text()).toContain(cy.continueButtonText);
    });

    it("should not render an error summary when there are no errors", () => {
      const data = { ...en, errors: undefined };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render an error summary and inline error when errors are present", () => {
      const data = {
        ...en,
        errors: [{ text: en.courtNameRequired, href: "#court-search" }]
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.courtNameRequired]);
      expect($(".govuk-error-summary__title").text()).toContain(en.errorSummaryTitle);
      expect($(".govuk-form-group--error label[for='court-search']")).toHaveLength(1);
      expect($("#court-search-error").text()).toContain(en.courtNameRequired);
      expect($("input#court-search").hasClass("govuk-input--error")).toBe(true);
    });

    it("should render the English court not found error in the summary", () => {
      const data = {
        ...en,
        errors: [{ text: en.courtNotFound, href: "#court-search" }]
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.courtNotFound]);
      expect($(".govuk-error-summary__title").text()).toContain(en.errorSummaryTitle);
      expect($("#court-search-error").text()).toContain(en.courtNotFound);
    });

    it("should render a Welsh error summary when errors are present", () => {
      const data = {
        ...cy,
        errors: [{ text: cy.courtNameRequired, href: "#court-search" }]
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.courtNameRequired]);
      expect($(".govuk-error-summary__title").text()).toContain(cy.errorSummaryTitle);
    });

    it("should render the Welsh court not found error in the summary", () => {
      const data = {
        ...cy,
        errors: [{ text: cy.courtNotFound, href: "#court-search" }]
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.courtNotFound]);
      expect($(".govuk-error-summary__title").text()).toContain(cy.errorSummaryTitle);
      expect($("#court-search-error").text()).toContain(cy.courtNotFound);
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = ["pageTitle", "courtNameLabel", "continueButtonText", "errorSummaryTitle", "courtNameRequired", "courtNotFound"];
      for (const key of requiredKeys) {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      }
    });
  });
});
