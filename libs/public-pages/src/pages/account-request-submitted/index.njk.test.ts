import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("account-request-submitted template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have banner title", () => {
      expect(en.bannerTitle).toBe("Details submitted");
    });

    it("should have section title", () => {
      expect(en.sectionTitle).toBe("What happens next");
    });

    it("should have body text", () => {
      expect(en.bodyText1).toBe("HMCTS will review your details.");
      expect(en.bodyText2).toContain("email you");
      expect(en.bodyText3).toContain("5 working days");
      expect(en.bodyText3).toContain("0300 303 0656");
    });
  });

  describe("Welsh locale", () => {
    it("should have banner title", () => {
      expect(cy.bannerTitle).toBe("Cyflwyno manylion");
    });

    it("should have section title", () => {
      expect(cy.sectionTitle).toBe("Beth sy'n digwydd nesaf");
    });

    it("should have body text", () => {
      expect(cy.bodyText1).toBe("Bydd GLlTEM yn adolygu eich manylion.");
      expect(cy.bodyText2).toContain("e-bost");
      expect(cy.bodyText3).toContain("5 diwrnod gwaith");
      expect(cy.bodyText3).toContain("0300 303 0656");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = ["bannerTitle", "sectionTitle", "bodyText1", "bodyText2", "bodyText3"];

      for (const key of requiredKeys) {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      }
    });
  });
});
