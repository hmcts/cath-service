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

const TEMPLATE = "(public)/courts-tribunals-list/index.njk";

const jurisdictionItems = [
  {
    value: "1",
    text: "Civil",
    jurisdictionId: 1,
    subJurisdictionLabel: "Type of civil court",
    checked: true
  }
];

const subJurisdictionItemsByJurisdiction: Record<number, Array<Record<string, unknown>>> = {
  1: [{ value: "10", text: "County Court", checked: false }]
};

const regionItems = [{ value: "100", text: "London", checked: false }];

const tableRows = [
  {
    letter: "A",
    isFirst: true,
    location: { locationId: 501, name: "Aberdeen Tribunal Hearing Centre", welshName: "Canolfan Wrandawiadau Tribiwnlys Aberdeen" }
  },
  {
    letter: "",
    isFirst: false,
    location: { locationId: 502, name: "Ashford Court", welshName: "Llys Ashford" }
  }
];

const buildData = (content: typeof en | typeof cy, locale: "en" | "cy", overrides: Record<string, unknown> = {}) => ({
  ...content,
  locale,
  en,
  cy,
  groupedLocations: {},
  selectedJurisdictions: [],
  selectedRegions: [],
  selectedSubJurisdictions: [],
  selectedJurisdictionsDisplay: [],
  selectedRegionsDisplay: [],
  selectedSubJurisdictionsDisplay: [],
  jurisdictionRemoveUrls: [],
  subJurisdictionRemoveUrls: [],
  regionRemoveUrls: [],
  jurisdictionItems,
  regionItems,
  subJurisdictionItemsByJurisdiction,
  availableLetters: ["A"],
  tableRows,
  ...overrides
});

describe("courts-tribunals-list template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Template rendering", () => {
    it("should render the English heading and filter panel", () => {
      const data = buildData(en, "en");

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.title);
      expect($("h2").text()).toContain(en.filterHeading);
      expect($.root().text()).toContain(en.selectedFiltersHeading);
      expect($(`a[href="/courts-tribunals-list"]`).text()).toContain(en.clearFilters);
      assertNoErrors($);
    });

    it("should render the apply filters button and section headings", () => {
      const data = buildData(en, "en");

      const { $ } = render(env, TEMPLATE, data);

      expect($("button").text()).toContain(en.applyFilters);
      expect($.root().text()).toContain(en.jurisdictionHeading);
      expect($.root().text()).toContain(en.regionHeading);
      expect($.root().text()).toContain(en.backToTop);
    });

    it("should render the MOJ filter component and its layout containers", () => {
      const data = buildData(en, "en");

      const { $ } = render(env, TEMPLATE, data);

      expect($(".moj-filter[data-module='moj-filter']")).toHaveLength(1);
      expect($(".moj-filter-layout")).toHaveLength(1);
      // Marks this as an always-visible sidebar page so the desktop toggle button is
      // hidden via CSS (filter-overrides.scss), unlike the toggle-to-reveal SJP pages.
      expect($(".moj-filter-layout.app-filter-layout--sidebar")).toHaveLength(1);
      expect($(".moj-filter-layout__filter")).toHaveLength(1);
      expect($(".moj-filter-layout__content")).toHaveLength(1);
      // Empty container the FilterToggleButton appends the show/hide button into.
      expect($(".moj-action-bar__filter")).toHaveLength(1);
    });

    it("should expose the show/hide toggle text via data attributes (never interpolated into JS)", () => {
      const data = buildData(en, "en");

      const { $ } = render(env, TEMPLATE, data);

      const filter = $(".moj-filter");
      expect(filter.attr("data-show-text")).toBe(en.showFilters);
      expect(filter.attr("data-hide-text")).toBe(en.hideFilters);
      expect(filter.attr("data-start-hidden")).toBe("false");
      expect($("script").text()).not.toContain(en.showFilters);
    });

    it("should render court listings with English names and publication links", () => {
      const data = buildData(en, "en");

      const { $ } = render(env, TEMPLATE, data);

      expect($(`a[href="/summary-of-publications?locationId=501"]`).text()).toContain("Aberdeen Tribunal Hearing Centre");
      expect($(`a[href="/summary-of-publications?locationId=502"]`).text()).toContain("Ashford Court");
      expect($(".court-letter").text()).toContain("A");
    });

    it("should render A-Z navigation with available letters as links", () => {
      const data = buildData(en, "en");

      const { $ } = render(env, TEMPLATE, data);

      expect($(`.az-navigation a[href="#letter-A"]`)).toHaveLength(1);
      expect($(".az-navigation__letter--disabled").length).toBeGreaterThan(0);
    });

    it("should render selected filter tags as MOJ filter tags with accessible remove links", () => {
      const data = buildData(en, "en", {
        selectedJurisdictions: [1],
        selectedJurisdictionsDisplay: ["Civil"],
        jurisdictionRemoveUrls: ["/courts-tribunals-list?remove=civil"]
      });

      const { $ } = render(env, TEMPLATE, data);

      const tag = $(".moj-filter__tag");
      expect(tag).toHaveLength(1);
      expect(tag.text()).toContain("Civil");
      expect(tag.attr("href")).toBe("/courts-tribunals-list?remove=civil");
      expect(tag.find(".govuk-visually-hidden").text()).toContain("Remove this filter");
    });

    it("should render Welsh headings and court names", () => {
      const data = buildData(cy, "cy");

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.title);
      expect($("h2").text()).toContain(cy.filterHeading);
      expect($("h2").text()).toContain(cy.selectedFiltersHeading);
      expect($(`a[href="/courts-tribunals-list"]`).text()).toContain(cy.clearFilters);
      expect($("button").text()).toContain(cy.applyFilters);
      expect($(".moj-filter").attr("data-show-text")).toBe(cy.showFilters);
      expect($(".moj-filter").attr("data-hide-text")).toBe(cy.hideFilters);
      expect($.root().text()).toContain(cy.jurisdictionHeading);
      expect($.root().text()).toContain(cy.regionHeading);
      expect($(`a[href="/summary-of-publications?locationId=501"]`).text()).toContain("Canolfan Wrandawiadau Tribiwnlys Aberdeen");
      expect($.root().text()).toContain(cy.backToTop);
      assertNoErrors($);
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = [
        "title",
        "selectedFiltersHeading",
        "noFiltersSelected",
        "clearFilters",
        "filterHeading",
        "jurisdictionHeading",
        "regionHeading",
        "applyFilters",
        "backToTop",
        "showFilters",
        "hideFilters",
        "subJurisdictionLabels"
      ];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });

    it("should have same sub-jurisdiction label keys in English and Welsh", () => {
      expect(Object.keys(en.subJurisdictionLabels).sort()).toEqual(Object.keys(cy.subJurisdictionLabels).sort());
    });
  });
});
