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

  describe("English content", () => {
    it("should render success panel with correct title and text", () => {
      // Arrange
      const data = {
        pageTitle: en.pageTitle,
        bannerText: en.bannerText,
        nextStepsTitle: en.nextStepsTitle,
        removeAnotherCourtLink: en.removeAnotherCourtLink,
        uploadReferenceDataLink: en.uploadReferenceDataLink,
        homeLink: en.homeLink,
        locale: "en"
      };

      // Act
      const { $ } = render(env, "(system-admin)/delete-court-success/index.njk", data);

      // Assert - Check the success panel
      const panel = $(".govuk-panel");
      expect(panel).toHaveLength(1);
      expect($(".govuk-panel__title").text().trim()).toBe(en.pageTitle);
      expect($(".govuk-panel__body").text().trim()).toBe(en.bannerText);
    });

    it("should render next steps heading", () => {
      // Arrange
      const data = {
        pageTitle: en.pageTitle,
        bannerText: en.bannerText,
        nextStepsTitle: en.nextStepsTitle,
        removeAnotherCourtLink: en.removeAnotherCourtLink,
        uploadReferenceDataLink: en.uploadReferenceDataLink,
        homeLink: en.homeLink,
        locale: "en"
      };

      // Act
      const { $ } = render(env, "(system-admin)/delete-court-success/index.njk", data);

      // Assert
      expect($("h2.govuk-heading-m").text()).toBe(en.nextStepsTitle);
    });

    it("should render all three navigation links", () => {
      // Arrange
      const data = {
        pageTitle: en.pageTitle,
        bannerText: en.bannerText,
        nextStepsTitle: en.nextStepsTitle,
        removeAnotherCourtLink: en.removeAnotherCourtLink,
        uploadReferenceDataLink: en.uploadReferenceDataLink,
        homeLink: en.homeLink,
        locale: "en"
      };

      // Act
      const { $ } = render(env, "(system-admin)/delete-court-success/index.njk", data);

      // Assert - Check all three links exist
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
      // Arrange
      const data = {
        pageTitle: cy.pageTitle,
        bannerText: cy.bannerText,
        nextStepsTitle: cy.nextStepsTitle,
        removeAnotherCourtLink: cy.removeAnotherCourtLink,
        uploadReferenceDataLink: cy.uploadReferenceDataLink,
        homeLink: cy.homeLink,
        locale: "cy"
      };

      // Act
      const { $ } = render(env, "(system-admin)/delete-court-success/index.njk", data);

      // Assert
      expect($(".govuk-panel__title").text().trim()).toBe(cy.pageTitle);
      expect($(".govuk-panel__body").text().trim()).toBe(cy.bannerText);
      expect($("h2.govuk-heading-m").text()).toBe(cy.nextStepsTitle);
    });

    it("should render Welsh navigation links", () => {
      // Arrange
      const data = {
        pageTitle: cy.pageTitle,
        bannerText: cy.bannerText,
        nextStepsTitle: cy.nextStepsTitle,
        removeAnotherCourtLink: cy.removeAnotherCourtLink,
        uploadReferenceDataLink: cy.uploadReferenceDataLink,
        homeLink: cy.homeLink,
        locale: "cy"
      };

      // Act
      const { $ } = render(env, "(system-admin)/delete-court-success/index.njk", data);

      // Assert - Check Welsh link text
      const removeLink = $('a[href="/delete-court?lng=cy"]');
      expect(removeLink.text()).toBe(cy.removeAnotherCourtLink);

      const uploadLink = $('a[href="/reference-data-upload?lng=cy"]');
      expect(uploadLink.text()).toBe(cy.uploadReferenceDataLink);

      const homeLink = $('a[href="/system-admin-dashboard?lng=cy"]');
      expect(homeLink.text()).toBe(cy.homeLink);
    });

    it("should add lng=cy query parameter to links when locale is Welsh", () => {
      // Arrange
      const data = {
        pageTitle: cy.pageTitle,
        bannerText: cy.bannerText,
        nextStepsTitle: cy.nextStepsTitle,
        removeAnotherCourtLink: cy.removeAnotherCourtLink,
        uploadReferenceDataLink: cy.uploadReferenceDataLink,
        homeLink: cy.homeLink,
        locale: "cy"
      };

      // Act
      const { $ } = render(env, "(system-admin)/delete-court-success/index.njk", data);

      // Assert - All links should have ?lng=cy
      expect($('a[href="/delete-court?lng=cy"]')).toHaveLength(1);
      expect($('a[href="/reference-data-upload?lng=cy"]')).toHaveLength(1);
      expect($('a[href="/system-admin-dashboard?lng=cy"]')).toHaveLength(1);
    });
  });
});
