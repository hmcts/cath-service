import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_NAME = "Court and tribunal hearings";

describe("index template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    const webCoreViews = path.resolve(__dirname, "../../../../libs/web-core/src/views");

    env = createTestEnvironment([__dirname, webCoreViews]);
  });

  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Template rendering", () => {
    it("should render the service name as the page heading", () => {
      // Arrange
      const data = { ...en, serviceName: SERVICE_NAME, otherLocale: "cy" };

      // Act
      const { $ } = render(env, "index.njk", data);

      // Assert
      expect($("h1").text()).toContain(SERVICE_NAME);
    });

    it("should render every English hearings list item as a bullet", () => {
      // Arrange
      const data = { ...en, serviceName: SERVICE_NAME, otherLocale: "cy" };

      // Act
      const { $ } = render(env, "index.njk", data);

      // Assert
      const bulletText = $(".govuk-list--bullet")
        .first()
        .find("li")
        .map((_, el) => $(el).text().trim())
        .get();
      for (const item of en.hearingsList) {
        expect(bulletText).toContain(item);
      }
    });

    it("should render the start button linking to the view option page", () => {
      // Arrange
      const data = { ...en, serviceName: SERVICE_NAME, otherLocale: "cy" };

      // Act
      const { $ } = render(env, "index.njk", data);

      // Assert
      const startButton = $("a.govuk-button--start");
      expect(startButton.attr("href")).toBe("/view-option");
      expect(startButton.text()).toContain(en.continueButton);
    });

    it("should render the sign in link", () => {
      // Arrange
      const data = { ...en, serviceName: SERVICE_NAME, otherLocale: "cy" };

      // Act
      const { $ } = render(env, "index.njk", data);

      // Assert
      const signInLink = $('a[href="/sign-in"]');
      expect(signInLink.text()).toBe(en.signInLink);
    });

    it("should render the Welsh language switch link", () => {
      // Arrange
      const data = { ...en, serviceName: SERVICE_NAME, otherLocale: "cy" };

      // Act
      const { $ } = render(env, "index.njk", data);

      // Assert
      const switchLink = $('a[href="?lng=cy"]');
      expect(switchLink.text()).toBe(en.welshAvailableLink);
      expect(switchLink.attr("lang")).toBe("cy");
    });

    it("should render the external fact and jurisdiction links", () => {
      // Arrange
      const data = { ...en, serviceName: SERVICE_NAME, otherLocale: "cy" };

      // Act
      const { $ } = render(env, "index.njk", data);

      // Assert
      expect($(`a[href="${en.factLinkUrl}"]`).text()).toBe(en.factLinkText);
      expect($(`a[href="${en.scottishCourtsUrl}"]`).text()).toBe(en.scottishCourtsLink);
      expect($(`a[href="${en.niCourtsUrl}"]`).text()).toBe(en.niCourtsLink);
    });

    it("should render section headings", () => {
      // Arrange
      const data = { ...en, serviceName: SERVICE_NAME, otherLocale: "cy" };

      // Act
      const { $ } = render(env, "index.njk", data);

      // Assert
      const headingText = $("h2, h3")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headingText).toContain(en.factSectionTitle);
      expect(headingText).toContain(en.beforeYouStartTitle);
      expect(headingText).toContain(en.scotlandNorthernIrelandTitle);
    });

    it("should not render an error summary", () => {
      // Arrange
      const data = { ...en, serviceName: SERVICE_NAME, otherLocale: "cy" };

      // Act
      const { $ } = render(env, "index.njk", data);

      // Assert
      assertNoErrors($);
    });

    it("should render Welsh hearings list items and continue button", () => {
      // Arrange
      const data = { ...cy, serviceName: SERVICE_NAME, otherLocale: "en" };

      // Act
      const { $ } = render(env, "index.njk", data);

      // Assert
      const bulletText = $(".govuk-list--bullet")
        .first()
        .find("li")
        .map((_, el) => $(el).text().trim())
        .get();
      for (const item of cy.hearingsList) {
        expect(bulletText).toContain(item);
      }
      expect($("a.govuk-button--start").text()).toContain(cy.continueButton);
    });

    it("should render the English language switch link", () => {
      // Arrange
      const data = { ...cy, serviceName: SERVICE_NAME, otherLocale: "en" };

      // Act
      const { $ } = render(env, "index.njk", data);

      // Assert
      const switchLink = $('a[href="?lng=en"]');
      expect(switchLink.text()).toBe(cy.welshAvailableLink);
      expect(switchLink.attr("lang")).toBe("en");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      // Assert
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      // Arrange
      const requiredKeys = ["hearingsList", "additionalInfo", "signInText", "signInLink", "welshAvailableText", "welshAvailableLink", "continueButton"];

      // Assert
      for (const key of requiredKeys) {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      }
    });
  });
});
