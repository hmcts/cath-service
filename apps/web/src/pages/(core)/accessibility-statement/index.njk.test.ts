import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import { accessibilityStatementCy as cy, accessibilityStatementEn as en } from "@hmcts/web-core";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(core)/accessibility-statement/index.njk";

describe("accessibility-statement template", () => {
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

  describe("Template rendering", () => {
    it("should render the English heading and section headings", () => {
      // Arrange
      const data = { ...en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.title);
      const headingText = $("h2, h3, h4")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headingText).toContain(en.sections.howAccessible.heading);
      expect(headingText).toContain(en.sections.feedback.heading);
      expect(headingText).toContain(en.sections.compliance.heading);
    });

    it("should render the accessibility feature bullet list in English", () => {
      // Arrange
      const data = { ...en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const bulletText = $("ul.govuk-list--bullet li")
        .map((_, el) => $(el).text().trim())
        .get();
      for (const feature of en.sections.intro.features) {
        expect(bulletText).toContain(feature);
      }
    });

    it("should render external links with their hrefs", () => {
      // Arrange
      const data = { ...en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(`a[href="${en.sections.intro.abilityNetUrl}"]`).text()).toContain(en.sections.intro.abilityNetLink);
      expect($(`a[href="${en.sections.enforcement.eassUrl}"]`).text()).toContain(en.sections.enforcement.eassLinkText);
      expect($(`a[href="${en.sections.compliance.wcagUrl}"]`).text()).toContain(en.sections.compliance.wcagLinkText);
    });

    it("should render the back to top link", () => {
      // Arrange
      const data = { ...en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("p.back-to-top-link a").text()).toContain(en.backToTop);
    });

    it("should render Welsh heading and content", () => {
      // Arrange
      const data = { ...cy };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.title);
      expect($("p.back-to-top-link a").text()).toContain(cy.backToTop);
      const bulletText = $("ul.govuk-list--bullet li")
        .map((_, el) => $(el).text().trim())
        .get();
      for (const feature of cy.sections.intro.features) {
        expect(bulletText).toContain(feature);
      }
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      // Assert
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have same section keys in English and Welsh", () => {
      // Assert
      expect(Object.keys(en.sections).sort()).toEqual(Object.keys(cy.sections).sort());
    });

    it("should have same number of accessibility features", () => {
      // Assert
      expect(en.sections.intro.features.length).toBe(cy.sections.intro.features.length);
    });
  });
});
