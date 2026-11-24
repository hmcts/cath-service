import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/reference-data/index-tiles.njk";

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
});

describe("reference-data tiles template", () => {
  it("should render the heading and one tile per option", () => {
    const { $ } = render(env, TEMPLATE, { ...en });

    expect($("h1").text().trim()).toBe(en.title);
    expect($("div.admin-tile")).toHaveLength(en.options.length);
  });

  it("should make only the tile heading a link to the option destination", () => {
    const { $ } = render(env, TEMPLATE, { ...en });

    en.options.forEach((option) => {
      const link = $(`a.admin-tile__link[href="${option.href}"]`);
      expect(link).toHaveLength(1);
      expect(link.text()).toBe(option.label);
      expect(link.parent().is("h2.admin-tile__heading")).toBe(true);
      expect(link.closest(".admin-tile").find(".admin-tile__description").text()).toBe(option.description);
    });
  });

  it("should render exactly one link per tile with the description outside the link", () => {
    const { $ } = render(env, TEMPLATE, { ...en });

    $("div.admin-tile").each((_, tile) => {
      expect($(tile).find("a")).toHaveLength(1);
      expect($(tile).find(".admin-tile__description").closest("a")).toHaveLength(0);
    });
    expect($("a.admin-tile")).toHaveLength(0);
  });

  it("should render Welsh tile headings", () => {
    const { $ } = render(env, TEMPLATE, { ...cy });

    expect($("h1").text().trim()).toBe(cy.title);
    expect(
      $("a.admin-tile__link")
        .map((_, el) => $(el).text())
        .get()
    ).toEqual(cy.options.map((option) => option.label));
  });
});
