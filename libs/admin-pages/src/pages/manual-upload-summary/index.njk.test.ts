import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import cy from "./cy.js";
import en from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("manual-upload-summary template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required title", () => {
      expect(en.pageTitle).toBe("File upload summary");
    });

    it("should have sub-heading", () => {
      expect(en.subHeading).toBe("Check upload details");
    });

    it("should have court name label", () => {
      expect(en.courtName).toBe("Court name");
    });

    it("should have file label", () => {
      expect(en.file).toBe("File");
    });

    it("should have list type label", () => {
      expect(en.listType).toBe("List type");
    });

    it("should have hearing start date label", () => {
      expect(en.hearingStartDate).toBe("Hearing start date");
    });

    it("should have sensitivity label", () => {
      expect(en.sensitivity).toBe("Sensitivity");
    });

    it("should have language label", () => {
      expect(en.language).toBe("Language");
    });

    it("should have display file dates label", () => {
      expect(en.displayFileDates).toBe("Display file dates");
    });

    it("should have change action text", () => {
      expect(en.change).toBe("Change");
    });

    it("should have confirm button text", () => {
      expect(en.confirmButton).toBe("Confirm");
    });
  });

  describe("Welsh locale", () => {
    it("should have required title", () => {
      expect(cy.pageTitle).toBe("Crynodeb lanlwytho ffeil");
    });

    it("should have sub-heading", () => {
      expect(cy.subHeading).toBe("Gwirio manylion lanlwytho");
    });

    it("should have court name label", () => {
      expect(cy.courtName).toBe("Enw'r llys");
    });

    it("should have file label", () => {
      expect(cy.file).toBe("Ffeil");
    });

    it("should have list type label", () => {
      expect(cy.listType).toBe("Math o restr");
    });

    it("should have hearing start date label", () => {
      expect(cy.hearingStartDate).toBe("Dyddiad cychwyn y gwrandawiad");
    });

    it("should have sensitivity label", () => {
      expect(cy.sensitivity).toBe("Sensitifrwydd");
    });

    it("should have language label", () => {
      expect(cy.language).toBe("Iaith");
    });

    it("should have display file dates label", () => {
      expect(cy.displayFileDates).toBe("Dangos dyddiadau ffeil");
    });

    it("should have change action text", () => {
      expect(cy.change).toBe("Newid");
    });

    it("should have confirm button text", () => {
      expect(cy.confirmButton).toBe("Cadarnhau");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = [
        "pageTitle",
        "subHeading",
        "courtName",
        "file",
        "listType",
        "hearingStartDate",
        "sensitivity",
        "language",
        "displayFileDates",
        "change",
        "confirmButton"
      ];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });
  });

  describe("Content validation", () => {
    it("should have non-empty strings for all English content", () => {
      expect(en.pageTitle.length).toBeGreaterThan(0);
      expect(en.subHeading.length).toBeGreaterThan(0);
      expect(en.courtName.length).toBeGreaterThan(0);
      expect(en.file.length).toBeGreaterThan(0);
      expect(en.listType.length).toBeGreaterThan(0);
      expect(en.hearingStartDate.length).toBeGreaterThan(0);
      expect(en.sensitivity.length).toBeGreaterThan(0);
      expect(en.language.length).toBeGreaterThan(0);
      expect(en.displayFileDates.length).toBeGreaterThan(0);
      expect(en.change.length).toBeGreaterThan(0);
      expect(en.confirmButton.length).toBeGreaterThan(0);
    });

    it("should have non-empty strings for all Welsh content", () => {
      expect(cy.pageTitle.length).toBeGreaterThan(0);
      expect(cy.subHeading.length).toBeGreaterThan(0);
      expect(cy.courtName.length).toBeGreaterThan(0);
      expect(cy.file.length).toBeGreaterThan(0);
      expect(cy.listType.length).toBeGreaterThan(0);
      expect(cy.hearingStartDate.length).toBeGreaterThan(0);
      expect(cy.sensitivity.length).toBeGreaterThan(0);
      expect(cy.language.length).toBeGreaterThan(0);
      expect(cy.displayFileDates.length).toBeGreaterThan(0);
      expect(cy.change.length).toBeGreaterThan(0);
      expect(cy.confirmButton.length).toBeGreaterThan(0);
    });
  });
});
