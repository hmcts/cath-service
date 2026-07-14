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

  describe("Template rendering", () => {
    let env: nunjucks.Environment;

    beforeEach(() => {
      env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
    });

    it("should render the page heading from English content", () => {
      const data = { pageTitle: en.pageTitle, tiles: en.tiles, pendingCount: 0, notificationText: en.notificationText, notificationLink: en.notificationLink };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.pageTitle);
    });

    it("should render all four tiles with correct headings and links for a CTSC admin", () => {
      const data = { pageTitle: en.pageTitle, tiles: en.tiles, pendingCount: 0, notificationText: en.notificationText, notificationLink: en.notificationLink };

      const { $ } = render(env, TEMPLATE, data);

      expect($("a.admin-tile")).toHaveLength(4);
      expect($('a[href="/manual-upload"] .admin-tile__heading').text()).toBe(en.tiles[0].heading);
      expect($('a[href="/non-strategic-upload"] .admin-tile__heading').text()).toBe(en.tiles[1].heading);
      expect($('a[href="/remove-list-search"] .admin-tile__heading').text()).toBe(en.tiles[2].heading);
      expect($('a[href="/media-applications"] .admin-tile__heading').text()).toBe(en.tiles[3].heading);
      expect($('a[href="/manual-upload"] .admin-tile__description').text()).toBe(en.tiles[0].description);
    });

    it("should render only three tiles for a local admin with three tiles", () => {
      const data = {
        pageTitle: en.pageTitle,
        tiles: en.tiles.slice(0, 3),
        pendingCount: 0,
        notificationText: en.notificationText,
        notificationLink: en.notificationLink
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("a.admin-tile")).toHaveLength(3);
      expect($('a[href="/media-applications"]')).toHaveLength(0);
    });

    it("should not render the notification banner when pendingCount is zero", () => {
      const data = { pageTitle: en.pageTitle, tiles: en.tiles, pendingCount: 0, notificationText: en.notificationText, notificationLink: en.notificationLink };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-notification-banner")).toHaveLength(0);
    });

    it("should render the notification banner with the pending count when there are outstanding requests", () => {
      const data = { pageTitle: en.pageTitle, tiles: en.tiles, pendingCount: 5, notificationText: en.notificationText, notificationLink: en.notificationLink };

      const { $ } = render(env, TEMPLATE, data);

      const banner = $(".govuk-notification-banner");
      expect(banner).toHaveLength(1);
      expect(banner.text()).toContain(en.notificationText.replace("x", "5"));
      expect($('.govuk-notification-banner__link[href="/media-applications"]').text()).toBe(en.notificationLink);
    });

    it("should render Welsh content when Welsh tiles are provided", () => {
      const data = { pageTitle: cy.pageTitle, tiles: cy.tiles, pendingCount: 0, notificationText: cy.notificationText, notificationLink: cy.notificationLink };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.pageTitle);
      expect($('a[href="/media-applications"] .admin-tile__heading').text()).toBe(cy.tiles[3].heading);
    });

    it("should not render an error summary", () => {
      const data = { pageTitle: en.pageTitle, tiles: en.tiles, pendingCount: 0, notificationText: en.notificationText, notificationLink: en.notificationLink };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = ["pageTitle", "tiles", "notificationText", "notificationLink"];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });
  });
});
