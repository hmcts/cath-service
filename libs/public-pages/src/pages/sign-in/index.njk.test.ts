import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("select-account template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required title", () => {
      expect(en.title).toBe("How do you want to sign in?");
    });

    it("should have error summary title", () => {
      expect(en.errorSummaryTitle).toBe("There is a problem");
    });

    it("should have error message", () => {
      expect(en.errorMessage).toBe("Please select an option");
    });

    it("should have HMCTS account option", () => {
      expect(en.hmctsLabel).toBe("With a MyHMCTS account");
    });

    it("should have Common Platform account option", () => {
      expect(en.commonPlatformLabel).toBe("With a Common Platform account");
    });

    it("should have CaTH account option", () => {
      expect(en.cathLabel).toBe("With a Court and tribunal hearings account");
    });

    it("should have continue button text", () => {
      expect(en.continueButton).toBe("Continue");
    });

    it("should have create account text and link", () => {
      expect(en.createAccountText).toBe("Don't have a CaTH account?");
      expect(en.createAccountLink).toBe("Create one here");
    });
  });

  describe("Welsh locale", () => {
    it("should have required title", () => {
      expect(cy.title).toBe("Sut hoffech chi fewngofnodi?");
    });

    it("should have error summary title", () => {
      expect(cy.errorSummaryTitle).toBe("Mae yna broblem");
    });

    it("should have error message", () => {
      expect(cy.errorMessage).toBe("Rhaid dewis opsiwn");
    });

    it("should have HMCTS account option", () => {
      expect(cy.hmctsLabel).toBe("Gyda chyfrif MyHMCTS");
    });

    it("should have Common Platform account option", () => {
      expect(cy.commonPlatformLabel).toBe("Gyda chyfrif Common Platform");
    });

    it("should have CaTH account option", () => {
      expect(cy.cathLabel).toBe("Gyda chyfrif gwrandawiadau Llys a thribiwnlys");
    });

    it("should have continue button text", () => {
      expect(cy.continueButton).toBe("Parhau");
    });

    it("should have create account text and link", () => {
      expect(cy.createAccountText).toBe("Nid oes gennych gyfrif CaTH?");
      expect(cy.createAccountLink).toBe("Crëwch un yma");
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
        "hmctsLabel",
        "commonPlatformLabel",
        "cathLabel",
        "continueButton",
        "createAccountText",
        "createAccountLink"
      ];

      for (const key of requiredKeys) {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      }
    });
  });
});
