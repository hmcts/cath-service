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
function buildLocation(overrides: Partial<TestLocation> = {}): TestLocation {
  return { locationId: 1, name: "Abbey Court", welshName: "Llys Abbey", ...overrides };
}

function buildGroups(): LocationGroup[] {
  return [
    {
      letter: "A",
      locations: [buildLocation(), buildLocation({ locationId: 2, name: "Ashford Court", welshName: "Llys Ashford" })]
    },
    { letter: "B", locations: [buildLocation({ locationId: 3, name: "Bristol Court", welshName: "Llys Bryste" })] }
  ];
}

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
    locationGroups: [] as LocationGroup[],
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
      const data = buildData(en, "en");

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-l").text().trim()).toBe(en.heading);
      expect($("p.govuk-body").first().text().trim()).toBe(en.description);
    });

    it("should render the filter panel headings", () => {
      const data = buildData(en, "en");

      const { $ } = render(env, TEMPLATE, data);

      expect($.root().text()).toContain(en.filterHeading);
      expect($.root().text()).toContain(en.selectedFiltersHeading);
    });

    it("should render a clear filters link back to the search", () => {
      const data = buildData(en, "en");

      const { $ } = render(env, TEMPLATE, data);

      const clearLink = $('a[href="/location-name-search"]');
      expect(clearLink.length).toBeGreaterThan(0);
      expect(clearLink.first().text()).toContain(en.clearFilters);
    });

    it("should render a back link to subscription management", () => {
      const data = buildData(en, "en");

      const { $ } = render(env, TEMPLATE, data);

      expect($('.govuk-back-link[href="/subscription-management"]')).toHaveLength(1);
    });

    it("should render collapsible filter sections expanded by default with a +/- toggle", () => {
      const data = buildData(en, "en");

      const { $ } = render(env, TEMPLATE, data);

      const toggles = $(".filter-section-toggle");
      expect(toggles).toHaveLength(2);
      toggles.each((_, el) => {
        expect($(el).attr("aria-expanded")).toBe("true");
        expect($(el).find(".filter-section-icon").text()).toBe("−");
      });

      const jurisdictionToggle = $('.filter-section-toggle[aria-controls="jurisdiction-section"]');
      expect(jurisdictionToggle.find(".filter-section-heading").text()).toContain(en.jurisdictionHeading);
      expect($("#jurisdiction-section.filter-section-content")).toHaveLength(1);

      const regionToggle = $('.filter-section-toggle[aria-controls="region-section"]');
      expect(regionToggle.find(".filter-section-heading").text()).toContain(en.regionHeading);
      expect($("#region-section.filter-section-content")).toHaveLength(1);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and description", () => {
      const data = buildData(cy, "cy");

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-l").text().trim()).toBe(cy.heading);
      expect($("p.govuk-body").first().text().trim()).toBe(cy.description);
    });

    it("should render the Welsh filter panel headings", () => {
      const data = buildData(cy, "cy");

      const { $ } = render(env, TEMPLATE, data);

      expect($.root().text()).toContain(cy.filterHeading);
      expect($.root().text()).toContain(cy.selectedFiltersHeading);
    });
  });

  describe("courts grouped by letter", () => {
    it("should render an h2 heading for each letter in order", () => {
      const data = { ...buildData(en, "en"), locationGroups: buildGroups() };

      const { $ } = render(env, TEMPLATE, data);

      const letterHeadings = $("h2[id^='letter-']");
      expect(letterHeadings.map((_, el) => $(el).text().trim()).get()).toEqual(["A", "B"]);
      letterHeadings.each((_, el) => {
        expect($(el).hasClass("govuk-heading-m")).toBe(true);
      });
    });

    it("should place each letter's checkboxes directly after its heading", () => {
      const data = { ...buildData(en, "en"), locationGroups: buildGroups() };

      const { $ } = render(env, TEMPLATE, data);

      const groupA = $("h2#letter-A").next(".govuk-checkboxes");
      const groupB = $("h2#letter-B").next(".govuk-checkboxes");
      expect(groupA.find("input[name='locationIds']")).toHaveLength(2);
      expect(groupB.find("input[name='locationIds']")).toHaveLength(1);
      expect(groupA.find("label").first().text().trim()).toBe("Abbey Court");
      expect(groupB.find("label").text().trim()).toBe("Bristol Court");
    });

    it("should label each letter's checkbox group with its letter heading", () => {
      const data = { ...buildData(en, "en"), locationGroups: buildGroups() };

      const { $ } = render(env, TEMPLATE, data);

      const groups = $("h2[id^='letter-'] + .govuk-checkboxes");
      expect(groups).toHaveLength(2);
      groups.each((_, el) => {
        expect($(el).attr("role")).toBe("group");
        expect($(`#${$(el).attr("aria-labelledby")}`).is("h2")).toBe(true);
      });
      expect(groups.first().attr("aria-labelledby")).toBe("letter-A");
    });

    it("should link every checkbox to its label and keep the location id and value", () => {
      const data = { ...buildData(en, "en"), locationGroups: buildGroups() };

      const { $ } = render(env, TEMPLATE, data);

      const inputs = $("input[name='locationIds']");
      expect(inputs).toHaveLength(3);
      inputs.each((_, el) => {
        const id = $(el).attr("id");
        expect(id).toBe(`location-${$(el).attr("value")}`);
        expect($(`label[for='${id}']`)).toHaveLength(1);
      });
    });

    it("should not render any table markup", () => {
      const data = { ...buildData(en, "en"), locationGroups: buildGroups() };

      const { $ } = render(env, TEMPLATE, data);

      expect($("table")).toHaveLength(0);
      expect($(".court-table")).toHaveLength(0);
    });

    it("should keep the selection counter", () => {
      const data = { ...buildData(en, "en"), locationGroups: buildGroups() };

      const { $ } = render(env, TEMPLATE, data);

      expect($("#selectionCount")).toHaveLength(1);
    });

    it("should render Welsh court names when the locale is cy", () => {
      const data = { ...buildData(cy, "cy"), locationGroups: buildGroups() };

      const { $ } = render(env, TEMPLATE, data);

      expect($("label[for='location-3']").text().trim()).toBe("Llys Bryste");
      expect($("label[for='location-1']").text().trim()).toBe("Llys Abbey");
    });

    it("should render no letter headings or court checkboxes when there are no locations", () => {
      const data = buildData(en, "en");

      const { $ } = render(env, TEMPLATE, data);

      expect($("h2[id^='letter-']")).toHaveLength(0);
      expect($("input[name='locationIds']")).toHaveLength(0);
    });
  });

  it("should have matching English and Welsh content keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
  });
});

interface TestLocation {
  locationId: number;
  name: string;
  welshName: string;
}

interface LocationGroup {
  letter: string;
  locations: TestLocation[];
}
