import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(admin)/admin-dashboard/index.njk";

describe("admin-dashboard template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have page title", () => {
      expect(en.pageTitle).toBe("Admin Dashboard");
    });

    it("should have four tiles", () => {
      expect(en.tiles).toHaveLength(4);
    });

    it("should have Upload tile", () => {
      expect(en.tiles[0].heading).toBe("Upload");
      expect(en.tiles[0].description).toBe("Upload a file to be published on the external facing service on GOV.UK");
    });

    it("should have Upload Excel File tile", () => {
      expect(en.tiles[1].heading).toBe("Upload Excel File");
      expect(en.tiles[1].description).toBe("Upload an excel file to be converted and displayed on the external facing service on GOV.UK");
    });

    it("should have Remove tile", () => {
      expect(en.tiles[2].heading).toBe("Remove");
      expect(en.tiles[2].description).toBe("Search by court or tribunal and remove a publication from the external facing service on GOV.UK");
    });

    it("should have Manage Media Account Requests tile", () => {
      expect(en.tiles[3].heading).toBe("Manage Media Account Requests");
      expect(en.tiles[3].description).toBe("CTSC assess new media account applications");
    });
  });

  describe("Welsh locale", () => {
    it("should have page title", () => {
      expect(cy.pageTitle).toBeDefined();
      expect(cy.pageTitle.length).toBeGreaterThan(0);
    });

    it("should have four tiles", () => {
      expect(cy.tiles).toHaveLength(4);
    });

    it("should have all tiles with heading and description", () => {
      cy.tiles.forEach((tile) => {
        expect(tile.heading).toBeDefined();
        expect(tile.heading.length).toBeGreaterThan(0);
        expect(tile.description).toBeDefined();
        expect(tile.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = ["pageTitle", "tiles"];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });

    it("should have same number of tiles in English and Welsh", () => {
      expect(en.tiles.length).toBe(cy.tiles.length);
    });

    it("should have consistent tile structure", () => {
      en.tiles.forEach((_tile, index) => {
        expect(cy.tiles[index]).toHaveProperty("heading");
        expect(cy.tiles[index]).toHaveProperty("description");
      });
    });
  });

  describe("Rendering", () => {
    let env: nunjucks.Environment;

    beforeEach(() => {
      env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
    });

    it("should render the page heading from English content", () => {
      // Arrange
      const data = { pageTitle: en.pageTitle, tiles: en.tiles, pendingCount: 0, notificationText: en.notificationText, notificationLink: en.notificationLink };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.pageTitle);
    });

    it("should render all four tiles with correct headings and links for a CTSC admin", () => {
      // Arrange
      const data = { pageTitle: en.pageTitle, tiles: en.tiles, pendingCount: 0, notificationText: en.notificationText, notificationLink: en.notificationLink };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const tiles = $("a.admin-tile");
      expect(tiles).toHaveLength(4);
      expect($('a[href="/manual-upload"] .admin-tile__heading').text()).toBe(en.tiles[0].heading);
      expect($('a[href="/non-strategic-upload"] .admin-tile__heading').text()).toBe(en.tiles[1].heading);
      expect($('a[href="/remove-list-search"] .admin-tile__heading').text()).toBe(en.tiles[2].heading);
      expect($('a[href="/media-applications"] .admin-tile__heading').text()).toBe(en.tiles[3].heading);
    });

    it("should render only three tiles for a local admin with three tiles", () => {
      // Arrange
      const data = {
        pageTitle: en.pageTitle,
        tiles: en.tiles.slice(0, 3),
        pendingCount: 0,
        notificationText: en.notificationText,
        notificationLink: en.notificationLink
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("a.admin-tile")).toHaveLength(3);
      expect($('a[href="/media-applications"]')).toHaveLength(0);
    });

    it("should not render the notification banner when pendingCount is zero", () => {
      // Arrange
      const data = { pageTitle: en.pageTitle, tiles: en.tiles, pendingCount: 0, notificationText: en.notificationText, notificationLink: en.notificationLink };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-notification-banner")).toHaveLength(0);
    });

    it("should render the notification banner with the pending count when there are outstanding requests", () => {
      // Arrange
      const data = { pageTitle: en.pageTitle, tiles: en.tiles, pendingCount: 5, notificationText: en.notificationText, notificationLink: en.notificationLink };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const banner = $(".govuk-notification-banner");
      expect(banner).toHaveLength(1);
      expect(banner.text()).toContain("There are 5 outstanding media requests.");
      expect($('.govuk-notification-banner__link[href="/media-applications"]').text()).toBe(en.notificationLink);
    });

    it("should render Welsh content when Welsh tiles are provided", () => {
      // Arrange
      const data = { pageTitle: cy.pageTitle, tiles: cy.tiles, pendingCount: 0, notificationText: cy.notificationText, notificationLink: cy.notificationLink };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.pageTitle);
      expect($('a[href="/media-applications"] .admin-tile__heading').text()).toBe(cy.tiles[3].heading);
    });

    it("should not render an error summary", () => {
      // Arrange
      const data = { pageTitle: en.pageTitle, tiles: en.tiles, pendingCount: 0, notificationText: en.notificationText, notificationLink: en.notificationLink };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });
  });
});
