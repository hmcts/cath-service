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

  describe("Template rendering", () => {
    it("should render the English heading, intro and section titles", () => {
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

    it("should check the radios reflecting saved preferences", () => {
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

    it("should not render the success banner or an error summary when not saved", () => {
      // Arrange
      const data = { ...en, categories, cookiePreferences: {}, saved: false };

      // Act
      const { $ } = render(env, "(core)/cookie-preferences/index.njk", data);

      // Assert
      expect($(".govuk-notification-banner--success")).toHaveLength(0);
      assertNoErrors($);
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

    it("should render Welsh heading, radio labels and save button", () => {
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

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = [
        "title",
        "intro",
        "essentialTitle",
        "essentialDescription",
        "analyticsTitle",
        "analyticsDescription",
        "useAnalytics",
        "doNotUseAnalytics",
        "preferencesTitle",
        "preferencesDescription",
        "usePreferences",
        "doNotUsePreferences",
        "saveButton",
        "successBanner",
        "successMessage"
      ];

      for (const key of requiredKeys) {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      }
    });
  });
});
