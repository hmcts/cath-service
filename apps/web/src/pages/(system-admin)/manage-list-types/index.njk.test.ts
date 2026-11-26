import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/manage-list-types/index.njk";

const listTypes = [
  { id: 1, name: "Civil Daily Cause List", isHidden: false, configureUrl: "/list-search-config/1" },
  { id: 8, name: "Civil and Family Daily Cause List", isHidden: true, configureUrl: "/list-search-config/8" }
];

describe("manage-list-types template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = { ...en, listTypes };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.heading);
    });

    it("should render the name column heading and visually hidden caption", () => {
      const data = { ...en, listTypes };

      const { $ } = render(env, TEMPLATE, data);

      expect($("th.govuk-table__header").first().text().trim()).toBe(en.nameColumnHeading);
      expect($("caption").text().trim()).toBe(en.tableCaption);
    });

    it("should render a row per list type with configure links", () => {
      const data = { ...en, listTypes };

      const { $ } = render(env, TEMPLATE, data);

      const rows = $("tbody .govuk-table__row");
      expect(rows).toHaveLength(listTypes.length);
      expect($('a[href="/list-search-config/1"]').text().trim()).toBe(en.configureLink);
      expect($('a[href="/list-search-config/8"]').text().trim()).toBe(en.configureLink);
      expect($("tbody").text()).toContain("Civil Daily Cause List");
      expect($("tbody").text()).toContain("Civil and Family Daily Cause List");
    });

    it("should render a status column heading and a visually hidden action column heading", () => {
      const data = { ...en, listTypes };

      const { $ } = render(env, TEMPLATE, data);

      const headers = $("thead th");
      expect(headers).toHaveLength(3);
      expect(headers.eq(1).text().trim()).toBe(en.statusColumnHeading);
      expect(headers.eq(2).find(".govuk-visually-hidden").text().trim()).toBe(en.actionColumnHeading);
    });

    it("should render a green Visible tag for visible list types and a grey Hidden tag for hidden ones", () => {
      const data = { ...en, listTypes };

      const { $ } = render(env, TEMPLATE, data);

      const rows = $("tbody .govuk-table__row");
      const visibleTag = rows.eq(0).find(".govuk-tag");
      const hiddenTag = rows.eq(1).find(".govuk-tag");
      expect(visibleTag.text().trim()).toBe(en.visibleTag);
      expect(visibleTag.hasClass("govuk-tag--green")).toBe(true);
      expect(hiddenTag.text().trim()).toBe(en.hiddenTag);
      expect(hiddenTag.hasClass("govuk-tag--grey")).toBe(true);
    });

    it("should render an empty table body when there are no list types", () => {
      const data = { ...en, listTypes: [] };

      const { $ } = render(env, TEMPLATE, data);

      expect($("tbody .govuk-table__row")).toHaveLength(0);
      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading, headings and configure links", () => {
      const data = { ...cy, listTypes };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.heading);
      expect($("th.govuk-table__header").first().text().trim()).toBe(cy.nameColumnHeading);
      expect($("caption").text().trim()).toBe(cy.tableCaption);
      expect($('a[href="/list-search-config/1"]').text().trim()).toBe(cy.configureLink);
      expect($("tbody .govuk-tag").eq(0).text().trim()).toBe(cy.visibleTag);
      expect($("tbody .govuk-tag").eq(1).text().trim()).toBe(cy.hiddenTag);
    });

    it("should have matching keys in English and Welsh content", () => {
      expect(Object.keys(cy).sort()).toEqual(Object.keys(en).sort());
    });
  });
});
