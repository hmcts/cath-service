import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("account-home template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required page title", () => {
      expect(en.pageTitle).toBe("Dashboard - Your account");
    });

    it("should have required title", () => {
      expect(en.title).toBe("Your account");
    });

    it("should have court hearings section", () => {
      expect(en.sections.courtHearings).toBeDefined();
      expect(en.sections.courtHearings.title).toBe("Court and tribunal hearings");
      expect(en.sections.courtHearings.href).toBe("/search");
    });

    it("should have SJP cases section", () => {
      expect(en.sections.sjpCases).toBeDefined();
      expect(en.sections.sjpCases.title).toBe("Single Justice Procedure cases");
      expect(en.sections.sjpCases.href).toBe("/summary-of-publications?locationId=9");
    });

    it("should have email subscriptions section", () => {
      expect(en.sections.emailSubscriptions).toBeDefined();
      expect(en.sections.emailSubscriptions.title).toBe("Email subscriptions");
      expect(en.sections.emailSubscriptions.href).toBe("/");
    });

    it("should have descriptions in locale data", () => {
      expect(en.sections.courtHearings.description).toBeDefined();
      expect(en.sections.sjpCases.description).toBeDefined();
      expect(en.sections.emailSubscriptions.description).toBeDefined();
    });
  });

  describe("Welsh locale", () => {
    it("should have required page title", () => {
      expect(cy.pageTitle).toBe("Dangosfwrdd - Eich cyfrif");
    });

    it("should have required title", () => {
      expect(cy.title).toBe("Eich cyfrif");
    });

    it("should have court hearings section", () => {
      expect(cy.sections.courtHearings).toBeDefined();
      expect(cy.sections.courtHearings.title).toBe("Gwrandawiadau llys a thribiwnlys");
      expect(cy.sections.courtHearings.href).toBe("/search");
    });

    it("should have SJP cases section", () => {
      expect(cy.sections.sjpCases).toBeDefined();
      expect(cy.sections.sjpCases.title).toBe("Achosion Gweithdrefn Ynad Unigol");
      expect(cy.sections.sjpCases.href).toBe("/summary-of-publications?locationId=9");
    });

    it("should have email subscriptions section", () => {
      expect(cy.sections.emailSubscriptions).toBeDefined();
      expect(cy.sections.emailSubscriptions.title).toBe("Tanysgrifiadau e-bost");
      expect(cy.sections.emailSubscriptions.href).toBe("/");
    });

    it("should have descriptions in locale data", () => {
      expect(cy.sections.courtHearings.description).toBeDefined();
      expect(cy.sections.sjpCases.description).toBeDefined();
      expect(cy.sections.emailSubscriptions.description).toBeDefined();
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have same section keys", () => {
      expect(Object.keys(en.sections).sort()).toEqual(Object.keys(cy.sections).sort());
    });

    it("should have same properties for each section", () => {
      for (const sectionKey of Object.keys(en.sections)) {
        const enSection = en.sections[sectionKey as keyof typeof en.sections];
        const cySection = cy.sections[sectionKey as keyof typeof cy.sections];
        expect(Object.keys(enSection).sort()).toEqual(Object.keys(cySection).sort());
      }
    });

    it("should have all required section properties", () => {
      const requiredProps = ["title", "description", "href"];

      for (const section of Object.values(en.sections)) {
        requiredProps.forEach((prop) => {
          expect(section).toHaveProperty(prop);
        });
      }

      for (const section of Object.values(cy.sections)) {
        requiredProps.forEach((prop) => {
          expect(section).toHaveProperty(prop);
        });
      }
    });
  });

  describe("Content validation", () => {
    it("should have non-empty strings for all English content", () => {
      expect(en.pageTitle.length).toBeGreaterThan(0);
      expect(en.title.length).toBeGreaterThan(0);

      for (const section of Object.values(en.sections)) {
        expect(section.title.length).toBeGreaterThan(0);
        expect(section.description.length).toBeGreaterThan(0);
        expect(section.href.length).toBeGreaterThan(0);
      }
    });

    it("should have non-empty strings for all Welsh content", () => {
      expect(cy.pageTitle.length).toBeGreaterThan(0);
      expect(cy.title.length).toBeGreaterThan(0);

      for (const section of Object.values(cy.sections)) {
        expect(section.title.length).toBeGreaterThan(0);
        expect(section.description.length).toBeGreaterThan(0);
        expect(section.href.length).toBeGreaterThan(0);
      }
    });

    it("should have valid href URLs", () => {
      for (const section of Object.values(en.sections)) {
        expect(section.href).toMatch(/^\//);
      }

      for (const section of Object.values(cy.sections)) {
        expect(section.href).toMatch(/^\//);
      }
    });
  });
});
