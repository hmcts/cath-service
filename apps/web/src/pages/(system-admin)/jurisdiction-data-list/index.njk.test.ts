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

const TEMPLATE = "(system-admin)/jurisdiction-data-list/index.njk";

const typeItems = [
  { value: "Jurisdiction", text: "Jurisdiction", checked: false },
  { value: "Sub-Jurisdiction", text: "Sub-Jurisdiction", checked: false }
];

const tableRows = [
  [{ text: "Civil" }, { text: "Jurisdiction" }, { html: '<a href="/jurisdiction-data-modify?id=1&type=Jurisdiction" class="govuk-link">Modify</a>' }]
];

const buildData = (content: typeof en | typeof cy, overrides: Record<string, unknown> = {}) => ({
  en,
  cy,
  t: content,
  tableRows,
  typeItems,
  selectedTypes: [],
  selectedTypesDisplay: [],
  typeRemoveUrls: [],
  ...overrides
});

describe("jurisdiction-data-list template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, "index.njk"))).toBe(true);
    });
  });

  describe("MOJ filter", () => {
    it("should render the MOJ filter component and its layout containers", () => {
      const { $ } = render(env, TEMPLATE, buildData(en));

      expect($(".moj-filter[data-module='moj-filter']")).toHaveLength(1);
      expect($(".moj-filter-layout__filter")).toHaveLength(1);
      expect($(".moj-filter-layout__content")).toHaveLength(1);
      // The empty container the FilterToggleButton appends the show/hide button into —
      // this is what fixes the previous mobile dead-end where filters were unreachable.
      expect($(".moj-action-bar__filter")).toHaveLength(1);
    });

    it("should expose show/hide toggle text via data attributes so it is reachable at mobile width", () => {
      const { $ } = render(env, TEMPLATE, buildData(en));

      const filter = $(".moj-filter");
      expect(filter.attr("data-show-text")).toBe(en.showFilters);
      expect(filter.attr("data-hide-text")).toBe(en.hideFilters);
      expect(filter.attr("data-start-hidden")).toBe("false");
    });

    it("should render the filter heading, apply button and clear link", () => {
      const { $ } = render(env, TEMPLATE, buildData(en));

      expect($(".moj-filter__header h2").text()).toContain(en.filterHeading);
      const applyButton = $("button.govuk-button").filter((_, el) => $(el).text().trim() === en.applyFiltersButton);
      expect(applyButton).toHaveLength(1);
      const clearLink = $('a[href="/jurisdiction-data-list"]');
      expect(clearLink.text()).toContain(en.clearFilters);
    });

    it("should render selected filter tags as MOJ tags with accessible remove links", () => {
      const { $ } = render(
        env,
        TEMPLATE,
        buildData(en, {
          selectedTypes: ["Jurisdiction"],
          selectedTypesDisplay: ["Jurisdiction"],
          typeRemoveUrls: ["/jurisdiction-data-list"]
        })
      );

      const tag = $(".moj-filter__tag");
      expect(tag).toHaveLength(1);
      expect(tag.text()).toContain("Jurisdiction");
      expect(tag.find(".govuk-visually-hidden").text()).toContain("Remove this filter");
    });

    it("should render a type checkbox per available type", () => {
      const { $ } = render(env, TEMPLATE, buildData(en));

      expect($("input[name='type']")).toHaveLength(2);
    });

    it("should render the type filter as a collapsible section expanded by default", () => {
      const { $ } = render(env, TEMPLATE, buildData(en));

      const toggle = $('.filter-section-toggle[aria-controls="type-section"]');
      expect(toggle).toHaveLength(1);
      expect(toggle.attr("aria-expanded")).toBe("true");
      expect(toggle.find(".filter-section-heading").text()).toContain(en.typeHeading);
      expect(toggle.find(".filter-section-icon").text()).toBe("−");
      expect($("#type-section.filter-section-content")).toHaveLength(1);
    });
  });

  describe("Results table", () => {
    it("should render the results table with column headers", () => {
      const { $ } = render(env, TEMPLATE, buildData(en));

      const headers = $(".govuk-table__header")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(en.nameColumn);
      expect(headers).toContain(en.typeColumn);
      expect($(".govuk-table__body .govuk-table__row")).toHaveLength(1);
    });

    it("should render the no-results message when there are no rows", () => {
      const { $ } = render(env, TEMPLATE, buildData(en, { tableRows: [] }));

      expect($(".govuk-table")).toHaveLength(0);
      expect($("p.govuk-body").text()).toContain(en.noResultsText);
    });
  });

  describe("Welsh rendering", () => {
    it("should render the Welsh heading, filter labels and toggle text", () => {
      const { $ } = render(env, TEMPLATE, buildData(cy));

      expect($("h1").text()).toContain(cy.title);
      expect($(".moj-filter__header h2").text()).toContain(cy.filterHeading);
      expect($(".moj-filter").attr("data-show-text")).toBe(cy.showFilters);
      expect($(".moj-filter").attr("data-hide-text")).toBe(cy.hideFilters);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });
  });
});
