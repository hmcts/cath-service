import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "(system-admin)/migration/index.njk";

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
});

function renderPage(locale: typeof en | typeof cy = en, lngParam = "") {
  return render(env, TEMPLATE, { ...locale, lngParam, tiles: locale.tiles.map((tile) => ({ ...tile, href: `${tile.href}${lngParam}` })) });
}

describe("migration template", () => {
  it("should render the heading and one tile linking to the connection check", () => {
    const { $ } = renderPage();

    expect($("h1").text()).toContain(en.title);
    expect($("a.admin-tile")).toHaveLength(1);
    expect($('a.admin-tile[href="/migration-connection-check"] .admin-tile__heading').text()).toBe(en.tiles[0].title);
    expect($("a.admin-tile .admin-tile__description").text()).toBe(en.tiles[0].description);
  });

  it("should render a back link to the dashboard", () => {
    const { $ } = renderPage();

    expect($('a.govuk-back-link[href="/system-admin-dashboard"]').text()).toBe(en.back);
  });

  it("should render Welsh content and keep the language on links", () => {
    const { $ } = renderPage(cy, "?lng=cy");

    expect($("h1").text()).toContain(cy.title);
    expect($('a.admin-tile[href="/migration-connection-check?lng=cy"]')).toHaveLength(1);
    expect($('a.govuk-back-link[href="/system-admin-dashboard?lng=cy"]').text()).toBe(cy.back);
  });

  it("should have the same content keys in English and Welsh", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    expect(Object.keys(en.tiles[0]).sort()).toEqual(Object.keys(cy.tiles[0]).sort());
  });
});
