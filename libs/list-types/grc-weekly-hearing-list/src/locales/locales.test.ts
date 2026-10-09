import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

describe("grc locales", () => {
  describe("cy", () => {
    it("should have the same keys as en", () => {
      expect(Object.keys(cy).sort()).toEqual(Object.keys(en).sort());
      expect(Object.keys(cy.tableHeaders).sort()).toEqual(Object.keys(en.tableHeaders).sort());
    });

    it("should translate every table heading", () => {
      for (const [key, heading] of Object.entries(cy.tableHeaders)) {
        expect(heading).not.toContain("WELSH TRANSLATION REQUIRED");
        expect(heading).not.toBe(en.tableHeaders[key as keyof typeof en.tableHeaders]);
      }
    });

    it("should translate the page title and important information", () => {
      for (const text of [cy.pageTitle, cy.importantInformationText, cy.importantInformationRecordingText, cy.importantInformationLink2Text]) {
        expect(text).not.toContain("WELSH TRANSLATION REQUIRED");
      }
    });
  });
});
