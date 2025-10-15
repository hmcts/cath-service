import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cy, en } from "../locales/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("index template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required title", () => {
      expect(en.title).toBe("HMCTS Express Monorepo Template");
    });

    it("should have subtitle", () => {
      expect(en.subtitle).toBeDefined();
      expect(en.subtitle.length).toBeGreaterThan(0);
    });

    it("should have intro text", () => {
      expect(en.intro).toBeDefined();
      expect(en.intro.length).toBeGreaterThan(0);
    });

    it("should have cloud native section", () => {
      expect(en.cloudNativeTitle).toBeDefined();
      expect(en.cloudNativeDescription).toBeDefined();
      expect(en.cloudNativeFeatures).toBeDefined();
      expect(Array.isArray(en.cloudNativeFeatures)).toBe(true);
      expect(en.cloudNativeFeatures.length).toBeGreaterThan(0);
    });

    it("should have GOV.UK starter section", () => {
      expect(en.govukStarterTitle).toBeDefined();
      expect(en.govukStarterDescription).toBeDefined();
      expect(en.govukStarterFeatures).toBeDefined();
      expect(Array.isArray(en.govukStarterFeatures)).toBe(true);
      expect(en.govukStarterFeatures.length).toBeGreaterThan(0);
    });

    it("should have simple router section", () => {
      expect(en.simpleRouterTitle).toBeDefined();
      expect(en.simpleRouterDescription).toBeDefined();
      expect(en.simpleRouterFeatures).toBeDefined();
      expect(Array.isArray(en.simpleRouterFeatures)).toBe(true);
      expect(en.simpleRouterFeatures.length).toBeGreaterThan(0);
    });

    it("should have architecture section", () => {
      expect(en.architectureTitle).toBeDefined();
      expect(en.architectureDescription).toBeDefined();
      expect(en.architectureFeatures).toBeDefined();
      expect(Array.isArray(en.architectureFeatures)).toBe(true);
      expect(en.architectureFeatures.length).toBeGreaterThan(0);
    });

    it("should have getting started section", () => {
      expect(en.gettingStartedTitle).toBeDefined();
      expect(en.gettingStartedSteps).toBeDefined();
      expect(Array.isArray(en.gettingStartedSteps)).toBe(true);
      expect(en.gettingStartedSteps.length).toBeGreaterThan(0);
    });

    it("should have learn more section", () => {
      expect(en.learnMoreTitle).toBeDefined();
      expect(en.learnMoreDescription).toBeDefined();
      expect(en.exampleFormTitle).toBeDefined();
      expect(en.exampleFormDescription).toBeDefined();
      expect(en.exampleFormLinkText).toBeDefined();
    });
  });

  describe("Welsh locale", () => {
    it("should have required title", () => {
      expect(cy.title).toBe("Templed Monorepo Express HMCTS");
    });

    it("should have subtitle", () => {
      expect(cy.subtitle).toBeDefined();
      expect(cy.subtitle.length).toBeGreaterThan(0);
    });

    it("should have intro text", () => {
      expect(cy.intro).toBeDefined();
      expect(cy.intro.length).toBeGreaterThan(0);
    });

    it("should have cloud native section", () => {
      expect(cy.cloudNativeTitle).toBeDefined();
      expect(cy.cloudNativeDescription).toBeDefined();
      expect(cy.cloudNativeFeatures).toBeDefined();
      expect(Array.isArray(cy.cloudNativeFeatures)).toBe(true);
      expect(cy.cloudNativeFeatures.length).toBeGreaterThan(0);
    });

    it("should have GOV.UK starter section", () => {
      expect(cy.govukStarterTitle).toBeDefined();
      expect(cy.govukStarterDescription).toBeDefined();
      expect(cy.govukStarterFeatures).toBeDefined();
      expect(Array.isArray(cy.govukStarterFeatures)).toBe(true);
      expect(cy.govukStarterFeatures.length).toBeGreaterThan(0);
    });

    it("should have simple router section", () => {
      expect(cy.simpleRouterTitle).toBeDefined();
      expect(cy.simpleRouterDescription).toBeDefined();
      expect(cy.simpleRouterFeatures).toBeDefined();
      expect(Array.isArray(cy.simpleRouterFeatures)).toBe(true);
      expect(cy.simpleRouterFeatures.length).toBeGreaterThan(0);
    });

    it("should have architecture section", () => {
      expect(cy.architectureTitle).toBeDefined();
      expect(cy.architectureDescription).toBeDefined();
      expect(cy.architectureFeatures).toBeDefined();
      expect(Array.isArray(cy.architectureFeatures)).toBe(true);
      expect(cy.architectureFeatures.length).toBeGreaterThan(0);
    });

    it("should have getting started section", () => {
      expect(cy.gettingStartedTitle).toBeDefined();
      expect(cy.gettingStartedSteps).toBeDefined();
      expect(Array.isArray(cy.gettingStartedSteps)).toBe(true);
      expect(cy.gettingStartedSteps.length).toBeGreaterThan(0);
    });

    it("should have learn more section", () => {
      expect(cy.learnMoreTitle).toBeDefined();
      expect(cy.learnMoreDescription).toBeDefined();
      expect(cy.exampleFormTitle).toBeDefined();
      expect(cy.exampleFormDescription).toBeDefined();
      expect(cy.exampleFormLinkText).toBeDefined();
    });
  });

  describe("Locale consistency", () => {
    it("should have same structure in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have same number of cloud native features", () => {
      expect(en.cloudNativeFeatures.length).toBe(cy.cloudNativeFeatures.length);
    });

    it("should have same number of GOV.UK starter features", () => {
      expect(en.govukStarterFeatures.length).toBe(cy.govukStarterFeatures.length);
    });

    it("should have same number of simple router features", () => {
      expect(en.simpleRouterFeatures.length).toBe(cy.simpleRouterFeatures.length);
    });

    it("should have same number of architecture features", () => {
      expect(en.architectureFeatures.length).toBe(cy.architectureFeatures.length);
    });

    it("should have same number of getting started steps", () => {
      expect(en.gettingStartedSteps.length).toBe(cy.gettingStartedSteps.length);
    });
  });

  describe("Feature structures", () => {
    it("should have name and description in cloud native features", () => {
      en.cloudNativeFeatures.forEach((feature: any) => {
        expect(feature.name).toBeDefined();
        expect(feature.description).toBeDefined();
      });
    });

    it("should have name and description in GOV.UK starter features", () => {
      en.govukStarterFeatures.forEach((feature: any) => {
        expect(feature.name).toBeDefined();
        expect(feature.description).toBeDefined();
      });
    });

    it("should have name and description in simple router features", () => {
      en.simpleRouterFeatures.forEach((feature: any) => {
        expect(feature.name).toBeDefined();
        expect(feature.description).toBeDefined();
      });
    });

    it("should have text and code in getting started steps", () => {
      en.gettingStartedSteps.forEach((step: any) => {
        expect(step.text).toBeDefined();
        expect(step.code).toBeDefined();
      });
    });
  });
});
