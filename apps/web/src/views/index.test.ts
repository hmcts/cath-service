import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cy, en } from "../locales/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("index template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required heading", () => {
      expect(en.heading).toBe("Court and tribunal hearings");
    });

    it("should have hearings list with 4 items", () => {
      expect(en.hearingsList).toBeDefined();
      expect(Array.isArray(en.hearingsList)).toBe(true);
      expect(en.hearingsList.length).toBe(4);
    });

    it("should have hearings list content", () => {
      expect(en.hearingsList[0]).toContain("civil and family courts");
      expect(en.hearingsList[1]).toContain("First Tier and Upper Tribunals");
      expect(en.hearingsList[2]).toContain("Royal Courts of Justice");
      expect(en.hearingsList[3]).toContain("Single Justice Procedure");
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

    it("should have Welsh available text", () => {
      expect(en.welshAvailableText).toBe("This service is also available in");
      expect(en.welshAvailableLink).toBe("Welsh (Cymraeg)");
    });
  });

  describe("Welsh locale", () => {
    it("should have required heading", () => {
      expect(cy.heading).toBe("Gwrandawiadau llys a thribiwnlys");
    });

    it("should have hearings list with 4 items", () => {
      expect(cy.hearingsList).toBeDefined();
      expect(Array.isArray(cy.hearingsList)).toBe(true);
      expect(cy.hearingsList.length).toBe(4);
    });

    it("should have hearings list content", () => {
      expect(cy.hearingsList[0]).toContain("Lysoedd Sifil a Theulu");
      expect(cy.hearingsList[1]).toContain("Tribiwnlys Haen Gyntaf");
      expect(cy.hearingsList[2]).toContain("Llys Barn Brenhinol");
      expect(cy.hearingsList[3]).toContain("Gweithdrefn Un Ynad");
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

    it("should have Welsh available text", () => {
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
        "heading",
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
});
