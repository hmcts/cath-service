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

const TEMPLATE = "(public)/view-option/index.njk";

describe("view-option template", () => {
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

  describe("English locale", () => {
    it("should have required title", () => {
      expect(en.title).toBe("What do you want to do?");
    });

    it("should have error summary title", () => {
      expect(en.errorSummaryTitle).toBe("There is a problem");
    });

    it("should have error message", () => {
      expect(en.errorMessage).toBe("An option must be selected");
    });

    it("should have court tribunal option", () => {
      expect(en.courtTribunalLabel).toBe("<strong>Find a court or tribunal</strong>");
      expect(en.courtTribunalHint).toBeDefined();
      expect(en.courtTribunalHint.length).toBeGreaterThan(0);
    });

    it("should have sjp case option", () => {
      expect(en.sjpCaseLabel).toBe("<strong>Find a Single Justice Procedure case</strong>");
      expect(en.sjpCaseHint).toBeDefined();
      expect(en.sjpCaseHint.length).toBeGreaterThan(0);
    });

    it("should have continue button text", () => {
      expect(en.continueButton).toBe("Continue");
    });
  });

  describe("Welsh locale", () => {
    it("should have required title", () => {
      expect(cy.title).toBe("Beth ydych chi eisiau ei wneud?");
    });

    it("should have error summary title", () => {
      expect(cy.errorSummaryTitle).toBe("Mae problem");
    });

    it("should have error message", () => {
      expect(cy.errorMessage).toBe("Rhaid dewis opsiwn");
    });

    it("should have court tribunal option", () => {
      expect(cy.courtTribunalLabel).toBe("<strong>Dod o hyd i lys neu dribiwnlys</strong>");
      expect(cy.courtTribunalHint).toBeDefined();
      expect(cy.courtTribunalHint.length).toBeGreaterThan(0);
    });

    it("should have sjp case option", () => {
      expect(cy.sjpCaseLabel).toBe("<strong>Dod o hyd i achos Gweithdrefn Un Ynad</strong>");
      expect(cy.sjpCaseHint).toBeDefined();
      expect(cy.sjpCaseHint.length).toBeGreaterThan(0);
    });

    it("should have continue button text", () => {
      expect(cy.continueButton).toBe("Parhau");
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
        "courtTribunalLabel",
        "courtTribunalHint",
        "sjpCaseLabel",
        "sjpCaseHint",
        "continueButton"
      ];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });
  });

  describe("English rendering", () => {
    it("should render the page heading as the fieldset legend", () => {
      // Arrange
      const data = { ...en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.title);
    });

    it("should render both radio options with hints", () => {
      // Arrange
      const data = { ...en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const radios = $("input[type='radio'][name='viewOption']");
      expect(radios).toHaveLength(2);
      expect($("input[value='court-tribunal']")).toHaveLength(1);
      expect($("input[value='sjp-case']")).toHaveLength(1);
      expect($(".govuk-hint").text()).toContain(en.courtTribunalHint);
      expect($(".govuk-hint").text()).toContain(en.sjpCaseHint);
    });

    it("should render the radio labels as HTML", () => {
      // Arrange
      const data = { ...en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("label strong").text()).toContain("Find a court or tribunal");
      expect($("label strong").text()).toContain("Find a Single Justice Procedure case");
    });

    it("should render the continue button", () => {
      // Arrange
      const data = { ...en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-button").text()).toContain(en.continueButton);
    });

    it("should render the form posting to itself", () => {
      // Arrange
      const data = { ...en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const form = $("form");
      expect(form).toHaveLength(1);
      expect(form.attr("method")).toBe("post");
    });

    it("should not render an error summary when there are no errors", () => {
      // Arrange
      const data = { ...en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });
  });

  describe("Welsh rendering", () => {
    it("should render the Welsh heading and button", () => {
      // Arrange
      const data = { ...cy };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.title);
      expect($(".govuk-button").text()).toContain(cy.continueButton);
    });
  });

  describe("Error state rendering", () => {
    it("should render the error summary with the validation message", () => {
      // Arrange
      const data = {
        ...en,
        errors: [{ text: en.errorMessage, href: "#viewOption" }]
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [en.errorMessage]);
      expect($(".govuk-form-group--error")).toHaveLength(1);
    });
  });
});
