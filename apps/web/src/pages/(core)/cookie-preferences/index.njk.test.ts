import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import { cookiePreferencesCy as cy, cookiePreferencesEn as en } from "@hmcts/web-core";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const categories = {
  essential: ["session_id", "csrf_token"],
  analytics: ["_ga", "_gid"],
  preferences: ["language"]
};

describe("cookie-preferences template", () => {
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

  describe("English rendering", () => {
    it("should render the page heading, intro and section titles", () => {
      // Arrange
      const data = { ...en, categories, cookiePreferences: {}, saved: false };

      // Act
      const { $ } = render(env, "(core)/cookie-preferences/index.njk", data);

      // Assert
      expect($("h1").text()).toContain(en.title);
      expect($("p.govuk-body").first().text()).toContain(en.intro);
      expect($("body").text()).toContain(en.essentialTitle);
      expect($("body").text()).toContain(en.analyticsTitle);
      expect($("body").text()).toContain(en.preferencesTitle);
    });

    it("should render the form posting to /cookie-preferences with a save button", () => {
      // Arrange
      const data = { ...en, categories, cookiePreferences: {}, saved: false };

      // Act
      const { $ } = render(env, "(core)/cookie-preferences/index.njk", data);

      // Assert
      const form = $("form.cookie-preferences-form");
      expect(form.attr("action")).toBe("/cookie-preferences");
      expect(form.attr("method")).toBe("POST");
      expect($("button[type='submit']").text()).toContain(en.saveButton);
    });

    it("should render analytics and preferences radio inputs", () => {
      // Arrange
      const data = { ...en, categories, cookiePreferences: {}, saved: false };

      // Act
      const { $ } = render(env, "(core)/cookie-preferences/index.njk", data);

      // Assert
      expect($("#analytics-yes")).toHaveLength(1);
      expect($("#analytics-no")).toHaveLength(1);
      expect($("#preferences-yes")).toHaveLength(1);
      expect($("#preferences-no")).toHaveLength(1);
    });

    it("should check the 'yes' radios reflecting saved preferences", () => {
      // Arrange
      const data = {
        ...en,
        categories,
        cookiePreferences: { analytics: true, preferences: false },
        saved: false
      };

      // Act
      const { $ } = render(env, "(core)/cookie-preferences/index.njk", data);

      // Assert
      expect($("#analytics-yes").is("[checked]")).toBe(true);
      expect($("#analytics-no").is("[checked]")).toBe(false);
      expect($("#preferences-yes").is("[checked]")).toBe(false);
      expect($("#preferences-no").is("[checked]")).toBe(true);
    });

    it("should not render the success banner when not saved", () => {
      // Arrange
      const data = { ...en, categories, cookiePreferences: {}, saved: false };

      // Act
      const { $ } = render(env, "(core)/cookie-preferences/index.njk", data);

      // Assert
      expect($(".govuk-notification-banner--success")).toHaveLength(0);
    });

    it("should render the success banner when saved", () => {
      // Arrange
      const data = { ...en, categories, cookiePreferences: {}, saved: true };

      // Act
      const { $ } = render(env, "(core)/cookie-preferences/index.njk", data);

      // Assert
      const banner = $(".govuk-notification-banner--success");
      expect(banner).toHaveLength(1);
      expect(banner.text()).toContain(en.successBanner);
      expect(banner.text()).toContain(en.successMessage);
    });

    it("should not render an error summary", () => {
      // Arrange
      const data = { ...en, categories, cookiePreferences: {}, saved: false };

      // Act
      const { $ } = render(env, "(core)/cookie-preferences/index.njk", data);

      // Assert
      assertNoErrors($);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh heading and radio labels", () => {
      // Arrange
      const data = { ...cy, categories, cookiePreferences: {}, saved: false };

      // Act
      const { $ } = render(env, "(core)/cookie-preferences/index.njk", data);

      // Assert
      expect($("h1").text()).toContain(cy.title);
      expect($("label[for='analytics-yes']").text()).toContain(cy.useAnalytics);
      expect($("label[for='preferences-no']").text()).toContain(cy.doNotUsePreferences);
      expect($("button[type='submit']").text()).toContain(cy.saveButton);
    });
  });
});
