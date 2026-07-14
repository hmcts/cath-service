import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/view-list-types/index.njk";

// The controller spreads the selected locale object directly into the render
// data (`...content`) alongside `tableRows`, so template variables are the
// top-level locale keys.
const buildTableRows = (content: typeof en) => [
  [
    { text: "TEST_LIST" },
    { text: "Test List" },
    { text: "Rhestr Prawf" },
    { text: "Test" },
    { text: "test-list" },
    { text: "Public" },
    { text: "CFT_IDAM" },
    { text: content.noText },
    { text: "Civil Court" },
    {
      html: `<a class="govuk-link" href="/configure-list-type-enter-details?id=1">${content.editText}</a> | <a class="govuk-link" href="/delete-list-type?id=1">${content.deleteText}</a>`
    }
  ]
];

describe("view-list-types template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = { ...en, tableRows: buildTableRows(en) };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.title);
    });

    it("should render the table headers", () => {
      const data = { ...en, tableRows: buildTableRows(en) };

      const { $ } = render(env, TEMPLATE, data);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        en.nameColumn,
        en.friendlyNameColumn,
        en.welshFriendlyNameColumn,
        en.shortenedFriendlyNameColumn,
        en.urlColumn,
        en.sensitivityColumn,
        en.provenanceColumn,
        en.nonStrategicColumn,
        en.subJurisdictionsColumn,
        en.actionsColumn
      ]);
    });

    it("should render a data row with cell values and action links", () => {
      const data = { ...en, tableRows: buildTableRows(en) };

      const { $ } = render(env, TEMPLATE, data);

      const cells = $("tbody tr td")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(cells).toContain("TEST_LIST");
      expect(cells).toContain("Test List");
      expect(cells).toContain(en.noText);
      expect($('a[href="/configure-list-type-enter-details?id=1"]').text()).toBe(en.editText);
      expect($('a[href="/delete-list-type?id=1"]').text()).toBe(en.deleteText);
    });

    it("should render navigation links", () => {
      const data = { ...en, tableRows: buildTableRows(en) };

      const { $ } = render(env, TEMPLATE, data);

      expect($('a[href="/configure-list-type-enter-details"]').text()).toBe(en.addNewListTypeLink);
      expect($('a[href="/system-admin-dashboard"]').text()).toBe(en.backToDashboard);
    });

    it("should render the empty state when there are no list types", () => {
      const data = { ...en, tableRows: [] };

      const { $ } = render(env, TEMPLATE, data);

      expect($("table").length).toBe(0);
      expect($("p.govuk-body").text()).toContain(en.noListTypesText);
    });

    it("should not render an error summary", () => {
      const data = { ...en, tableRows: buildTableRows(en) };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh page heading", () => {
      const data = { ...cy, tableRows: buildTableRows(cy) };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.title);
    });

    it("should render the Welsh table headers", () => {
      const data = { ...cy, tableRows: buildTableRows(cy) };

      const { $ } = render(env, TEMPLATE, data);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(cy.nameColumn);
      expect(headers).toContain(cy.actionsColumn);
    });

    it("should render the Welsh navigation links", () => {
      const data = { ...cy, tableRows: buildTableRows(cy) };

      const { $ } = render(env, TEMPLATE, data);

      expect($('a[href="/configure-list-type-enter-details"]').text()).toBe(cy.addNewListTypeLink);
      expect($('a[href="/system-admin-dashboard"]').text()).toBe(cy.backToDashboard);
    });

    it("should render the Welsh empty state", () => {
      const data = { ...cy, tableRows: [] };

      const { $ } = render(env, TEMPLATE, data);

      expect($("p.govuk-body").text()).toContain(cy.noListTypesText);
    });
  });
});
