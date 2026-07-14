import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/add-email-subscription/index.njk";

describe("add-email-subscription template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text().trim()).toBe(en.heading);
    });

    it("should render the inset text", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-inset-text").text()).toContain(en.insetText);
    });

    it("should render the three radio options", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      const values = $('input[name="subscriptionMethod"]')
        .map((_, el) => $(el).attr("value"))
        .get();
      expect(values).toEqual(["courtOrTribunal", "caseName", "caseReference"]);
      expect($("body").text()).toContain(en.courtOrTribunalOption);
      expect($("body").text()).toContain(en.caseNameOption);
      expect($("body").text()).toContain(en.caseReferenceOption);
    });

    it("should render the continue button and back link", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($("button").text()).toContain(en.continueButton);
      const back = $('a[href="/subscription-management"]');
      expect(back.length).toBe(1);
      expect(back.text().trim()).toBe(en.back);
    });

    it("should not render an error summary without errors", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading, options and back link", () => {
      const data = { ...cy };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text().trim()).toBe(cy.heading);
      expect($("body").text()).toContain(cy.courtOrTribunalOption);
      expect($('a[href="/subscription-management"]').text().trim()).toBe(cy.back);
    });
  });

  describe("Error state", () => {
    it("should render the error summary when errors are present", () => {
      const data = {
        ...en,
        errors: {
          titleText: en.errorSummaryTitle,
          errorList: [{ text: en.errorSelectOption, href: "#subscriptionMethod" }]
        }
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorSelectOption]);
    });
  });
});
