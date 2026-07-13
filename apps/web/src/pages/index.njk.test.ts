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

  describe("English locale", () => {
    it("should have intro message text", () => {
      expect(en.introMessage).toBe("You can use this service to get information about:");
    });

    it("should have hearings list with 6 items", () => {
      expect(en.hearingsList).toBeDefined();
      expect(Array.isArray(en.hearingsList)).toBe(true);
      expect(en.hearingsList.length).toBe(6);
    });

    it("should have hearings list content", () => {
      expect(en.hearingsList[0]).toContain("Civil and Family Courts in England and Wales");
      expect(en.hearingsList[1]).toContain("First Tier and Upper Tribunals");
      expect(en.hearingsList[2]).toContain("Royal Courts of Justice");
      expect(en.hearingsList[3]).toContain("Crown Courts in England and Wales");
      expect(en.hearingsList[4]).toContain("Magistrates' Courts in England and Wales");
      expect(en.hearingsList[5]).toContain("Single Justice Procedure");
    });

    it("should have additional info text", () => {
      expect(en.additionalInfo).toBe("More courts and tribunals will become available over time.");
    });

    it("should have continue button text", () => {
      expect(en.continueButton).toBe("Continue");
    });

    it("should have sign in text", () => {
      expect(en.signInText).toBe("Legal and media professionals can");
      expect(en.signInLink).toBe("sign in");
    });

    it("should have Welsh availability text", () => {
      expect(en.welshAvailableText).toBe("This service is also available in");
      expect(en.welshAvailableLink).toBe("Welsh (Cymraeg)");
    });
  });

  describe("Welsh locale", () => {
    it("should have intro message text", () => {
      expect(cy.introMessage).toBe("Gallwch ddefnyddio'r gwasanaeth hwn i gael gwybodaeth am:");
    });

    it("should have hearings list with 6 items", () => {
      expect(cy.hearingsList).toBeDefined();
      expect(Array.isArray(cy.hearingsList)).toBe(true);
      expect(cy.hearingsList.length).toBe(6);
    });

    it("should have hearings list content", () => {
      expect(cy.hearingsList[0]).toContain("Llysoedd Sifil a'r Llysoedd Teulu");
      expect(cy.hearingsList[1]).toContain("Tribiwnlys Haen Gyntaf");
      expect(cy.hearingsList[2]).toContain("Llys Barn Brenhinol");
      expect(cy.hearingsList[3]).toContain("Llys y Goron");
      expect(cy.hearingsList[4]).toContain("Llysoedd Ynadon");
      expect(cy.hearingsList[5]).toContain("Gweithdrefn Un Ynad");
    });

    it("should have additional info text", () => {
      expect(cy.additionalInfo).toBe("Bydd mwy o lysoedd a thribiwnlysoedd ar gael gydag amser.");
    });

    it("should have continue button text", () => {
      expect(cy.continueButton).toBe("Parhau");
    });

    it("should have sign in text", () => {
      expect(cy.signInText).toBe("Gall gweithwyr proffesiynol ym maes y gyfraith a'r cyfryngau");
      expect(cy.signInLink).toBe("mewngofnodi");
    });

    it("should have English availability text", () => {
      expect(cy.welshAvailableText).toBe("Mae'r gwasanaeth hwn hefyd ar gael yn");
      expect(cy.welshAvailableLink).toBe("Saesneg (English)");
    });
  });

  describe("Locale consistency", () => {
    it("should have same structure in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have same number of hearings list items", () => {
      expect(en.hearingsList.length).toBe(cy.hearingsList.length);
    });

    it("should have all required properties", () => {
      const requiredProperties = [
        "introMessage",
        "hearingsList",
        "additionalInfo",
        "signInText",
        "signInLink",
        "welshAvailableText",
        "welshAvailableLink",
        "continueButton"
      ];

      requiredProperties.forEach((prop) => {
        expect(en).toHaveProperty(prop);
        expect(cy).toHaveProperty(prop);
      });
    });
  });

  describe("English render", () => {
    it("should render the service name as the page heading", () => {
      // Arrange
      const data = { ...en, serviceName: SERVICE_NAME, otherLocale: "cy" };

      // Act
      const { $ } = render(env, "index.njk", data);

      // Assert
      expect($("h1").text()).toContain(SERVICE_NAME);
    });

    it("should render every hearings list item as a bullet", () => {
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
  });

  describe("Welsh render", () => {
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
});
