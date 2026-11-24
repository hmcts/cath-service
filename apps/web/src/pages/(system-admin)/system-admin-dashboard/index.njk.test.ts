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

const TEMPLATE = "(system-admin)/system-admin-dashboard/index.njk";

describe("system-admin-dashboard template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");

      const exists = existsSync(templatePath);

      expect(exists).toBe(true);
    });
  });

  describe("Template rendering", () => {
    let env: nunjucks.Environment;

    beforeEach(() => {
      env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
    });

    it("should render the English heading and a tile link for every configured tile", () => {
      const data = { ...en, user: { id: "admin-1" } };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.title);
      const tiles = $("div.admin-tile");
      expect(tiles).toHaveLength(11);
      expect(tiles).toHaveLength(en.tiles.length);
      en.tiles.forEach((tile) => {
        const link = $(`a.admin-tile__link[href="${tile.href}"]`);
        expect(link).toHaveLength(1);
        expect(link.text()).toBe(tile.title);
        expect(link.parent().is("h2.admin-tile__heading")).toBe(true);
        expect(link.closest(".admin-tile").find(".admin-tile__description").text()).toBe(tile.description);
      });
    });

    it("should render exactly one link per tile with the description outside the link", () => {
      const data = { ...en, user: { id: "admin-1" } };

      const { $ } = render(env, TEMPLATE, data);

      $("div.admin-tile").each((_, tile) => {
        expect($(tile).find("a")).toHaveLength(1);
        expect($(tile).find(".admin-tile__description").closest("a")).toHaveLength(0);
      });
      expect($("a.admin-tile")).toHaveLength(0);
    });

    it("should render the Download MI Report tile linking to /mi-report", () => {
      const data = { ...en, user: { id: "admin-1" } };

      const { $ } = render(env, TEMPLATE, data);

      const link = $('a.admin-tile__link[href="/mi-report"]');
      expect(link).toHaveLength(1);
      expect(link.text()).toBe("Download MI Report");
    });

    it("should render the Welsh heading and tiles", () => {
      const data = { ...cy, user: { id: "admin-1" } };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.title);
      expect($("div.admin-tile")).toHaveLength(cy.tiles.length);
      expect($(`a.admin-tile__link[href="${cy.tiles[0].href}"]`).text()).toBe(cy.tiles[0].title);
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      expect(en).toHaveProperty("title");
      expect(en).toHaveProperty("tiles");
      expect(cy).toHaveProperty("title");
      expect(cy).toHaveProperty("tiles");
    });
  });
});
