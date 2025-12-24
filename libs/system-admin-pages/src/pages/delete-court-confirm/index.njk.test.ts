import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("delete-court-confirm template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required properties", () => {
      expect(en).toHaveProperty("pageTitle");
      expect(en).toHaveProperty("tableHeadings");
      expect(en).toHaveProperty("radioLegend");
      expect(en).toHaveProperty("radioYes");
      expect(en).toHaveProperty("radioNo");
      expect(en).toHaveProperty("continueButtonText");
      expect(en).toHaveProperty("errorSummaryTitle");
      expect(en).toHaveProperty("noRadioSelected");
      expect(en).toHaveProperty("activeSubscriptions");
      expect(en).toHaveProperty("activeArtefacts");
      expect(en).toHaveProperty("locationNotFound");
    });

    it("should have correct page title", () => {
      expect(en.pageTitle).toBe("Are you sure you want to delete this court?");
    });

    it("should have correct table headings", () => {
      expect(en.tableHeadings).toHaveProperty("courtName");
      expect(en.tableHeadings).toHaveProperty("locationType");
      expect(en.tableHeadings).toHaveProperty("jurisdiction");
      expect(en.tableHeadings).toHaveProperty("region");

      expect(en.tableHeadings.courtName).toBe("Court or tribunal name");
      expect(en.tableHeadings.locationType).toBe("Location type");
      expect(en.tableHeadings.jurisdiction).toBe("Jurisdiction");
      expect(en.tableHeadings.region).toBe("Region");
    });

    it("should have correct radio options", () => {
      expect(en.radioLegend).toBe("Are you sure you want to delete this court?");
      expect(en.radioYes).toBe("Yes");
      expect(en.radioNo).toBe("No");
    });

    it("should have correct error messages", () => {
      expect(en.errorSummaryTitle).toBe("There is a problem");
      expect(en.noRadioSelected).toBe("Select yes or no to continue");
      expect(en.activeSubscriptions).toBe("There are active subscriptions for the given location.");
      expect(en.activeArtefacts).toBe("There are active artefacts for the given location.");
      expect(en.locationNotFound).toBe("Court or tribunal not found in session");
    });

    it("should have continue button text", () => {
      expect(en.continueButtonText).toBe("Continue");
    });

    it("should have all table headings as non-empty strings", () => {
      Object.values(en.tableHeadings).forEach((value) => {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Welsh locale", () => {
    it("should have required properties", () => {
      expect(cy).toHaveProperty("pageTitle");
      expect(cy).toHaveProperty("tableHeadings");
      expect(cy).toHaveProperty("radioLegend");
      expect(cy).toHaveProperty("radioYes");
      expect(cy).toHaveProperty("radioNo");
      expect(cy).toHaveProperty("continueButtonText");
      expect(cy).toHaveProperty("errorSummaryTitle");
      expect(cy).toHaveProperty("noRadioSelected");
      expect(cy).toHaveProperty("activeSubscriptions");
      expect(cy).toHaveProperty("activeArtefacts");
      expect(cy).toHaveProperty("locationNotFound");
    });

    it("should have correct page title", () => {
      expect(cy.pageTitle).toBe("Ydych chi'n siŵr eich bod eisiau dileu'r llys hwn?");
    });

    it("should have correct table headings", () => {
      expect(cy.tableHeadings).toHaveProperty("courtName");
      expect(cy.tableHeadings).toHaveProperty("locationType");
      expect(cy.tableHeadings).toHaveProperty("jurisdiction");
      expect(cy.tableHeadings).toHaveProperty("region");

      expect(cy.tableHeadings.courtName).toBe("Enw'r llys neu'r tribiwnlys");
      expect(cy.tableHeadings.locationType).toBe("Math o Lleoliad");
      expect(cy.tableHeadings.jurisdiction).toBe("Awdurdodaeth");
      expect(cy.tableHeadings.region).toBe("Rhanbarth");
    });

    it("should have correct radio options", () => {
      expect(cy.radioLegend).toBe("Ydych chi'n siŵr eich bod eisiau dileu'r llys hwn?");
      expect(cy.radioYes).toBe("Ydw");
      expect(cy.radioNo).toBe("Nac ydw");
    });

    it("should have correct error messages", () => {
      expect(cy.errorSummaryTitle).toBe("Mae yna broblem");
      expect(cy.noRadioSelected).toBe("Dewiswch ydw neu nac ydw i barhau");
      expect(cy.activeSubscriptions).toBe("Mae tanysgrifiadau gweithredol ar gyfer y lleoliad a roddir.");
      expect(cy.activeArtefacts).toBe("Mae arteffactau gweithredol ar gyfer y lleoliad a roddir.");
      expect(cy.locationNotFound).toBe("Heb ddod o hyd i'r llys neu'r tribiwnlys yn y sesiwn");
    });

    it("should have continue button text", () => {
      expect(cy.continueButtonText).toBe("Dewiswch opsiwn");
    });

    it("should have all table headings as non-empty strings", () => {
      Object.values(cy.tableHeadings).forEach((value) => {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it("should have same structure as English locale", () => {
      expect(Object.keys(cy).sort()).toEqual(Object.keys(en).sort());
      expect(Object.keys(cy.tableHeadings).sort()).toEqual(Object.keys(en.tableHeadings).sort());
    });
  });
});
