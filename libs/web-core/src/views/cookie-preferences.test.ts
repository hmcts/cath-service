import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cy, en } from "../locales/cookie-preferences.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("cookie-preferences template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "cookie-preferences.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required title", () => {
      expect(en.title).toBe("Cookie preferences");
    });

    it("should have intro text", () => {
      expect(en.intro).toBeDefined();
      expect(en.intro.length).toBeGreaterThan(0);
    });

    it("should have essential cookies section", () => {
      expect(en.essentialTitle).toBeDefined();
      expect(en.essentialDescription).toBeDefined();
    });

    it("should have analytics cookies section", () => {
      expect(en.analyticsTitle).toBeDefined();
      expect(en.analyticsDescription).toBeDefined();
      expect(en.useAnalytics).toBeDefined();
      expect(en.doNotUseAnalytics).toBeDefined();
    });

    it("should have preferences cookies section", () => {
      expect(en.preferencesTitle).toBeDefined();
      expect(en.preferencesDescription).toBeDefined();
      expect(en.usePreferences).toBeDefined();
      expect(en.doNotUsePreferences).toBeDefined();
    });

    it("should have save button text", () => {
      expect(en.saveButton).toBeDefined();
    });

    it("should have success messages", () => {
      expect(en.successBanner).toBeDefined();
      expect(en.successMessage).toBeDefined();
    });
  });

  describe("Welsh locale", () => {
    it("should have required title", () => {
      expect(cy.title).toBe("Dewisiadau cwcis");
    });

    it("should have intro text", () => {
      expect(cy.intro).toBeDefined();
      expect(cy.intro.length).toBeGreaterThan(0);
    });

    it("should have essential cookies section", () => {
      expect(cy.essentialTitle).toBeDefined();
      expect(cy.essentialDescription).toBeDefined();
    });

    it("should have analytics cookies section", () => {
      expect(cy.analyticsTitle).toBeDefined();
      expect(cy.analyticsDescription).toBeDefined();
      expect(cy.useAnalytics).toBeDefined();
      expect(cy.doNotUseAnalytics).toBeDefined();
    });

    it("should have preferences cookies section", () => {
      expect(cy.preferencesTitle).toBeDefined();
      expect(cy.preferencesDescription).toBeDefined();
      expect(cy.usePreferences).toBeDefined();
      expect(cy.doNotUsePreferences).toBeDefined();
    });

    it("should have save button text", () => {
      expect(cy.saveButton).toBeDefined();
    });

    it("should have success messages", () => {
      expect(cy.successBanner).toBeDefined();
      expect(cy.successMessage).toBeDefined();
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });
  });
});
