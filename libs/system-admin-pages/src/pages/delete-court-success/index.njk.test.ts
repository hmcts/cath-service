import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { en } from "./en.js";
import { cy } from "./cy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("delete-court-success template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required properties", () => {
      expect(en).toHaveProperty("pageTitle");
      expect(en).toHaveProperty("bannerText");
      expect(en).toHaveProperty("nextStepsTitle");
      expect(en).toHaveProperty("removeAnotherCourtLink");
      expect(en).toHaveProperty("uploadReferenceDataLink");
      expect(en).toHaveProperty("homeLink");
    });

    it("should have correct page title", () => {
      expect(en.pageTitle).toBe("Delete successful");
    });

    it("should have correct banner text", () => {
      expect(en.bannerText).toBe("Court has been deleted");
    });

    it("should have correct next steps title", () => {
      expect(en.nextStepsTitle).toBe("What do you want to do next?");
    });

    it("should have correct link texts", () => {
      expect(en.removeAnotherCourtLink).toBe("Remove another court");
      expect(en.uploadReferenceDataLink).toBe("Upload Reference Data");
      expect(en.homeLink).toBe("Home");
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
      expect(cy).toHaveProperty("bannerText");
      expect(cy).toHaveProperty("nextStepsTitle");
      expect(cy).toHaveProperty("removeAnotherCourtLink");
      expect(cy).toHaveProperty("uploadReferenceDataLink");
      expect(cy).toHaveProperty("homeLink");
    });

    it("should have correct page title", () => {
      expect(cy.pageTitle).toBe("Wedi llwyddo i ddileu");
    });

    it("should have correct banner text", () => {
      expect(cy.bannerText).toBe("Mae'r llys wedi'i ddileu");
    });

    it("should have correct next steps title", () => {
      expect(cy.nextStepsTitle).toBe("Beth hoffech chi ei wneud nesaf?");
    });

    it("should have correct link texts", () => {
      expect(cy.removeAnotherCourtLink).toBe("Dileu llys arall");
      expect(cy.uploadReferenceDataLink).toBe("Uwchlwytho Data Cyfeirio");
      expect(cy.homeLink).toBe("Hafan");
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
