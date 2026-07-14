import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/case-reference-search/index.njk";

describe("case-reference-search template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = { ...en, caseReference: "" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text().trim()).toBe(en.heading);
    });

    it("should render the inset text guidance", () => {
      const data = { ...en, caseReference: "" };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-inset-text").text()).toContain(en.insetText);
    });

    it("should render the reference input and continue button with no errors", () => {
      const data = { ...en, caseReference: "" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("#caseReference").length).toBe(1);
      expect($('input[name="caseReference"]').attr("value") ?? "").toBe("");
      expect($("button.govuk-button").text().trim()).toBe(en.continueButton);
      assertNoErrors($);
    });

    it("should render the back link to add-email-subscription", () => {
      const data = { ...en, caseReference: "" };

      const { $ } = render(env, TEMPLATE, data);

      const backLink = $('a[href="/add-email-subscription"]');
      expect(backLink.length).toBe(1);
      expect(backLink.text().trim()).toBe(en.back);
    });

    it("should preserve the submitted case reference value", () => {
      const data = { ...en, caseReference: "AB-123" };

      const { $ } = render(env, TEMPLATE, data);

      expect($('input[name="caseReference"]').attr("value")).toBe("AB-123");
    });

    it("should render the error summary and inline error when errors are present", () => {
      const data = {
        ...en,
        caseReference: "UNKNOWN-999",
        errors: {
          titleText: en.errorSummaryTitle,
          errorList: [{ text: en.errorSummary, href: "#caseReference" }],
          inlineError: en.errorInline
        }
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorSummary]);
      expect($(".govuk-error-summary__title").text().trim()).toBe(en.errorSummaryTitle);
      expect($(".govuk-error-message").text()).toContain(en.errorInline);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading, inset text and continue button", () => {
      const data = { ...cy, caseReference: "" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text().trim()).toBe(cy.heading);
      expect($(".govuk-inset-text").text()).toContain(cy.insetText);
      expect($("button.govuk-button").text().trim()).toBe(cy.continueButton);
      expect($('a[href="/add-email-subscription"]').text().trim()).toBe(cy.back);
    });

    it("should render Welsh error summary and inline error when errors are present", () => {
      const data = {
        ...cy,
        caseReference: "UNKNOWN-999",
        errors: {
          titleText: cy.errorSummaryTitle,
          errorList: [{ text: cy.errorSummary, href: "#caseReference" }],
          inlineError: cy.errorInline
        }
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.errorSummary]);
      expect($(".govuk-error-message").text()).toContain(cy.errorInline);
    });
  });
});
