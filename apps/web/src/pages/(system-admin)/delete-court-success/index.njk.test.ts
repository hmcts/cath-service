import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("delete-court-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    // Set up Nunjucks with paths to templates
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // pages directory
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts
    ]);
  });

  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required properties", () => {
      expect(en).toHaveProperty("pageTitle");
      expect(en).toHaveProperty("bannerText");
      expect(en).toHaveProperty("nextStepsTitle");
      expect(en).toHaveProperty("removeAnotherCourtLink");
      expect(en).toHaveProperty("uploadReferenceDataLink");
      expect(en).toHaveProperty("homeLink");
    });

    it("should have correct page title", () => {
      expect(en.pageTitle).toBe("Delete successful");
    });

    it("should have correct banner text", () => {
      expect(en.bannerText).toBe("Court has been deleted");
    });

    it("should have correct next steps title", () => {
      expect(en.nextStepsTitle).toBe("What do you want to do next?");
    });

    it("should have correct link texts", () => {
      expect(en.removeAnotherCourtLink).toBe("Remove another court");
      expect(en.uploadReferenceDataLink).toBe("Upload Reference Data");
      expect(en.homeLink).toBe("Home");
    });

    it("should have all text as non-empty strings", () => {
      Object.values(en).forEach((value) => {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Welsh locale", () => {
    it("should have required properties", () => {
      expect(cy).toHaveProperty("pageTitle");
      expect(cy).toHaveProperty("bannerText");
      expect(cy).toHaveProperty("nextStepsTitle");
      expect(cy).toHaveProperty("removeAnotherCourtLink");
      expect(cy).toHaveProperty("uploadReferenceDataLink");
      expect(cy).toHaveProperty("homeLink");
    });

    it("should have correct page title", () => {
      expect(cy.pageTitle).toBe("Wedi llwyddo i ddileu");
    });

    it("should have correct banner text", () => {
      expect(cy.bannerText).toBe("Mae'r llys wedi'i ddileu");
    });

    it("should have correct next steps title", () => {
      expect(cy.nextStepsTitle).toBe("Beth hoffech chi ei wneud nesaf?");
    });

    it("should have correct link texts", () => {
      expect(cy.removeAnotherCourtLink).toBe("Dileu llys arall");
      expect(cy.uploadReferenceDataLink).toBe("Uwchlwytho Data Cyfeirio");
      expect(cy.homeLink).toBe("Hafan");
    });

    it("should have all text as non-empty strings", () => {
      Object.values(cy).forEach((value) => {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it("should have same structure as English locale", () => {
      expect(Object.keys(cy).sort()).toEqual(Object.keys(en).sort());
    });
  });

  describe("English content", () => {
    it("should render success panel with correct title and text", () => {
      const data = {
        pageTitle: en.pageTitle,
        bannerText: en.bannerText,
        nextStepsTitle: en.nextStepsTitle,
        removeAnotherCourtLink: en.removeAnotherCourtLink,
        uploadReferenceDataLink: en.uploadReferenceDataLink,
        homeLink: en.homeLink,
        locale: "en"
      };

      const { $ } = render(env, "(system-admin)/delete-court-success/index.njk", data);

      const panel = $(".govuk-panel");
      expect(panel).toHaveLength(1);
      expect($(".govuk-panel__title").text().trim()).toBe(en.pageTitle);
      expect($(".govuk-panel__body").text().trim()).toBe(en.bannerText);
    });

    it("should render next steps heading", () => {
      const data = {
        pageTitle: en.pageTitle,
        bannerText: en.bannerText,
        nextStepsTitle: en.nextStepsTitle,
        removeAnotherCourtLink: en.removeAnotherCourtLink,
        uploadReferenceDataLink: en.uploadReferenceDataLink,
        homeLink: en.homeLink,
        locale: "en"
      };

      const { $ } = render(env, "(system-admin)/delete-court-success/index.njk", data);

      expect($("h2.govuk-heading-m").text()).toBe(en.nextStepsTitle);
    });

    it("should render all three navigation links", () => {
      const data = {
        pageTitle: en.pageTitle,
        bannerText: en.bannerText,
        nextStepsTitle: en.nextStepsTitle,
        removeAnotherCourtLink: en.removeAnotherCourtLink,
        uploadReferenceDataLink: en.uploadReferenceDataLink,
        homeLink: en.homeLink,
        locale: "en"
      };

      const { $ } = render(env, "(system-admin)/delete-court-success/index.njk", data);

      const links = $(".govuk-list a");
      expect(links).toHaveLength(3);

      // Check "Remove another court" link
      const removeLink = $('a[href="/delete-court"]');
      expect(removeLink).toHaveLength(1);
      expect(removeLink.text()).toBe(en.removeAnotherCourtLink);

      // Check "Upload Reference Data" link
      const uploadLink = $('a[href="/reference-data-upload"]');
      expect(uploadLink).toHaveLength(1);
      expect(uploadLink.text()).toBe(en.uploadReferenceDataLink);

      // Check "Home" link
      const homeLink = $('a[href="/system-admin-dashboard"]');
      expect(homeLink).toHaveLength(1);
      expect(homeLink.text()).toBe(en.homeLink);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh success panel", () => {
      const data = {
        pageTitle: cy.pageTitle,
        bannerText: cy.bannerText,
        nextStepsTitle: cy.nextStepsTitle,
        removeAnotherCourtLink: cy.removeAnotherCourtLink,
        uploadReferenceDataLink: cy.uploadReferenceDataLink,
        homeLink: cy.homeLink,
        locale: "cy"
      };

      const { $ } = render(env, "(system-admin)/delete-court-success/index.njk", data);

      expect($(".govuk-panel__title").text().trim()).toBe(cy.pageTitle);
      expect($(".govuk-panel__body").text().trim()).toBe(cy.bannerText);
      expect($("h2.govuk-heading-m").text()).toBe(cy.nextStepsTitle);
    });

    it("should render Welsh navigation links", () => {
      const data = {
        pageTitle: cy.pageTitle,
        bannerText: cy.bannerText,
        nextStepsTitle: cy.nextStepsTitle,
        removeAnotherCourtLink: cy.removeAnotherCourtLink,
        uploadReferenceDataLink: cy.uploadReferenceDataLink,
        homeLink: cy.homeLink,
        locale: "cy"
      };

      const { $ } = render(env, "(system-admin)/delete-court-success/index.njk", data);

      const removeLink = $('a[href="/delete-court?lng=cy"]');
      expect(removeLink.text()).toBe(cy.removeAnotherCourtLink);

      const uploadLink = $('a[href="/reference-data-upload?lng=cy"]');
      expect(uploadLink.text()).toBe(cy.uploadReferenceDataLink);

      const homeLink = $('a[href="/system-admin-dashboard?lng=cy"]');
      expect(homeLink.text()).toBe(cy.homeLink);
    });

    it("should add lng=cy query parameter to links when locale is Welsh", () => {
      const data = {
        pageTitle: cy.pageTitle,
        bannerText: cy.bannerText,
        nextStepsTitle: cy.nextStepsTitle,
        removeAnotherCourtLink: cy.removeAnotherCourtLink,
        uploadReferenceDataLink: cy.uploadReferenceDataLink,
        homeLink: cy.homeLink,
        locale: "cy"
      };

      const { $ } = render(env, "(system-admin)/delete-court-success/index.njk", data);

      expect($('a[href="/delete-court?lng=cy"]')).toHaveLength(1);
      expect($('a[href="/reference-data-upload?lng=cy"]')).toHaveLength(1);
      expect($('a[href="/system-admin-dashboard?lng=cy"]')).toHaveLength(1);
    });
  });
});
