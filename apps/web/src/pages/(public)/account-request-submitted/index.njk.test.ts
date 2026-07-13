import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("account-request-submitted template", () => {
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

  describe("Rendering", () => {
    it("should render the confirmation panel and body text in English", () => {
      // Arrange
      const data = { ...en, locale: "en" };

      // Act
      const { $ } = render(env, "(public)/account-request-submitted/index.njk", data);

      // Assert
      expect($(".govuk-panel__title").text()).toContain(en.bannerTitle);
      expect($("h2").text()).toContain(en.sectionTitle);
      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(en.bodyText1);
      expect(bodyText).toContain(en.bodyText2);
      expect(bodyText).toContain(en.bodyText3);
    });

    it("should render the confirmation panel and body text in Welsh", () => {
      // Arrange
      const data = { ...cy, locale: "cy" };

      // Act
      const { $ } = render(env, "(public)/account-request-submitted/index.njk", data);

      // Assert
      expect($(".govuk-panel__title").text()).toContain(cy.bannerTitle);
      expect($("h2").text()).toContain(cy.sectionTitle);
      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(cy.bodyText1);
      expect(bodyText).toContain(cy.bodyText2);
      expect(bodyText).toContain(cy.bodyText3);
    });

    it("should render three body paragraphs", () => {
      // Arrange
      const data = { ...en, locale: "en" };

      // Act
      const { $ } = render(env, "(public)/account-request-submitted/index.njk", data);

      // Assert
      expect($(".govuk-body")).toHaveLength(3);
    });

    it("should not render a back link", () => {
      // Arrange
      const data = { ...en, locale: "en" };

      // Act
      const { $ } = render(env, "(public)/account-request-submitted/index.njk", data);

      // Assert
      expect($(".govuk-back-link")).toHaveLength(0);
    });
  });

  describe("English locale", () => {
    it("should have banner title", () => {
      expect(en.bannerTitle).toBe("Details submitted");
    });

    it("should have section title", () => {
      expect(en.sectionTitle).toBe("What happens next");
    });

    it("should have body text", () => {
      expect(en.bodyText1).toBe("HMCTS will review your details.");
      expect(en.bodyText2).toContain("email you");
      expect(en.bodyText3).toContain("5 working days");
      expect(en.bodyText3).toContain("0300 303 0656");
    });
  });

  describe("Welsh locale", () => {
    it("should have banner title", () => {
      expect(cy.bannerTitle).toBe("Cyflwyno manylion");
    });

    it("should have section title", () => {
      expect(cy.sectionTitle).toBe("Beth sy'n digwydd nesaf");
    });

    it("should have body text", () => {
      expect(cy.bodyText1).toBe("Bydd GLlTEM yn adolygu eich manylion.");
      expect(cy.bodyText2).toContain("e-bost");
      expect(cy.bodyText3).toContain("5 diwrnod gwaith");
      expect(cy.bodyText3).toContain("0300 303 0656");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = ["bannerTitle", "sectionTitle", "bodyText1", "bodyText2", "bodyText3"];

      for (const key of requiredKeys) {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      }
    });
  });
});
