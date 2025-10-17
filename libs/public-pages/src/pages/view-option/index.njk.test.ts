import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("view-option template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required title", () => {
      expect(en.title).toBe("What do you want to do?");
    });

    it("should have error summary title", () => {
      expect(en.errorSummaryTitle).toBe("There is a problem");
    });

    it("should have error message", () => {
      expect(en.errorMessage).toBe("An option must be selected");
    });

    it("should have court tribunal option", () => {
      expect(en.courtTribunalLabel).toBe("<strong>Find a court or tribunal</strong>");
      expect(en.courtTribunalHint).toBeDefined();
      expect(en.courtTribunalHint.length).toBeGreaterThan(0);
    });

    it("should have sjp case option", () => {
      expect(en.sjpCaseLabel).toBe("<strong>Find a Single Justice Procedure case</strong>");
      expect(en.sjpCaseHint).toBeDefined();
      expect(en.sjpCaseHint.length).toBeGreaterThan(0);
    });

    it("should have continue button text", () => {
      expect(en.continueButton).toBe("Continue");
    });
  });

  describe("Welsh locale", () => {
    it("should have required title", () => {
      expect(cy.title).toBe("Beth ydych chi eisiau ei wneud?");
    });

    it("should have error summary title", () => {
      expect(cy.errorSummaryTitle).toBe("Mae problem");
    });

    it("should have error message", () => {
      expect(cy.errorMessage).toBe("Rhaid dewis opsiwn");
    });

    it("should have court tribunal option", () => {
      expect(cy.courtTribunalLabel).toBe("<strong>Dod o hyd i lys neu dribiwnlys</strong>");
      expect(cy.courtTribunalHint).toBeDefined();
      expect(cy.courtTribunalHint.length).toBeGreaterThan(0);
    });

    it("should have sjp case option", () => {
      expect(cy.sjpCaseLabel).toBe("<strong>Dod o hyd i achos Gweithdrefn Un Ynad</strong>");
      expect(cy.sjpCaseHint).toBeDefined();
      expect(cy.sjpCaseHint.length).toBeGreaterThan(0);
    });

    it("should have continue button text", () => {
      expect(cy.continueButton).toBe("Parhau");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = [
        "title",
        "errorSummaryTitle",
        "errorMessage",
        "courtTribunalLabel",
        "courtTribunalHint",
        "sjpCaseLabel",
        "sjpCaseHint",
        "continueButton"
      ];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });
  });
});
