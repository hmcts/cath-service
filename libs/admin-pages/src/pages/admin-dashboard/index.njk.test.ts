import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import cy from "./cy.js";
import en from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("admin-dashboard template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have page title", () => {
      expect(en.pageTitle).toBe("Admin Dashboard");
    });

    it("should have three tiles", () => {
      expect(en.tiles).toHaveLength(3);
    });

    it("should have Upload tile", () => {
      expect(en.tiles[0].heading).toBe("Upload");
      expect(en.tiles[0].description).toBe("Upload a file to be published on the external facing service on GOV.UK");
    });

    it("should have Upload Excel File tile", () => {
      expect(en.tiles[1].heading).toBe("Upload Excel File");
      expect(en.tiles[1].description).toBe("Upload an excel file to be converted and displayed on the external facing service on GOV.UK");
    });

    it("should have Remove tile", () => {
      expect(en.tiles[2].heading).toBe("Remove");
      expect(en.tiles[2].description).toBe("Search by court or tribunal and remove a publication from the external facing service on GOV.UK");
    });
  });

  describe("Welsh locale", () => {
    it("should have page title", () => {
      expect(cy.pageTitle).toBeDefined();
      expect(cy.pageTitle.length).toBeGreaterThan(0);
    });

    it("should have three tiles", () => {
      expect(cy.tiles).toHaveLength(3);
    });

    it("should have all tiles with heading and description", () => {
      cy.tiles.forEach((tile) => {
        expect(tile.heading).toBeDefined();
        expect(tile.heading.length).toBeGreaterThan(0);
        expect(tile.description).toBeDefined();
        expect(tile.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = ["pageTitle", "tiles"];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });

    it("should have same number of tiles in English and Welsh", () => {
      expect(en.tiles.length).toBe(cy.tiles.length);
    });

    it("should have consistent tile structure", () => {
      en.tiles.forEach((_tile, index) => {
        expect(cy.tiles[index]).toHaveProperty("heading");
        expect(cy.tiles[index]).toHaveProperty("description");
      });
    });
  });
});
