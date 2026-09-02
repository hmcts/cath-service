import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import * as cy from "./cy.js";
import * as en from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/configure-list-type-select-sub-jurisdictions/index.njk";

const buildItems = () => [
  { value: "1", text: "England", checked: true },
  { value: "2", text: "Wales", checked: false }
];

describe("configure-list-type-select-sub-jurisdictions template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading and description", () => {
      const data = { t: en, items: buildItems() };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.configureListType.selectSubJurisdictions.title);
      expect($("p.govuk-body").text()).toContain(en.configureListType.selectSubJurisdictions.description);
    });

    it("should render a checkbox for each sub-jurisdiction with correct checked state", () => {
      const data = { t: en, items: buildItems() };

      const { $ } = render(env, TEMPLATE, data);

      const checkboxes = $('input[type="checkbox"][name="subJurisdictions"]');
      expect(checkboxes).toHaveLength(2);
      expect($('input[value="1"]').is(":checked")).toBe(true);
      expect($('input[value="2"]').is(":checked")).toBe(false);
      expect($(".govuk-checkboxes__label").text()).toContain("England");
      expect($(".govuk-checkboxes__label").text()).toContain("Wales");
    });

    it("should render the continue button", () => {
      const data = { t: en, items: buildItems() };

      const { $ } = render(env, TEMPLATE, data);

      expect($("button.govuk-button").text()).toContain(en.common.continue);
    });

    it("should not render an error summary when there are no errors", () => {
      const data = { t: en, items: buildItems() };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and description", () => {
      const data = { t: cy, items: buildItems() };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.configureListType.selectSubJurisdictions.title);
      expect($("p.govuk-body").text()).toContain(cy.configureListType.selectSubJurisdictions.description);
      expect($("button.govuk-button").text()).toContain(cy.common.continue);
    });
  });

  describe("Error state", () => {
    it("should render an error summary and inline error when validation fails", () => {
      const errorMessage = "Select at least one sub-jurisdiction";
      const data = {
        t: en,
        items: buildItems(),
        errors: { subJurisdictions: { text: errorMessage } },
        errorList: [{ text: errorMessage, href: "#subJurisdictions" }]
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [errorMessage]);
      expect($(".govuk-error-message").text()).toContain(errorMessage);
    });
  });
});
