import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/create-third-party-user/index.njk";

const buildData = (content: typeof en, overrides: Record<string, unknown> = {}) => ({
  ...content,
  errors: undefined,
  name: "",
  ...overrides
});

describe("create-third-party-user template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.pageTitle);
    });

    it("should render the name input with its label", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("input#name")).toHaveLength(1);
      expect($('label[for="name"]').text().trim()).toContain(en.nameLabel);
    });

    it("should render the continue button", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("button.govuk-button").text()).toContain(en.continueButtonText);
    });

    it("should preserve the submitted name value in the input", () => {
      // Arrange
      const data = buildData(en, { name: "Test User" });

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("input#name").attr("value")).toBe("Test User");
    });

    it("should not render an error summary when there are no errors", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading, label and button", () => {
      // Arrange
      const data = buildData(cy);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.pageTitle);
      expect($('label[for="name"]').text().trim()).toContain(cy.nameLabel);
      expect($("button.govuk-button").text()).toContain(cy.continueButtonText);
    });
  });

  describe("Error states", () => {
    it("should render the error summary and inline field message", () => {
      // Arrange
      const errors = [{ text: en.nameRequired, href: "#name" }];
      const data = buildData(en, { errors });

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [en.nameRequired]);
      expect($("#name-error").text()).toContain(en.nameRequired);
    });
  });
});
