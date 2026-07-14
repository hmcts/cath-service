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
      expect($("#show-filters-btn").text()).toContain(en.showFilters);
      expect($("#hide-filters-btn").text()).toContain(en.hideFilters);
      expect($.root().text()).toContain(en.backToTop);
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

    it("should render selected filter tags with remove links", () => {
      const data = buildData(en, "en", {
        selectedJurisdictions: [1],
        selectedJurisdictionsDisplay: ["Civil"],
        jurisdictionRemoveUrls: ["/courts-tribunals-list"]
      });

      const { $ } = render(env, TEMPLATE, data);

      const tag = $(".filter-tag");
      expect(tag.text()).toContain("Civil");
      expect(tag.find("a.filter-tag-remove").attr("aria-label")).toContain("Civil");
    });

    it("should render Welsh headings and court names", () => {
      const data = buildData(cy, "cy");

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.title);
      expect($("h2").text()).toContain(cy.filterHeading);
      expect($("h3").text()).toContain(cy.selectedFiltersHeading);
      expect($(`a[href="/courts-tribunals-list"]`).text()).toContain(cy.clearFilters);
      expect($("button").text()).toContain(cy.applyFilters);
      expect($("#hide-filters-btn").text()).toContain(cy.hideFilters);
      expect($("#show-filters-btn").text()).toContain(cy.showFilters);
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
