import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("search template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required title", () => {
      expect(en.title).toBe("What court or tribunal are you interested in?");
    });

    it("should have error summary title", () => {
      expect(en.errorSummaryTitle).toBe("There is a problem");
    });

    it("should have error message", () => {
      expect(en.errorMessage).toBe("There is nothing matching your criteria");
    });

    it("should have continue button text", () => {
      expect(en.continueButton).toBe("Continue");
    });

    it("should have A-Z list link text", () => {
      expect(en.azListLink).toBe("Select from an A-Z list of courts and tribunals");
    });
  });

  describe("Welsh locale", () => {
    it("should have required title", () => {
      expect(cy.title).toBe("Ym mha lys neu dribiwnlys y mae gennych ddiddordeb?");
    });

    it("should have error summary title", () => {
      expect(cy.errorSummaryTitle).toBe("Ni ddaethpwyd o hyd i unrhyw ganlyniad");
    });

    it("should have error message", () => {
      expect(cy.errorMessage).toBe("Nid oes dim sy'n cyfateb i'ch meini prawf");
    });

    it("should have continue button text", () => {
      expect(cy.continueButton).toBe("Parhau");
    });

    it("should have A-Z list link text", () => {
      expect(cy.azListLink).toBe("Dewis o restr A-Y o lysoedd a thribiwnlysoedd");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = ["title", "errorSummaryTitle", "errorMessage", "continueButton", "azListLink"];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });
  });
});
