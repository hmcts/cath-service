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

  describe("English render", () => {
    it("should render the page heading and section headings", () => {
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

    it("should render the accessibility feature bullet list", () => {
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
  });

  describe("Welsh render", () => {
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

  describe("English locale", () => {
    it("should have required title", () => {
      expect(en.title).toBe("Accessibility statement");
    });

    it("should have back to top text", () => {
      expect(en.backToTop).toBe("Back to top");
    });

    it("should have intro section", () => {
      expect(en.sections.intro).toBeDefined();
      expect(en.sections.intro.content).toBeDefined();
      expect(en.sections.intro.commitment).toBeDefined();
      expect(en.sections.intro.features).toBeInstanceOf(Array);
    });

    it("should have contact information", () => {
      expect(en.sections.feedback.contact.name).toBeDefined();
      expect(en.sections.feedback.contact.email).toBeDefined();
      expect(en.sections.feedback.contact.phone).toBeDefined();
      expect(en.sections.feedback.textRelay).toBeDefined();
      expect(en.sections.feedback.audioLoops).toBeDefined();
    });

    it("should have compliance section", () => {
      expect(en.sections.compliance.heading).toBeDefined();
      expect(en.sections.compliance.content).toBeDefined();
    });
  });

  describe("Welsh locale", () => {
    it("should have required title", () => {
      expect(cy.title).toBe("Datganiad hygyrchedd");
    });

    it("should have back to top text", () => {
      expect(cy.backToTop).toBe("Yn ôl i frig y dudalen");
    });

    it("should have intro section", () => {
      expect(cy.sections.intro).toBeDefined();
      expect(cy.sections.intro.content).toBeDefined();
      expect(cy.sections.intro.commitment).toBeDefined();
      expect(cy.sections.intro.features).toBeInstanceOf(Array);
    });

    it("should have contact information", () => {
      expect(cy.sections.feedback.contact.name).toBeDefined();
      expect(cy.sections.feedback.contact.email).toBeDefined();
      expect(cy.sections.feedback.contact.phone).toBeDefined();
      expect(cy.sections.feedback.textRelay).toBeDefined();
      expect(cy.sections.feedback.audioLoops).toBeDefined();
    });

    it("should have compliance section", () => {
      expect(cy.sections.compliance.heading).toBeDefined();
      expect(cy.sections.compliance.content).toBeDefined();
    });
  });

  describe("Locale consistency", () => {
    it("should have same structure in English and Welsh", () => {
      expect(Object.keys(en.sections)).toEqual(Object.keys(cy.sections));
    });

    it("should have same number of accessibility features", () => {
      expect(en.sections.intro.features.length).toBe(cy.sections.intro.features.length);
    });
  });
});
