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

const TEMPLATE = "(public)/sign-in/index.njk";

describe("select-account template", () => {
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
    it("should render the page heading and all account options in English", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.title);
      const radioLabels = $(".govuk-radios__label")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(radioLabels).toContain(en.hmctsLabel);
      expect(radioLabels).toContain(en.commonPlatformLabel);
      expect(radioLabels).toContain(en.cathLabel);
      const radioValues = $("input[name='accountType']")
        .map((_, el) => $(el).attr("value"))
        .get();
      expect(radioValues).toEqual(["hmcts", "common-platform", "cath"]);
      assertNoErrors($);
    });

    it("should render the continue button and create-account link in English", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($("button").text()).toContain(en.continueButton);
      const createLink = $("a[href='/create-media-account']");
      expect(createLink.text()).toContain(en.createAccountLink);
      expect($("body").text()).toContain(en.createAccountText);
    });

    it("should render the page heading and account options in Welsh", () => {
      const data = { ...cy };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.title);
      const radioLabels = $(".govuk-radios__label")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(radioLabels).toContain(cy.hmctsLabel);
      expect(radioLabels).toContain(cy.commonPlatformLabel);
      expect(radioLabels).toContain(cy.cathLabel);
      expect($("button").text()).toContain(cy.continueButton);
      assertNoErrors($);
    });

    it("should render the error summary when errors are present", () => {
      const data = {
        ...en,
        errors: [{ text: en.errorMessage, href: "#accountType" }],
        data: { accountType: undefined }
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorMessage]);
      expect($(".govuk-error-summary").text()).toContain(en.errorSummaryTitle);
    });

    it("should pre-select the previously chosen account when re-rendering with data", () => {
      const data = {
        ...en,
        errors: [{ text: en.errorMessage, href: "#accountType" }],
        data: { accountType: "cath" }
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("input[value='cath']").attr("checked")).toBeDefined();
      expect($("input[value='hmcts']").attr("checked")).toBeUndefined();
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = [
        "title",
        "errorSummaryTitle",
        "errorMessage",
        "hmctsLabel",
        "commonPlatformLabel",
        "cathLabel",
        "continueButton",
        "createAccountText",
        "createAccountLink"
      ];

      for (const key of requiredKeys) {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      }
    });
  });
});
