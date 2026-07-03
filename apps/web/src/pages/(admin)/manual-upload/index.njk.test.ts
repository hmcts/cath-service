import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("manual-upload template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have page title", () => {
      expect(en.title).toBe("Manual upload");
      expect(en.pageTitle).toBe("Upload - Manual upload");
    });

    it("should have warning section", () => {
      expect(en.warningTitle).toBe("Warning");
      expect(en.warningMessage).toBeDefined();
      expect(en.warningMessage.length).toBeGreaterThan(0);
    });

    it("should have file upload label", () => {
      expect(en.fileUploadLabel).toBeDefined();
      expect(en.fileUploadLabel).toContain("csv");
      expect(en.fileUploadLabel).toContain("pdf");
      expect(en.fileUploadLabel).toContain("2MB");
    });

    it("should have court label", () => {
      expect(en.courtLabel).toBe("Court name or Tribunal name");
    });

    it("should have list type fields", () => {
      expect(en.listTypeLabel).toBe("List type");
      expect(en.listTypePlaceholder).toBe("Please choose a list type");
    });

    it("should have hearing start date fields", () => {
      expect(en.hearingStartDateLabel).toBe("Hearing start date");
      expect(en.hearingStartDateHint).toBe("For example, 16 01 2022");
    });

    it("should have sensitivity label", () => {
      expect(en.sensitivityLabel).toBe("Sensitivity");
    });

    it("should have language label", () => {
      expect(en.languageLabel).toBe("Language");
    });

    it("should have display date fields", () => {
      expect(en.displayFromLabel).toBe("Display file from");
      expect(en.displayFromHint).toBe("For example, 27 01 2022");
      expect(en.displayToLabel).toBe("Display file to");
      expect(en.displayToHint).toBe("For example, 18 02 2022");
    });

    it("should have date input labels", () => {
      expect(en.dayLabel).toBe("Day");
      expect(en.monthLabel).toBe("Month");
      expect(en.yearLabel).toBe("Year");
    });

    it("should have continue button text", () => {
      expect(en.continueButton).toBe("Continue");
    });

    it("should have error summary title", () => {
      expect(en.errorSummaryTitle).toBe("There is a problem");
    });

    it("should have page help section", () => {
      expect(en.pageHelpTitle).toBe("Page help");
      expect(en.pageHelpLists).toBe("Lists");
      expect(en.pageHelpSensitivity).toBe("Sensitivity");
      expect(en.pageHelpDisplayFrom).toBe("Display from");
      expect(en.pageHelpDisplayTo).toBe("Display to");
    });

    it("should have page help content", () => {
      expect(en.pageHelpListsText).toBeDefined();
      expect(en.pageHelpSensitivityText).toBeDefined();
      expect(en.pageHelpDisplayFromText).toBeDefined();
      expect(en.pageHelpDisplayToText).toBeDefined();
    });

    it("should have sensitivity help text", () => {
      expect(en.pageHelpSensitivityPublic).toBe("Public");
      expect(en.pageHelpSensitivityPublicText).toBeDefined();
      expect(en.pageHelpSensitivityPrivate).toBe("Private");
      expect(en.pageHelpSensitivityPrivateText).toBeDefined();
      expect(en.pageHelpSensitivityClassified).toBe("Classified");
      expect(en.pageHelpSensitivityClassifiedText).toBeDefined();
    });

    it("should have back to top link", () => {
      expect(en.backToTop).toBe("Back to top");
    });

    describe("Error messages", () => {
      it("should have file error messages", () => {
        expect(en.errorMessages.fileRequired).toBe("Please provide a file");
        expect(en.errorMessages.fileType).toBe("Please upload a valid file format");
        expect(en.errorMessages.fileSize).toBe("File too large, please upload file smaller than 2MB");
      });

      it("should have court error messages", () => {
        expect(en.errorMessages.courtRequired).toBe("Please enter and select a valid court");
        expect(en.errorMessages.courtTooShort).toBe("Court name must be three characters or more");
      });

      it("should have list type error message", () => {
        expect(en.errorMessages.listTypeRequired).toBe("Please select a list type");
      });

      it("should have hearing start date error messages", () => {
        expect(en.errorMessages.hearingStartDateRequired).toBe("Please enter a valid hearing start date");
        expect(en.errorMessages.hearingStartDateInvalid).toBe("Please enter a valid hearing start date");
      });

      it("should have sensitivity error message", () => {
        expect(en.errorMessages.sensitivityRequired).toBe("Please select a sensitivity");
      });

      it("should have language error message", () => {
        expect(en.errorMessages.languageRequired).toBe("Select a language");
      });

      it("should have display date error messages", () => {
        expect(en.errorMessages.displayFromRequired).toBe("Please enter a valid display file from date");
        expect(en.errorMessages.displayFromInvalid).toBe("Please enter a valid display file from date");
        expect(en.errorMessages.displayToRequired).toBe("Please enter a valid display file to date");
        expect(en.errorMessages.displayToInvalid).toBe("Please enter a valid display file to date");
        expect(en.errorMessages.displayToBeforeFrom).toBe("Display to date must be after display from date");
      });
    });
  });

  describe("Welsh locale", () => {
    it("should have page title", () => {
      expect(cy.title).toBeDefined();
      expect(cy.title.length).toBeGreaterThan(0);
      expect(cy.pageTitle).toBeDefined();
      expect(cy.pageTitle.length).toBeGreaterThan(0);
    });

    it("should have warning section", () => {
      expect(cy.warningTitle).toBeDefined();
      expect(cy.warningMessage).toBeDefined();
      expect(cy.warningMessage.length).toBeGreaterThan(0);
    });

    it("should have file upload label", () => {
      expect(cy.fileUploadLabel).toBeDefined();
      expect(cy.fileUploadLabel.length).toBeGreaterThan(0);
    });

    it("should have court label", () => {
      expect(cy.courtLabel).toBeDefined();
      expect(cy.courtLabel.length).toBeGreaterThan(0);
    });

    it("should have list type fields", () => {
      expect(cy.listTypeLabel).toBeDefined();
      expect(cy.listTypePlaceholder).toBeDefined();
    });

    it("should have hearing start date fields", () => {
      expect(cy.hearingStartDateLabel).toBeDefined();
      expect(cy.hearingStartDateHint).toBeDefined();
    });

    it("should have sensitivity label", () => {
      expect(cy.sensitivityLabel).toBeDefined();
    });

    it("should have language label", () => {
      expect(cy.languageLabel).toBeDefined();
    });

    it("should have display date fields", () => {
      expect(cy.displayFromLabel).toBeDefined();
      expect(cy.displayFromHint).toBeDefined();
      expect(cy.displayToLabel).toBeDefined();
      expect(cy.displayToHint).toBeDefined();
    });

    it("should have date input labels", () => {
      expect(cy.dayLabel).toBeDefined();
      expect(cy.monthLabel).toBeDefined();
      expect(cy.yearLabel).toBeDefined();
    });

    it("should have continue button text", () => {
      expect(cy.continueButton).toBeDefined();
    });

    it("should have error summary title", () => {
      expect(cy.errorSummaryTitle).toBeDefined();
    });

    it("should have page help section", () => {
      expect(cy.pageHelpTitle).toBeDefined();
      expect(cy.pageHelpLists).toBeDefined();
      expect(cy.pageHelpSensitivity).toBeDefined();
      expect(cy.pageHelpDisplayFrom).toBeDefined();
      expect(cy.pageHelpDisplayTo).toBeDefined();
    });

    it("should have back to top link", () => {
      expect(cy.backToTop).toBeDefined();
    });

    describe("Error messages", () => {
      it("should have all file error messages", () => {
        expect(cy.errorMessages.fileRequired).toBeDefined();
        expect(cy.errorMessages.fileType).toBeDefined();
        expect(cy.errorMessages.fileSize).toBeDefined();
      });

      it("should have all court error messages", () => {
        expect(cy.errorMessages.courtRequired).toBeDefined();
        expect(cy.errorMessages.courtTooShort).toBeDefined();
      });

      it("should have all required error messages", () => {
        expect(cy.errorMessages.listTypeRequired).toBeDefined();
        expect(cy.errorMessages.hearingStartDateRequired).toBeDefined();
        expect(cy.errorMessages.hearingStartDateInvalid).toBeDefined();
        expect(cy.errorMessages.sensitivityRequired).toBeDefined();
        expect(cy.errorMessages.languageRequired).toBeDefined();
        expect(cy.errorMessages.displayFromRequired).toBeDefined();
        expect(cy.errorMessages.displayFromInvalid).toBeDefined();
        expect(cy.errorMessages.displayToRequired).toBeDefined();
        expect(cy.errorMessages.displayToInvalid).toBeDefined();
        expect(cy.errorMessages.displayToBeforeFrom).toBeDefined();
      });
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = [
        "title",
        "pageTitle",
        "warningTitle",
        "warningMessage",
        "fileUploadLabel",
        "courtLabel",
        "listTypeLabel",
        "listTypePlaceholder",
        "hearingStartDateLabel",
        "hearingStartDateHint",
        "sensitivityLabel",
        "languageLabel",
        "displayFromLabel",
        "displayFromHint",
        "displayToLabel",
        "displayToHint",
        "continueButton",
        "errorSummaryTitle",
        "pageHelpTitle",
        "dayLabel",
        "monthLabel",
        "yearLabel",
        "backToTop",
        "errorMessages"
      ];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });

    it("should have consistent error message keys", () => {
      const errorKeys = Object.keys(en.errorMessages).sort();
      const cyErrorKeys = Object.keys(cy.errorMessages).sort();

      expect(errorKeys).toEqual(cyErrorKeys);
    });

    it("should have all required error message keys", () => {
      const requiredErrorKeys = [
        "fileRequired",
        "fileType",
        "fileSize",
        "courtRequired",
        "courtTooShort",
        "listTypeRequired",
        "hearingStartDateRequired",
        "hearingStartDateInvalid",
        "sensitivityRequired",
        "languageRequired",
        "displayFromRequired",
        "displayFromInvalid",
        "displayToRequired",
        "displayToInvalid",
        "displayToBeforeFrom"
      ];

      requiredErrorKeys.forEach((key) => {
        expect(en.errorMessages).toHaveProperty(key);
        expect(cy.errorMessages).toHaveProperty(key);
      });
    });

    it("should have non-empty Welsh translations", () => {
      Object.values(cy).forEach((value) => {
        if (typeof value === "string") {
          expect(value.length).toBeGreaterThan(0);
        }
      });
    });

    it("should have non-empty Welsh error messages", () => {
      Object.values(cy.errorMessages).forEach((value) => {
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });
});
