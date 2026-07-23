import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/delete-list-type/index.njk";
const LIST_TYPE_NAME = "Civil Daily Cause List";

describe("delete-list-type template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = { ...en, listTypeName: LIST_TYPE_NAME, data: {} };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-xl").text().trim()).toBe(en.title);
    });

    it("should render the list type name in the summary list", () => {
      const data = { ...en, listTypeName: LIST_TYPE_NAME, data: {} };

      const { $ } = render(env, TEMPLATE, data);

      const summaryKeys = $(".govuk-summary-list__key")
        .map((_, el) => $(el).text().trim())
        .get();
      const summaryValues = $(".govuk-summary-list__value")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(summaryKeys).toContain(en.listTypeLabel);
      expect(summaryValues).toContain(LIST_TYPE_NAME);
    });

    it("should render both radio options within a post form", () => {
      const data = { ...en, listTypeName: LIST_TYPE_NAME, data: {} };

      const { $ } = render(env, TEMPLATE, data);

      expect($("form").attr("method")).toBe("post");
      const radios = $("input[type='radio'][name='confirmDelete']");
      expect(radios).toHaveLength(2);
      const radioValues = radios.map((_, el) => $(el).attr("value")).get();
      expect(radioValues).toEqual(["yes", "no"]);
    });

    it("should render the confirm button and cancel link", () => {
      const data = { ...en, listTypeName: LIST_TYPE_NAME, data: {} };

      const { $ } = render(env, TEMPLATE, data);

      expect($("button.govuk-button").text().trim()).toBe(en.confirmButton);
      const cancelLink = $('a[href="/view-list-types"]');
      expect(cancelLink).toHaveLength(1);
      expect(cancelLink.text().trim()).toBe(en.cancelLink);
    });

    it("should pre-select the previously chosen radio from data", () => {
      const data = { ...en, listTypeName: LIST_TYPE_NAME, data: { confirmDelete: "yes" } };

      const { $ } = render(env, TEMPLATE, data);

      expect($("input[type='radio'][value='yes']").is(":checked")).toBe(true);
      expect($("input[type='radio'][value='no']").is(":checked")).toBe(false);
    });

    it("should not render an error summary when there are no errors", () => {
      const data = { ...en, listTypeName: LIST_TYPE_NAME, data: {} };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render an error summary when a confirmation error exists", () => {
      const data = {
        ...en,
        errorSummaryTitle: en.common.errorSummaryTitle,
        listTypeName: LIST_TYPE_NAME,
        data: {},
        errors: [{ text: en.errorConfirmationRequired, href: "#confirmDelete" }]
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorConfirmationRequired]);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and controls", () => {
      const data = { ...cy, listTypeName: LIST_TYPE_NAME, data: {} };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-xl").text().trim()).toBe(cy.title);
      expect($("button.govuk-button").text().trim()).toBe(cy.confirmButton);
      expect($('a[href="/view-list-types"]').text().trim()).toBe(cy.cancelLink);
    });

    it("should render the Welsh error summary", () => {
      const data = {
        ...cy,
        errorSummaryTitle: cy.common.errorSummaryTitle,
        listTypeName: LIST_TYPE_NAME,
        data: {},
        errors: [{ text: cy.errorCannotDelete, href: "#confirmDelete" }]
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.errorCannotDelete]);
    });
  });
});
