import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("manual-upload-success template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required page title", () => {
      expect(en.pageTitle).toBe("Manual upload - File upload successful - Court and tribunal hearings - GOV.UK");
    });

    it("should have success title", () => {
      expect(en.title).toBe("File upload successful");
    });

    it("should have uploaded message", () => {
      expect(en.uploadedMessage).toBe("Your file has been uploaded");
    });

    it("should have next steps heading", () => {
      expect(en.nextStepsHeading).toBe("What do you want to do next?");
    });

    it("should have upload another link text", () => {
      expect(en.uploadAnotherLink).toBe("Upload another file");
    });

    it("should have remove file link text", () => {
      expect(en.removeFileLink).toBe("Remove file");
    });

    it("should have home link text", () => {
      expect(en.homeLink).toBe("Home");
    });
  });

  describe("Welsh locale", () => {
    it("should have required page title", () => {
      expect(cy.pageTitle).toBe("Uwchlwytho â llaw - Wedi llwyddo i uwchlwytho ffeiliau - Gwrandawiadau llys a thribiwnlys - GOV.UK");
    });

    it("should have success title", () => {
      expect(cy.title).toBe("Wedi llwyddo i uwchlwytho ffeiliau");
    });

    it("should have uploaded message", () => {
      expect(cy.uploadedMessage).toBe("Mae eich ffeil wedi'i huwchlwytho");
    });

    it("should have next steps heading", () => {
      expect(cy.nextStepsHeading).toBe("Beth yr ydych eisiau ei wneud nesaf?");
    });

    it("should have upload another link text", () => {
      expect(cy.uploadAnotherLink).toBe("uwchlwytho ffeil arall");
    });

    it("should have remove file link text", () => {
      expect(cy.removeFileLink).toBe("Dileu ffeil");
    });

    it("should have home link text", () => {
      expect(cy.homeLink).toBe("Tudalen hafan");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = ["pageTitle", "title", "uploadedMessage", "nextStepsHeading", "uploadAnotherLink", "removeFileLink", "homeLink"];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });
  });

  describe("Content validation", () => {
    it("should have non-empty strings for all English content", () => {
      expect(en.pageTitle.length).toBeGreaterThan(0);
      expect(en.title.length).toBeGreaterThan(0);
      expect(en.uploadedMessage.length).toBeGreaterThan(0);
      expect(en.nextStepsHeading.length).toBeGreaterThan(0);
      expect(en.uploadAnotherLink.length).toBeGreaterThan(0);
      expect(en.removeFileLink.length).toBeGreaterThan(0);
      expect(en.homeLink.length).toBeGreaterThan(0);
    });

    it("should have non-empty strings for all Welsh content", () => {
      expect(cy.pageTitle.length).toBeGreaterThan(0);
      expect(cy.title.length).toBeGreaterThan(0);
      expect(cy.uploadedMessage.length).toBeGreaterThan(0);
      expect(cy.nextStepsHeading.length).toBeGreaterThan(0);
      expect(cy.uploadAnotherLink.length).toBeGreaterThan(0);
      expect(cy.removeFileLink.length).toBeGreaterThan(0);
      expect(cy.homeLink.length).toBeGreaterThan(0);
    });
  });

  describe("GOV.UK standards", () => {
    it("should have page title ending with GOV.UK", () => {
      expect(en.pageTitle.endsWith("GOV.UK")).toBe(true);
      expect(cy.pageTitle.endsWith("GOV.UK")).toBe(true);
    });

    it("should have page title containing service name", () => {
      expect(en.pageTitle).toContain("Court and tribunal hearings");
      expect(cy.pageTitle).toContain("Gwrandawiadau llys a thribiwnlys");
    });

    it("should have page title containing section name", () => {
      expect(en.pageTitle).toContain("Manual upload");
      expect(cy.pageTitle).toContain("Uwchlwytho â llaw");
    });
  });

  describe("Link text validation", () => {
    it("should have action-oriented link text in English", () => {
      expect(en.uploadAnotherLink).toMatch(/upload/i);
      expect(en.removeFileLink).toMatch(/remove/i);
      expect(en.homeLink).toMatch(/home/i);
    });

    it("should have descriptive link text avoiding generic phrases", () => {
      expect(en.uploadAnotherLink).not.toBe("Click here");
      expect(en.removeFileLink).not.toBe("Click here");
      expect(en.homeLink).not.toBe("Click here");
    });
  });

  describe("Success messaging", () => {
    it("should have positive success message in English", () => {
      expect(en.title).toContain("successful");
      expect(en.uploadedMessage).toContain("uploaded");
    });

    it("should have positive success message in Welsh", () => {
      expect(cy.title).toContain("llwyddo");
      expect(cy.uploadedMessage).toContain("huwchlwytho");
    });
  });
});
