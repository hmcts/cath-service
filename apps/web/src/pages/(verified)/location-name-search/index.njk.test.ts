import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/location-name-search/index.njk";

// The controller spreads the locale content object into the render data and
// adds the selection/table arrays; these mirror that shape with empty defaults.
function buildData(content: typeof en | typeof cy, locale: string) {
  return {
    ...content,
    locale,
    selectedJurisdictions: [],
    selectedRegions: [],
    selectedSubJurisdictions: [],
    selectedJurisdictionsDisplay: [],
    selectedRegionsDisplay: [],
    selectedSubJurisdictionsDisplay: [],
    jurisdictionRemoveUrls: [],
    subJurisdictionRemoveUrls: [],
    regionRemoveUrls: [],
    jurisdictionItems: [],
    regionItems: [],
    subJurisdictionItemsByJurisdiction: [],
    availableLetters: [],
    tableRows: [],
    csrfToken: "test-token"
  };
}

describe("location-name-search template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the heading and description", () => {
      // Arrange
      const data = buildData(en, "en");

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1.govuk-heading-l").text().trim()).toBe(en.heading);
      expect($("p.govuk-body").first().text().trim()).toBe(en.description);
    });

    it("should render the filter panel headings", () => {
      // Arrange
      const data = buildData(en, "en");

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($.root().text()).toContain(en.filterHeading);
      expect($.root().text()).toContain(en.selectedFiltersHeading);
    });

    it("should render a clear filters link back to the search", () => {
      // Arrange
      const data = buildData(en, "en");

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const clearLink = $('a[href="/location-name-search"]');
      expect(clearLink.length).toBeGreaterThan(0);
      expect(clearLink.first().text()).toContain(en.clearFilters);
    });

    it("should render a back link to subscription management", () => {
      // Arrange
      const data = buildData(en, "en");

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($('.govuk-back-link[href="/subscription-management"]')).toHaveLength(1);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and description", () => {
      // Arrange
      const data = buildData(cy, "cy");

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1.govuk-heading-l").text().trim()).toBe(cy.heading);
      expect($("p.govuk-body").first().text().trim()).toBe(cy.description);
    });

    it("should render the Welsh filter panel headings", () => {
      // Arrange
      const data = buildData(cy, "cy");

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($.root().text()).toContain(cy.filterHeading);
      expect($.root().text()).toContain(cy.selectedFiltersHeading);
    });
  });
});
