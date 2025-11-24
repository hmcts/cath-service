import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("summary-of-publications template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have title prefix", () => {
      expect(en.titlePrefix).toBe("What do you want to view from");
    });

    it("should have title suffix", () => {
      expect(en.titleSuffix).toBe("?");
    });

    it("should have no publications message", () => {
      expect(en.noPublicationsMessage).toBe("Sorry, no lists found for this court");
    });

    it("should have English language label", () => {
      expect(en.languageEnglish).toBe("English (Saesneg)");
    });

    it("should have Welsh language label", () => {
      expect(en.languageWelsh).toBe("Welsh (Cymraeg)");
    });
  });

  describe("Welsh locale", () => {
    it("should have title prefix", () => {
      expect(cy.titlePrefix).toBe("Beth ydych chi eisiau edrych arno gan");
    });

    it("should have title suffix", () => {
      expect(cy.titleSuffix).toBe("?");
    });

    it("should have no publications message", () => {
      expect(cy.noPublicationsMessage).toBe("Mae'n ddrwg gennym, nid ydym wedi dod o hyd i unrhyw restrau i'r llys hwn");
    });

    it("should have English language label", () => {
      expect(cy.languageEnglish).toBe("Saesneg (English)");
    });

    it("should have Welsh language label", () => {
      expect(cy.languageWelsh).toBe("Cymraeg (Welsh)");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = ["titlePrefix", "titleSuffix", "noPublicationsMessage", "languageEnglish", "languageWelsh", "opensInNewWindow", "instructionText"];

      for (const key of requiredKeys) {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      }
    });
  });
});
