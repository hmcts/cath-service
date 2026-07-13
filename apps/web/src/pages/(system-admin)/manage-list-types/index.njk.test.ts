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
  { id: 1, name: "Civil Daily Cause List", configureUrl: "/list-search-config/1" },
  { id: 8, name: "Civil and Family Daily Cause List", configureUrl: "/list-search-config/8" }
];

describe("manage-list-types template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      // Arrange
      const data = { ...en, listTypes };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.heading);
    });

    it("should render the name column heading and visually hidden caption", () => {
      // Arrange
      const data = { ...en, listTypes };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("th.govuk-table__header").first().text().trim()).toBe(en.nameColumnHeading);
      expect($("caption").text().trim()).toBe(en.tableCaption);
    });

    it("should render a row per list type with configure links", () => {
      // Arrange
      const data = { ...en, listTypes };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const rows = $("tbody .govuk-table__row");
      expect(rows).toHaveLength(listTypes.length);
      expect($('a[href="/list-search-config/1"]').text().trim()).toBe(en.configureLink);
      expect($('a[href="/list-search-config/8"]').text().trim()).toBe(en.configureLink);
      expect($("tbody").text()).toContain("Civil Daily Cause List");
      expect($("tbody").text()).toContain("Civil and Family Daily Cause List");
    });

    it("should render an empty table body when there are no list types", () => {
      // Arrange
      const data = { ...en, listTypes: [] };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("tbody .govuk-table__row")).toHaveLength(0);
      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading, headings and configure links", () => {
      // Arrange
      const data = { ...cy, listTypes };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.heading);
      expect($("th.govuk-table__header").first().text().trim()).toBe(cy.nameColumnHeading);
      expect($("caption").text().trim()).toBe(cy.tableCaption);
      expect($('a[href="/list-search-config/1"]').text().trim()).toBe(cy.configureLink);
    });
  });
});
