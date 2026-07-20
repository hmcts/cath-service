import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/subscription-configure-list-preview/index.njk";

const buildListTypes = () => [
  { listTypeId: 1, name: "Civil Daily Cause List" },
  { listTypeId: 2, name: "Family Daily Cause List" }
];

describe("subscription-configure-list-preview template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = { ...en, listTypes: buildListTypes(), languageDisplay: "English", pendingLanguage: "ENGLISH" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.heading);
    });

    it("should render the table column headers", () => {
      const data = { ...en, listTypes: buildListTypes(), languageDisplay: "English", pendingLanguage: "ENGLISH" };

      const { $ } = render(env, TEMPLATE, data);

      const headings = $(".govuk-table__header")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headings).toContain(en.listTypeColumnHeader);
      expect(headings).toContain(en.actionsColumnHeader);
      expect(headings.some((h) => h.includes(en.versionColumnHeader))).toBe(true);
    });

    it("should render a row per list type with a remove button and hidden listTypeId", () => {
      const data = { ...en, listTypes: buildListTypes(), languageDisplay: "English", pendingLanguage: "ENGLISH" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("body").text()).toContain("Civil Daily Cause List");
      expect($("body").text()).toContain("Family Daily Cause List");
      expect($('input[name="listTypeId"][value="1"]')).toHaveLength(1);
      expect($('input[name="listTypeId"][value="2"]')).toHaveLength(1);
      expect($('input[name="action"][value="remove-list-type"]')).toHaveLength(2);
    });

    it("should render the selected language and change-language action", () => {
      const data = { ...en, listTypes: buildListTypes(), languageDisplay: "English", pendingLanguage: "ENGLISH" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("body").text()).toContain("English");
      expect($('input[name="action"][value="change-language"]')).toHaveLength(1);
    });

    it("should render the confirm submission button", () => {
      const data = { ...en, listTypes: buildListTypes(), languageDisplay: "English", pendingLanguage: "ENGLISH" };

      const { $ } = render(env, TEMPLATE, data);

      expect($('input[name="action"][value="confirm"]')).toHaveLength(1);
      expect($(".govuk-button").text()).toContain(en.confirmButton);
    });

    it("should not render an error summary when list types are selected", () => {
      const data = { ...en, listTypes: buildListTypes(), languageDisplay: "English", pendingLanguage: "ENGLISH" };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render an error summary and select-list link when no list types are selected", () => {
      const data = { ...en, listTypes: [], languageDisplay: en.noLanguageSelected, pendingLanguage: undefined };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorNoListTypes]);
      expect($('a[href="/subscription-configure-list"]').text()).toContain(en.selectListTypesLink);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and confirm button", () => {
      const data = { ...cy, listTypes: buildListTypes(), languageDisplay: "Saesneg", pendingLanguage: "ENGLISH" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.heading);
      expect($(".govuk-button").text()).toContain(cy.confirmButton);
    });

    it("should render the Welsh error summary when no list types are selected", () => {
      const data = { ...cy, listTypes: [], languageDisplay: cy.noLanguageSelected, pendingLanguage: undefined };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.errorNoListTypes]);
    });
  });
});
