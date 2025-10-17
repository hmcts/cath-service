import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cy, en } from "../locales/courts-tribunals-list.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("courts-tribunals-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "courts-tribunals-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required title", () => {
      expect(en.title).toBe("A-Z list of courts and tribunals");
    });

    it("should have description text", () => {
      expect(en.description).toBe("Select a court or tribunal to view its hearing list and publications.");
    });

    it("should have back link text", () => {
      expect(en.backLinkText).toBe("Back to search");
    });
  });

  describe("Welsh locale", () => {
    it("should have required title", () => {
      expect(cy.title).toBe("Rhestr A-Z o lysoedd a thribiwnlysoedd");
    });

    it("should have description text", () => {
      expect(cy.description).toBe("Dewiswch lys neu dribiwnlys i weld ei restr o wrandawiadau a chyhoeddiadau.");
    });

    it("should have back link text", () => {
      expect(cy.backLinkText).toBe("Yn ôl i'r chwiliad");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = ["title", "description", "backLinkText"];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });
  });
});
