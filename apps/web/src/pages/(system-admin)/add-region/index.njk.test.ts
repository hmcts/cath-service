import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/add-region/index.njk";

describe("add-region template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      // Arrange
      const data = { ...en, data: { name: "", welshName: "" }, errors: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1.govuk-heading-xl").text().trim()).toBe(en.pageTitle);
    });

    it("should render both name inputs with labels and hints", () => {
      // Arrange
      const data = { ...en, data: { name: "", welshName: "" }, errors: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
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
      // Arrange
      const data = { ...en, data: { name: "", welshName: "" }, errors: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const form = $("form");
      expect(form.attr("method")).toBe("post");
      expect(form.attr("novalidate")).toBeDefined();
      expect($("button.govuk-button").text().trim()).toBe(en.saveButtonText);
    });

    it("should populate inputs with existing data values", () => {
      // Arrange
      const data = { ...en, data: { name: "London", welshName: "Llundain" }, errors: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("#name").attr("value")).toBe("London");
      expect($("#welshName").attr("value")).toBe("Llundain");
    });

    it("should not render an error summary when there are no errors", () => {
      // Arrange
      const data = { ...en, data: { name: "", welshName: "" }, errors: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });

    it("should render the error summary and field error when errors exist", () => {
      // Arrange
      const errors = [
        { text: "Enter region name in English", href: "#name" },
        { text: "Enter region name in Welsh", href: "#welshName" }
      ];
      const data = { ...en, data: { name: "", welshName: "" }, errors };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, ["Enter region name in English", "Enter region name in Welsh"]);
      expect($(".govuk-error-summary__title").text().trim()).toBe(en.errorSummaryTitle);
      expect($("#name").closest(".govuk-form-group").hasClass("govuk-form-group--error")).toBe(true);
      expect($("#name-error").text()).toContain("Enter region name in English");
      expect($("#welshName-error").text()).toContain("Enter region name in Welsh");
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading, labels and button", () => {
      // Arrange
      const data = { ...cy, data: { name: "", welshName: "" }, errors: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1.govuk-heading-xl").text().trim()).toBe(cy.pageTitle);
      expect($('label[for="name"]').text().trim()).toBe(cy.nameLabel);
      expect($('label[for="welshName"]').text().trim()).toBe(cy.welshNameLabel);
      expect($("button.govuk-button").text().trim()).toBe(cy.saveButtonText);
    });

    it("should render the Welsh error summary title", () => {
      // Arrange
      const errors = [{ text: cy.databaseError, href: "#name" }];
      const data = { ...cy, data: { name: "", welshName: "" }, errors };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [cy.databaseError]);
      expect($(".govuk-error-summary__title").text().trim()).toBe(cy.errorSummaryTitle);
    });
  });
});
