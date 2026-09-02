import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/add-jurisdiction/index.njk";

describe("add-jurisdiction template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = { ...en, data: { name: "", welshName: "" }, errors: undefined };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-xl").text().trim()).toBe(en.pageTitle);
    });

    it("should render both name inputs with labels and hints", () => {
      const data = { ...en, data: { name: "", welshName: "" }, errors: undefined };

      const { $ } = render(env, TEMPLATE, data);

      const nameInput = $("#name");
      expect(nameInput).toHaveLength(1);
      expect(nameInput.attr("name")).toBe("name");
      expect($('label[for="name"]').text().trim()).toBe(en.nameLabel);
      expect($("#name-hint").text().trim()).toBe(en.nameHint);

      const welshNameInput = $("#welshName");
      expect(welshNameInput).toHaveLength(1);
      expect(welshNameInput.attr("name")).toBe("welshName");
      expect($('label[for="welshName"]').text().trim()).toBe(en.welshNameLabel);
      expect($("#welshName-hint").text().trim()).toBe(en.welshNameHint);
    });

    it("should render the form and save button", () => {
      const data = { ...en, data: { name: "", welshName: "" }, errors: undefined };

      const { $ } = render(env, TEMPLATE, data);

      const form = $("form");
      expect(form.attr("method")).toBe("post");
      expect(form.attr("novalidate")).toBeDefined();
      expect($("button.govuk-button").text().trim()).toBe(en.saveButtonText);
    });

    it("should populate inputs with existing data values", () => {
      const data = { ...en, data: { name: "Civil", welshName: "Sifil" }, errors: undefined };

      const { $ } = render(env, TEMPLATE, data);

      expect($("#name").attr("value")).toBe("Civil");
      expect($("#welshName").attr("value")).toBe("Sifil");
    });

    it("should not render an error summary when there are no errors", () => {
      const data = { ...en, data: { name: "", welshName: "" }, errors: undefined };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render the error summary and field error when errors exist", () => {
      const errors = [
        { text: "Enter jurisdiction name in English", href: "#name" },
        { text: "Enter jurisdiction name in Welsh", href: "#welshName" }
      ];
      const data = { ...en, data: { name: "", welshName: "" }, errors };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, ["Enter jurisdiction name in English", "Enter jurisdiction name in Welsh"]);
      expect($(".govuk-error-summary__title").text().trim()).toBe(en.errorSummaryTitle);
      expect($("#name").closest(".govuk-form-group").hasClass("govuk-form-group--error")).toBe(true);
      expect($("#name-error").text()).toContain("Enter jurisdiction name in English");
      expect($("#welshName-error").text()).toContain("Enter jurisdiction name in Welsh");
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading, labels and button", () => {
      const data = { ...cy, data: { name: "", welshName: "" }, errors: undefined };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-xl").text().trim()).toBe(cy.pageTitle);
      expect($('label[for="name"]').text().trim()).toBe(cy.nameLabel);
      expect($('label[for="welshName"]').text().trim()).toBe(cy.welshNameLabel);
      expect($("button.govuk-button").text().trim()).toBe(cy.saveButtonText);
    });

    it("should render the Welsh error summary title", () => {
      const errors = [{ text: cy.databaseError, href: "#name" }];
      const data = { ...cy, data: { name: "", welshName: "" }, errors };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.databaseError]);
      expect($(".govuk-error-summary__title").text().trim()).toBe(cy.errorSummaryTitle);
    });
  });
});
