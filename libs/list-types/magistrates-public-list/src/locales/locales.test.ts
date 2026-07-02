import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const FACT_URL = "https://www.find-court-tribunal.service.gov.uk/";

describe("magistrates-public-list locales", () => {
  describe("key parity", () => {
    it("should have the same keys in en and cy", () => {
      expect(Object.keys(cy).sort()).toEqual(Object.keys(en).sort());
    });

    it("should have no empty string values in en", () => {
      const emptyKeys = Object.entries(en)
        .filter(([, v]) => typeof v === "string" && v.trim() === "")
        .map(([k]) => k);
      expect(emptyKeys).toHaveLength(0);
    });

    it("should have no empty string values in cy", () => {
      const emptyKeys = Object.entries(cy)
        .filter(([, v]) => typeof v === "string" && v.trim() === "")
        .map(([k]) => k);
      expect(emptyKeys).toHaveLength(0);
    });
  });

  describe("factLink keys", () => {
    it("should have factLinkUrl pointing to FaCT service in en", () => {
      expect(en.factLinkUrl).toBe(FACT_URL);
    });

    it("should have factLinkUrl pointing to FaCT service in cy", () => {
      expect(cy.factLinkUrl).toBe(FACT_URL);
    });

    it("should have non-empty factLinkText in en", () => {
      expect(en.factLinkText.length).toBeGreaterThan(0);
    });

    it("should have non-empty factLinkText in cy", () => {
      expect(cy.factLinkText.length).toBeGreaterThan(0);
    });

    it("should have non-empty factAdditionalText in en", () => {
      expect(en.factAdditionalText.length).toBeGreaterThan(0);
    });

    it("should have non-empty factAdditionalText in cy", () => {
      expect(cy.factAdditionalText.length).toBeGreaterThan(0);
    });

    it("should have different factLinkText in en and cy", () => {
      expect(cy.factLinkText).not.toBe(en.factLinkText);
    });

    it("should have different factAdditionalText in en and cy", () => {
      expect(cy.factAdditionalText).not.toBe(en.factAdditionalText);
    });
  });

  describe("restriction information keys", () => {
    it("should have restrictionInformationHeading in both locales", () => {
      expect(en.restrictionInformationHeading.length).toBeGreaterThan(0);
      expect(cy.restrictionInformationHeading.length).toBeGreaterThan(0);
    });

    it("should have restrictionBulletPoint1 and restrictionBulletPoint2 in both locales", () => {
      expect(en.restrictionBulletPoint1.length).toBeGreaterThan(0);
      expect(en.restrictionBulletPoint2.length).toBeGreaterThan(0);
      expect(cy.restrictionBulletPoint1.length).toBeGreaterThan(0);
      expect(cy.restrictionBulletPoint2.length).toBeGreaterThan(0);
    });
  });
});
