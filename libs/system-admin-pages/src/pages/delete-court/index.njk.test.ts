import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { en } from "./en.js";
import { cy } from "./cy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("delete-court template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required properties", () => {
      expect(en).toHaveProperty("pageTitle");
      expect(en).toHaveProperty("courtNameLabel");
      expect(en).toHaveProperty("continueButtonText");
      expect(en).toHaveProperty("errorSummaryTitle");
      expect(en).toHaveProperty("courtNameRequired");
      expect(en).toHaveProperty("courtNotFound");
    });

    it("should have correct page title", () => {
      expect(en.pageTitle).toBe("Find the court to remove");
    });

    it("should have correct form labels", () => {
      expect(en.courtNameLabel).toBe("Court or tribunal name");
      expect(en.continueButtonText).toBe("Continue");
    });

    it("should have correct error messages", () => {
      expect(en.errorSummaryTitle).toBe("There is a problem");
      expect(en.courtNameRequired).toBe("Enter a court or tribunal name");
      expect(en.courtNotFound).toBe("Court or tribunal not found");
    });

    it("should have all text as non-empty strings", () => {
      Object.values(en).forEach((value) => {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Welsh locale", () => {
    it("should have required properties", () => {
      expect(cy).toHaveProperty("pageTitle");
      expect(cy).toHaveProperty("courtNameLabel");
      expect(cy).toHaveProperty("continueButtonText");
      expect(cy).toHaveProperty("errorSummaryTitle");
      expect(cy).toHaveProperty("courtNameRequired");
      expect(cy).toHaveProperty("courtNotFound");
    });

    it("should have correct page title", () => {
      expect(cy.pageTitle).toBe("Dod o hyd i'r llys i'w ddileu");
    });

    it("should have correct form labels", () => {
      expect(cy.courtNameLabel).toBe("Enw'r llys neu'r tribiwnlys");
      expect(cy.continueButtonText).toBe("Dewiswch opsiwn");
    });

    it("should have correct error messages", () => {
      expect(cy.errorSummaryTitle).toBe("Mae yna broblem");
      expect(cy.courtNameRequired).toBe("Rhowch enw'r llys neu'r tribiwnlys");
      expect(cy.courtNotFound).toBe("Heb ddod o hyd i'r llys neu'r tribiwnlys");
    });

    it("should have all text as non-empty strings", () => {
      Object.values(cy).forEach((value) => {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it("should have same structure as English locale", () => {
      expect(Object.keys(cy).sort()).toEqual(Object.keys(en).sort());
    });
  });
});
