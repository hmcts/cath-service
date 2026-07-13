import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("password-reset-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the title in the confirmation panel", () => {
      // Arrange
      const data = { title: en.title, signInLink: en.signInLink };

      // Act
      const { $ } = render(env, "(auth)/password-reset-success/index.njk", data);

      // Assert
      const panel = $(".govuk-panel--confirmation");
      expect(panel.length).toBe(1);
      expect(panel.find("h1").text()).toContain(en.title);
    });

    it("should render the sign in link pointing to /sign-in", () => {
      // Arrange
      const data = { title: en.title, signInLink: en.signInLink };

      // Act
      const { $ } = render(env, "(auth)/password-reset-success/index.njk", data);

      // Assert
      const link = $('.govuk-body a[href="/sign-in"]');
      expect(link.length).toBe(1);
      expect(link.text()).toContain(en.signInLink);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh title and sign in link", () => {
      // Arrange
      const data = { title: cy.title, signInLink: cy.signInLink };

      // Act
      const { $ } = render(env, "(auth)/password-reset-success/index.njk", data);

      // Assert
      expect($(".govuk-panel--confirmation h1").text()).toContain(cy.title);
      expect($('.govuk-body a[href="/sign-in"]').text()).toContain(cy.signInLink);
    });
  });
});
