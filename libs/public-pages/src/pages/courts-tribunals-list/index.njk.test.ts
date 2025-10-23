import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("courts-tribunals-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required title", () => {
      expect(en.title).toBe("Find a court or tribunal");
    });

    it("should have selected filters heading", () => {
      expect(en.selectedFiltersHeading).toBe("Selected filters");
    });

    it("should have no filters selected text", () => {
      expect(en.noFiltersSelected).toBe("No filters selected");
    });

    it("should have clear filters text", () => {
      expect(en.clearFilters).toBe("Clear filters");
    });

    it("should have filter heading", () => {
      expect(en.filterHeading).toBe("Filter");
    });

    it("should have jurisdiction heading", () => {
      expect(en.jurisdictionHeading).toBe("Jurisdiction");
    });

    it("should have region heading", () => {
      expect(en.regionHeading).toBe("Region");
    });

    it("should have apply filters button text", () => {
      expect(en.applyFilters).toBe("Apply filters");
    });

    it("should have back to top link text", () => {
      expect(en.backToTop).toBe("Back to top");
    });

    it("should have show filters button text", () => {
      expect(en.showFilters).toBe("Show filters");
    });

    it("should have hide filters button text", () => {
      expect(en.hideFilters).toBe("Hide filters");
    });

    it("should have sub-jurisdiction labels", () => {
      expect(en.subJurisdictionLabels).toBeDefined();
      expect(en.subJurisdictionLabels[1]).toBe("Type of civil court");
      expect(en.subJurisdictionLabels[2]).toBe("Type of family court");
      expect(en.subJurisdictionLabels[3]).toBe("Type of criminal court");
      expect(en.subJurisdictionLabels[4]).toBe("Type of tribunal");
    });
  });

  describe("Welsh locale", () => {
    it("should have required title", () => {
      expect(cy.title).toBe("Dod o hyd i lys neu dribiwnlys");
    });

    it("should have selected filters heading", () => {
      expect(cy.selectedFiltersHeading).toBe("Hidlwyr a ddewiswyd");
    });

    it("should have no filters selected text", () => {
      expect(cy.noFiltersSelected).toBe("Dim hidlyddion wedi'u dewis");
    });

    it("should have clear filters text", () => {
      expect(cy.clearFilters).toBe("Clirio hidlwyr");
    });

    it("should have filter heading", () => {
      expect(cy.filterHeading).toBe("Hidlydd");
    });

    it("should have jurisdiction heading", () => {
      expect(cy.jurisdictionHeading).toBe("Awdurdodaeth");
    });

    it("should have region heading", () => {
      expect(cy.regionHeading).toBe("Rhanbarth");
    });

    it("should have apply filters button text", () => {
      expect(cy.applyFilters).toBe("Rhoi hidlyddion ar waith");
    });

    it("should have back to top link text", () => {
      expect(cy.backToTop).toBe("Yn ôl i frig y dudalen");
    });

    it("should have show filters button text", () => {
      expect(cy.showFilters).toBe("Dangos hidlwyr");
    });

    it("should have hide filters button text", () => {
      expect(cy.hideFilters).toBe("Cuddio hidlwyr");
    });

    it("should have sub-jurisdiction labels", () => {
      expect(cy.subJurisdictionLabels).toBeDefined();
      expect(cy.subJurisdictionLabels[1]).toBe("Math o llys sifil");
      expect(cy.subJurisdictionLabels[2]).toBe("Math o llys teulu");
      expect(cy.subJurisdictionLabels[3]).toBe("Math o llys troseddol");
      expect(cy.subJurisdictionLabels[4]).toBe("Math o dribiwnlys");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = [
        "title",
        "selectedFiltersHeading",
        "noFiltersSelected",
        "clearFilters",
        "filterHeading",
        "jurisdictionHeading",
        "regionHeading",
        "applyFilters",
        "backToTop",
        "showFilters",
        "hideFilters",
        "subJurisdictionLabels"
      ];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });

    it("should have same sub-jurisdiction label keys", () => {
      expect(Object.keys(en.subJurisdictionLabels).sort()).toEqual(Object.keys(cy.subJurisdictionLabels).sort());
    });

    it("should have all four sub-jurisdiction labels", () => {
      const expectedKeys = ["1", "2", "3", "4"];

      expectedKeys.forEach((key) => {
        expect(en.subJurisdictionLabels).toHaveProperty(key);
        expect(cy.subJurisdictionLabels).toHaveProperty(key);
      });
    });
  });

  describe("Content validation", () => {
    it("should have non-empty strings for all English content", () => {
      expect(en.title.length).toBeGreaterThan(0);
      expect(en.selectedFiltersHeading.length).toBeGreaterThan(0);
      expect(en.noFiltersSelected.length).toBeGreaterThan(0);
      expect(en.clearFilters.length).toBeGreaterThan(0);
      expect(en.filterHeading.length).toBeGreaterThan(0);
      expect(en.jurisdictionHeading.length).toBeGreaterThan(0);
      expect(en.regionHeading.length).toBeGreaterThan(0);
      expect(en.applyFilters.length).toBeGreaterThan(0);
      expect(en.backToTop.length).toBeGreaterThan(0);
      expect(en.showFilters.length).toBeGreaterThan(0);
      expect(en.hideFilters.length).toBeGreaterThan(0);
    });

    it("should have non-empty strings for all Welsh content", () => {
      expect(cy.title.length).toBeGreaterThan(0);
      expect(cy.selectedFiltersHeading.length).toBeGreaterThan(0);
      expect(cy.noFiltersSelected.length).toBeGreaterThan(0);
      expect(cy.clearFilters.length).toBeGreaterThan(0);
      expect(cy.filterHeading.length).toBeGreaterThan(0);
      expect(cy.jurisdictionHeading.length).toBeGreaterThan(0);
      expect(cy.regionHeading.length).toBeGreaterThan(0);
      expect(cy.applyFilters.length).toBeGreaterThan(0);
      expect(cy.backToTop.length).toBeGreaterThan(0);
      expect(cy.showFilters.length).toBeGreaterThan(0);
      expect(cy.hideFilters.length).toBeGreaterThan(0);
    });

    it("should have non-empty sub-jurisdiction labels in English", () => {
      Object.values(en.subJurisdictionLabels).forEach((label) => {
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      });
    });

    it("should have non-empty sub-jurisdiction labels in Welsh", () => {
      Object.values(cy.subJurisdictionLabels).forEach((label) => {
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });
});
