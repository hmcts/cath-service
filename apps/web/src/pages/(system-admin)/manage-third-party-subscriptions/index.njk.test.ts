import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/manage-third-party-subscriptions/index.njk";

const listTypes = [
  { id: 1, name: "CIVIL_DAILY_CAUSE_LIST", friendlyName: "Civil Daily Cause List", welshFriendlyName: "Rhestr Achos Dyddiol Sifil" },
  { id: 2, name: "CROWN_DAILY_LIST", friendlyName: "Crown Daily List", welshFriendlyName: "Rhestr Ddyddiol y Goron" }
];

describe("manage-third-party-subscriptions template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading and save button", () => {
      const data = { ...en, listTypes, currentListTypeIds: [], errors: undefined, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.pageTitle);
      expect($("button").text()).toContain(en.saveButtonText);
      assertNoErrors($);
    });

    it("should render a checkbox per list type using English friendly names", () => {
      const data = { ...en, listTypes, currentListTypeIds: [1], errors: undefined, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      const checkboxes = $("input[type='checkbox'][name='listTypes']");
      expect(checkboxes).toHaveLength(2);
      expect($(".govuk-fieldset__legend").text()).toContain(en.listTypesLabel);
      expect($.html()).toContain("Civil Daily Cause List");
      expect($.html()).toContain("Crown Daily List");
    });

    it("should pre-check checkboxes for current subscriptions", () => {
      const data = { ...en, listTypes, currentListTypeIds: [1], errors: undefined, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("input[type='checkbox'][value='1']").attr("checked")).toBeDefined();
      expect($("input[type='checkbox'][value='2']").attr("checked")).toBeUndefined();
    });

    it("should not render any checkboxes when there are no list types", () => {
      const data = { ...en, listTypes: [], currentListTypeIds: [], errors: undefined, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("input[type='checkbox'][name='listTypes']")).toHaveLength(0);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh page heading and Welsh friendly names", () => {
      const data = { ...cy, listTypes, currentListTypeIds: [], errors: undefined, locale: "cy" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.pageTitle);
      expect($("button").text()).toContain(cy.saveButtonText);
      expect($.html()).toContain("Rhestr Achos Dyddiol Sifil");
      expect($.html()).toContain("Rhestr Ddyddiol y Goron");
    });
  });

  describe("Error states", () => {
    it("should render an error summary when errors are present", () => {
      const data = { ...en, listTypes: undefined, currentListTypeIds: undefined, errors: [{ text: en.userNotFound }], locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.userNotFound]);
    });
  });
});
