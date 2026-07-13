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

const TEMPLATE = "(system-admin)/delete-court/index.njk";

describe("delete-court template", () => {
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

  describe("English rendering", () => {
    it("should render the page heading", () => {
      // Arrange
      const data = { ...en, errors: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.pageTitle);
    });

    it("should render the court search form field and continue button", () => {
      // Arrange
      const data = { ...en, errors: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("form[method='post']")).toHaveLength(1);
      expect($("input#court-search[name='locationId']")).toHaveLength(1);
      expect($("label[for='court-search']").text()).toContain(en.courtNameLabel);
      expect($("button.govuk-button").text()).toContain(en.continueButtonText);
    });

    it("should not render an error summary when there are no errors", () => {
      // Arrange
      const data = { ...en, errors: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });

    it("should render an error summary and inline error when errors are present", () => {
      // Arrange
      const data = {
        ...en,
        errors: [{ text: en.courtNameRequired, href: "#court-search" }]
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [en.courtNameRequired]);
      expect($(".govuk-form-group--error label[for='court-search']")).toHaveLength(1);
      expect($("#court-search-error").text()).toContain(en.courtNameRequired);
      expect($("input#court-search").hasClass("govuk-input--error")).toBe(true);
    });
  });

  describe("Welsh rendering", () => {
    it("should render the Welsh heading, label and button", () => {
      // Arrange
      const data = { ...cy, errors: undefined };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.pageTitle);
      expect($("label[for='court-search']").text()).toContain(cy.courtNameLabel);
      expect($("button.govuk-button").text()).toContain(cy.continueButtonText);
    });

    it("should render a Welsh error summary when errors are present", () => {
      // Arrange
      const data = {
        ...cy,
        errors: [{ text: cy.courtNameRequired, href: "#court-search" }]
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [cy.courtNameRequired]);
    });
  });

  describe("English locale", () => {
    it("should have required properties", () => {
      expect(en).toHaveProperty("pageTitle");
      expect(en).toHaveProperty("courtNameLabel");
      expect(en).toHaveProperty("continueButtonText");
      expect(en).toHaveProperty("errorSummaryTitle");
      expect(en).toHaveProperty("courtNameRequired");
      expect(en).toHaveProperty("courtNotFound");
    });

    it("should have correct page title", () => {
      expect(en.pageTitle).toBe("Find the court to remove");
    });

    it("should have correct form labels", () => {
      expect(en.courtNameLabel).toBe("Court or tribunal name");
      expect(en.continueButtonText).toBe("Continue");
    });

    it("should have correct error messages", () => {
      expect(en.errorSummaryTitle).toBe("There is a problem");
      expect(en.courtNameRequired).toBe("Enter a court or tribunal name");
      expect(en.courtNotFound).toBe("Court or tribunal not found");
    });

    it("should have all text as non-empty strings", () => {
      Object.values(en).forEach((value) => {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Welsh locale", () => {
    it("should have required properties", () => {
      expect(cy).toHaveProperty("pageTitle");
      expect(cy).toHaveProperty("courtNameLabel");
      expect(cy).toHaveProperty("continueButtonText");
      expect(cy).toHaveProperty("errorSummaryTitle");
      expect(cy).toHaveProperty("courtNameRequired");
      expect(cy).toHaveProperty("courtNotFound");
    });

    it("should have correct page title", () => {
      expect(cy.pageTitle).toBe("Dod o hyd i'r llys i'w ddileu");
    });

    it("should have correct form labels", () => {
      expect(cy.courtNameLabel).toBe("Enw'r llys neu'r tribiwnlys");
      expect(cy.continueButtonText).toBe("Dewiswch opsiwn");
    });

    it("should have correct error messages", () => {
      expect(cy.errorSummaryTitle).toBe("Mae yna broblem");
      expect(cy.courtNameRequired).toBe("Rhowch enw'r llys neu'r tribiwnlys");
      expect(cy.courtNotFound).toBe("Heb ddod o hyd i'r llys neu'r tribiwnlys");
    });

    it("should have all text as non-empty strings", () => {
      Object.values(cy).forEach((value) => {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it("should have same structure as English locale", () => {
      expect(Object.keys(cy).sort()).toEqual(Object.keys(en).sort());
    });
  });
});
