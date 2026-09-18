import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(public)/sign-in/index.njk";
const CONTENT_COLUMN = ".govuk-grid-column-two-thirds";
const CREATE_ACCOUNT_LINK = "a[href='/create-media-account']";
const REMOVED_STRINGS = ["Don't have a CaTH account?", "Create one here", "Nid oes gennych gyfrif CaTH?", "Crëwch un yma"];

describe("select-account template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  const contentColumn = ($: CheerioAPI) => $(CREATE_ACCOUNT_LINK).closest(CONTENT_COLUMN);

  const contentTagNames = ($: CheerioAPI) =>
    contentColumn($)
      .children()
      .toArray()
      .map((el) => el.tagName);

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

    it("should render the continue button in English", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($("button").text()).toContain(en.continueButton);
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

    it("should render the Welsh error summary when errors are present", () => {
      const data = {
        ...cy,
        errors: [{ text: cy.errorMessage, href: "#accountType" }],
        data: { accountType: undefined }
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.errorMessage]);
      expect($(".govuk-error-summary").text()).toContain(cy.errorSummaryTitle);
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

  describe("Create-account block", () => {
    it("should render the create-account prompt as the only second level heading in the content column", () => {
      const { $ } = render(env, TEMPLATE, { ...en });

      const heading = contentColumn($).find("h2");
      expect(heading).toHaveLength(1);
      expect(heading.text().trim()).toBe(en.createAccountText);
    });

    it("should render exactly one first level heading so no heading level is skipped", () => {
      const { $ } = render(env, TEMPLATE, { ...en });

      expect($("h1")).toHaveLength(1);
      expect($("h1").text()).toContain(en.title);
    });

    it("should render the create-account link with the full descriptive text as its whole accessible name", () => {
      const { $ } = render(env, TEMPLATE, { ...en });

      const createLink = $(CREATE_ACCOUNT_LINK);
      expect(createLink).toHaveLength(1);
      expect(createLink.text().trim()).toBe(en.createAccountLink);
    });

    it("should render the create-account link as the sole content of its own paragraph", () => {
      const { $ } = render(env, TEMPLATE, { ...en });

      const linkParagraph = $(CREATE_ACCOUNT_LINK).parent();
      expect(linkParagraph.is("p")).toBe(true);
      expect(linkParagraph.text().trim()).toBe(en.createAccountLink);
    });

    it("should keep the create-account block outside the form", () => {
      const { $ } = render(env, TEMPLATE, { ...en });

      expect($(`form ${CREATE_ACCOUNT_LINK}`)).toHaveLength(0);
      expect($("form h2")).toHaveLength(0);
      expect($("form strong")).toHaveLength(0);
    });

    it("should render the user research notice in bold inside a paragraph", () => {
      const { $ } = render(env, TEMPLATE, { ...en });

      const notice = contentColumn($).find("p > strong");
      expect(notice).toHaveLength(1);
      expect(notice.text().trim()).toBe(en.userResearchText);
    });

    it("should order the block as form, then heading, then link, then notice", () => {
      const { $ } = render(env, TEMPLATE, { ...en });

      const tagNames = contentTagNames($);
      const formIndex = tagNames.indexOf("form");
      const headingIndex = tagNames.indexOf("h2");
      const linkIndex = tagNames.findIndex((tag, index) => tag === "p" && index > headingIndex);
      const noticeIndex = tagNames.findIndex((tag, index) => tag === "p" && index > linkIndex);

      expect(formIndex).toBeGreaterThanOrEqual(0);
      expect(formIndex).toBeLessThan(headingIndex);
      expect(headingIndex).toBeLessThan(linkIndex);
      expect(linkIndex).toBeLessThan(noticeIndex);
      const blocks = contentColumn($).children();
      expect(blocks.eq(linkIndex).find(CREATE_ACCOUNT_LINK)).toHaveLength(1);
      expect(blocks.eq(noticeIndex).find("strong")).toHaveLength(1);
    });

    it("should render the Welsh heading, link and notice", () => {
      const { $ } = render(env, TEMPLATE, { ...cy });

      expect(contentColumn($).find("h2").text().trim()).toBe(cy.createAccountText);
      const createLink = $(CREATE_ACCOUNT_LINK);
      expect(createLink.text().trim()).toBe(cy.createAccountLink);
      expect(contentColumn($).find("p > strong").text().trim()).toBe(cy.userResearchText);
    });

    it("should still render the heading, link and notice in the error state", () => {
      const data = {
        ...en,
        errors: [{ text: en.errorMessage, href: "#accountType" }],
        data: { accountType: undefined }
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorMessage]);
      expect(contentColumn($).children("h2").text().trim()).toBe(en.createAccountText);
      expect($(CREATE_ACCOUNT_LINK).text().trim()).toBe(en.createAccountLink);
      expect(contentColumn($).find("p > strong").text().trim()).toBe(en.userResearchText);
    });

    it.each(["en", "cy"])("should not render any of the replaced create-account copy in %s", (locale) => {
      const { $ } = render(env, TEMPLATE, locale === "cy" ? { ...cy } : { ...en });

      const bodyText = $("body").text();
      for (const removed of REMOVED_STRINGS) {
        expect(bodyText).not.toContain(removed);
      }
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
        "createAccountLink",
        "userResearchText"
      ];

      for (const key of requiredKeys) {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      }
    });
  });
});
