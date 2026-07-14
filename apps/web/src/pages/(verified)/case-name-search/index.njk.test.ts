import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/case-name-search/index.njk";

describe("case-name-search template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the heading, hint, back link and continue button", () => {
      const data = { ...en, caseName: "" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.heading);
      expect($("#caseName-hint").text()).toContain(en.caseNameHint);
      expect($(".govuk-back-link").attr("href")).toBe("/add-email-subscription");
      expect($(".govuk-back-link").text()).toContain(en.back);
      expect($("button").text()).toContain(en.continueButton);
      assertNoErrors($);
    });

    it("should render the submitted case name as the input value", () => {
      const data = { ...en, caseName: "Smith" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("#caseName").attr("value")).toBe("Smith");
    });

    it("should render the min-length error summary and inline error when errors are present", () => {
      const data = {
        ...en,
        caseName: "AB",
        errors: {
          titleText: en.errorSummaryTitle,
          errorList: [{ text: en.errorMinLength, href: "#caseName" }]
        }
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorMinLength]);
      expect($(".govuk-error-message").text()).toContain(en.errorMinLength);
    });

    it("should render the no-results inline error text instead of the summary text", () => {
      const data = {
        ...en,
        caseName: "Unknown Case",
        errors: {
          titleText: en.errorSummaryTitle,
          errorList: [{ text: en.errorNoResultsSummary, href: "#caseName" }],
          inlineError: en.errorNoResultsInline
        }
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorNoResultsSummary]);
      expect($(".govuk-error-message").text()).toContain(en.errorNoResultsInline);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading and continue button", () => {
      const data = { ...cy, caseName: "" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.heading);
      expect($("button").text()).toContain(cy.continueButton);
      assertNoErrors($);
    });

    it("should render the Welsh min-length error summary", () => {
      const data = {
        ...cy,
        caseName: "AB",
        errors: {
          titleText: cy.errorSummaryTitle,
          errorList: [{ text: cy.errorMinLength, href: "#caseName" }]
        }
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.errorMinLength]);
      expect($(".govuk-error-message").text()).toContain(cy.errorMinLength);
    });
  });
});
