import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

describe("siac-poac-paac locales", () => {
  describe("en", () => {
    it("should have importantInformationText as a separate field without the venue", () => {
      expect(en.importantInformationText).toContain("anonymity");
      expect(en.importantInformationText).not.toContain("Field House");
    });

    it("should have importantInformationVenue as a separate field on a new line", () => {
      expect(en.importantInformationVenue).toBe("All hearings take place at Field House, 15-25 Bream's Buildings, London EC4A 1DZ.");
    });
  });

  describe("cy", () => {
    it("should have importantInformationText as a separate field without the venue", () => {
      expect(cy.importantInformationText).toContain("ddienw");
      expect(cy.importantInformationText).not.toContain("Field House");
    });

    it("should have importantInformationVenue as a separate field on a new line", () => {
      expect(cy.importantInformationVenue).toBe("Cynhelir pob gwrandawiad yn Field House, 15-25 Bream's Buildings, Llundain EC4A 1DZ.");
    });

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
  });
});
