import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("accessibility-statement template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required title", () => {
      expect(en.title).toBe("Accessibility statement");
    });

    it("should have back to top text", () => {
      expect(en.backToTop).toBe("Back to top");
    });

    it("should have intro section", () => {
      expect(en.sections.intro).toBeDefined();
      expect(en.sections.intro.content).toBeDefined();
      expect(en.sections.intro.commitment).toBeDefined();
      expect(en.sections.intro.features).toBeInstanceOf(Array);
    });

    it("should have contact information", () => {
      expect(en.sections.feedback.contact.name).toBeDefined();
      expect(en.sections.feedback.contact.email).toBeDefined();
      expect(en.sections.feedback.contact.phone).toBeDefined();
      expect(en.sections.feedback.textRelay).toBeDefined();
      expect(en.sections.feedback.audioLoops).toBeDefined();
    });

    it("should have compliance section", () => {
      expect(en.sections.compliance.heading).toBeDefined();
      expect(en.sections.compliance.content).toBeDefined();
    });
  });

  describe("Welsh locale", () => {
    it("should have required title", () => {
      expect(cy.title).toBe("Datganiad hygyrchedd");
    });

    it("should have back to top text", () => {
      expect(cy.backToTop).toBe("Yn ôl i frig y dudalen");
    });

    it("should have intro section", () => {
      expect(cy.sections.intro).toBeDefined();
      expect(cy.sections.intro.content).toBeDefined();
      expect(cy.sections.intro.commitment).toBeDefined();
      expect(cy.sections.intro.features).toBeInstanceOf(Array);
    });

    it("should have contact information", () => {
      expect(cy.sections.feedback.contact.name).toBeDefined();
      expect(cy.sections.feedback.contact.email).toBeDefined();
      expect(cy.sections.feedback.contact.phone).toBeDefined();
      expect(cy.sections.feedback.textRelay).toBeDefined();
      expect(cy.sections.feedback.audioLoops).toBeDefined();
    });

    it("should have compliance section", () => {
      expect(cy.sections.compliance.heading).toBeDefined();
      expect(cy.sections.compliance.content).toBeDefined();
    });
  });

  describe("Locale consistency", () => {
    it("should have same structure in English and Welsh", () => {
      expect(Object.keys(en.sections)).toEqual(Object.keys(cy.sections));
    });

    it("should have same number of accessibility features", () => {
      expect(en.sections.intro.features.length).toBe(cy.sections.intro.features.length);
    });
  });
});
