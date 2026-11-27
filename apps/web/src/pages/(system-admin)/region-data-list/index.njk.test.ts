import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "(system-admin)/region-data-list/index.njk";

const tableRows = [[{ text: "London" }, { html: '<a href="/region-data-modify?id=1&type=Region" class="govuk-link">Modify</a>' }]];

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
});

describe("region-data-list template", () => {
  it("should have matching English and Welsh locale keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
  });

  it("should render a visually hidden table caption", () => {
    const { $ } = render(env, TEMPLATE, { ...en, tableRows });

    const caption = $("table caption");
    expect(caption).toHaveLength(1);
    expect(caption.text().trim()).toBe(en.tableCaption);
    expect(caption.hasClass("govuk-visually-hidden")).toBe(true);
  });

  it("should give every column header visible text", () => {
    const { $ } = render(env, TEMPLATE, { ...en, tableRows });

    const headers = $("thead th")
      .map((_, el) => $(el).text().trim())
      .get();
    expect(headers).toEqual([en.nameColumn, en.actionColumn]);
  });

  it("should render the Welsh caption when the cy locale is used", () => {
    const { $ } = render(env, TEMPLATE, { ...cy, tableRows });

    expect($("table caption").text().trim()).toBe(cy.tableCaption);
  });

  it("should not render a table when there are no regions", () => {
    const { $ } = render(env, TEMPLATE, { ...en, tableRows: [] });

    expect($("table")).toHaveLength(0);
    expect($("main p.govuk-body").text()).toContain(en.noResultsText);
  });
});
