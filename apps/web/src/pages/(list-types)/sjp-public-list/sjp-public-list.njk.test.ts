import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sjpPublicListCy as cy, sjpPublicListEn as en } from "@hmcts/sjp-public-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "sjp-public-list.njk";

interface CaseOverrides {
  name?: string;
  postcode?: string | null;
  offence?: string | null;
  prosecutor?: string | null;
}

// The cases table columns, in order.
const COLUMN = { name: 0, postcode: 1, offence: 2, prosecutor: 3 } as const;

// Fixture builders — a test only supplies the leaf fields it varies; the deep
// view-model tree (list metadata, pagination, filters, locale strings) is
// filled with a realistic default so individual tests stay focused.
function buildCase(overrides: CaseOverrides = {}) {
  return { name: "John Smith", postcode: "SW1A 1AA", offence: "Speeding", prosecutor: "CPS", ...overrides };
}

function toRows(cases: ReturnType<typeof buildCase>[]) {
  return cases.map((c) => [{ text: c.name }, { text: c.postcode || "" }, { text: c.offence || "" }, { text: c.prosecutor || "" }]);
}

function baseData(locale: typeof en | typeof cy = en, overrides: Record<string, unknown> = {}) {
  return {
    title: locale.SJP_PUBLIC_LIST.title,
    ...locale.common,
    en,
    cy,
    list: { artefactId: "test-artefact-123", generatedAt: new Date("2026-07-10T14:30:00Z") },
    cases: [],
    casesRows: [],
    totalCases: 0,
    prosecutors: [],
    postcodeAreas: [],
    hasLondonPostcodes: false,
    londonPostcodes: [],
    pagination: { currentPage: 1, totalPages: 1, hasPrevious: false, hasNext: false, pageNumbers: [1] },
    filters: { postcodes: [], prosecutors: [] },
    sortBy: "",
    sortOrder: "asc",
    showFilter: false,
    cspNonce: "test-nonce",
    ...overrides
  };
}

function renderList(overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, baseData(locale, overrides));
}

function renderCases(cases: ReturnType<typeof buildCase>[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return renderList({ cases, casesRows: toRows(cases), totalCases: cases.length, ...overrides }, locale);
}

function summaryText($: CheerioAPI, label: string) {
  return $("p.govuk-body")
    .filter((_, el) => $(el).text().includes(label))
    .text()
    .replace(/\s+/g, " ")
    .trim();
}

function tableHeaders($: CheerioAPI) {
  return $("table thead th")
    .map((_, el) => $(el).text().trim())
    .get();
}

// The base layout emits several nonce'd scripts; the page's own filter script is
// the one that wires up the filter toggle.
function filterScript($: CheerioAPI) {
  return $("script")
    .filter((_, el) => $(el).html()?.includes("filter-toggle") ?? false)
    .first();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);

  env.addFilter("date", (value: string | Date) => {
    if (!value) return "";
    const date = typeof value === "string" ? new Date(value) : value;
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  });

  env.addFilter("time12", (value: string | Date) => {
    if (!value) return "";
    const date = typeof value === "string" ? new Date(value) : value;
    return date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
  });
});

describe("sjp-public-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh", () => {
      expect(Object.keys(en.common).sort()).toEqual(Object.keys(cy.common).sort());
      expect(Object.keys(en.SJP_PUBLIC_LIST).sort()).toEqual(Object.keys(cy.SJP_PUBLIC_LIST).sort());
      expect(Object.keys(en.SJP_DELTA_PUBLIC_LIST).sort()).toEqual(Object.keys(cy.SJP_DELTA_PUBLIC_LIST).sort());
    });

    it("should use https FACT link URLs", () => {
      expect(en.common.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.common.factLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the full list title in the heading", () => {
      const { $ } = renderList();

      expect($("h1.govuk-heading-l").text().trim()).toBe(en.SJP_PUBLIC_LIST.title);
    });

    it("should render the delta list title when provided", () => {
      const { $ } = renderList({ title: en.SJP_DELTA_PUBLIC_LIST.title });

      expect($("h1.govuk-heading-l").text().trim()).toBe(en.SJP_DELTA_PUBLIC_LIST.title);
    });

    it("should render the FACT link with the configured text, URL and additional text", () => {
      const { $ } = renderList();

      const factLink = $(`a[href="${en.common.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.common.factLinkText);
      expect(factLink.parent().text()).toContain(en.common.factAdditionalText);
    });

    it("should render the list summary with the total case count", () => {
      const { $ } = renderList({ totalCases: 42 });

      expect(summaryText($, en.common.listContaining)).toContain(`${en.common.listContaining} 42 ${en.common.casesText}`);
    });

    it("should render the generated date and time", () => {
      const { $ } = renderList();

      const text = summaryText($, en.common.generatedOn);
      expect(text).toContain(en.common.generatedOn);
      expect(text).toContain("10 July 2026");
      expect(text).toContain(en.common.at);
      expect(text).toContain("3:30 pm");
    });
  });

  describe("Filter toggle button", () => {
    it("should read 'Show filters' when no filters are active", () => {
      const { $ } = renderList();

      expect($("#filter-toggle").text().trim()).toBe(en.common.showFilters);
    });

    it("should read 'Hide filters' when showFilter is set", () => {
      const { $ } = renderList({ showFilter: true });

      expect($("#filter-toggle").text().trim()).toBe(en.common.hideFilters);
    });

    it("should read 'Hide filters' when postcode filters are active", () => {
      const { $ } = renderList({ filters: { postcodes: ["SW1A"], prosecutors: [] } });

      expect($("#filter-toggle").text().trim()).toBe(en.common.hideFilters);
    });

    it("should read 'Hide filters' when prosecutor filters are active", () => {
      const { $ } = renderList({ filters: { postcodes: [], prosecutors: ["CPS"] } });

      expect($("#filter-toggle").text().trim()).toBe(en.common.hideFilters);
    });
  });

  describe("Pagination", () => {
    it("should not render pagination when there is only one page", () => {
      const { $ } = renderList();

      expect($(".govuk-pagination")).toHaveLength(0);
    });

    it("should render previous, next and page-number links across multiple pages", () => {
      const { $ } = renderList({
        pagination: { currentPage: 2, totalPages: 4, hasPrevious: true, hasNext: true, pageNumbers: [1, 2, 3, 4] }
      });

      expect($(".govuk-pagination")).toHaveLength(1);
      expect($(".govuk-pagination__prev").text()).toContain(en.common.previous);
      expect($(".govuk-pagination__next").text()).toContain(en.common.next);
      const pageLabels = $(".govuk-pagination__list a")
        .map((_, el) => $(el).attr("aria-label"))
        .get();
      expect(pageLabels).toEqual(["Page 1", "Page 2", "Page 3", "Page 4"]);
    });

    it("should not render a previous link on the first page", () => {
      const { $ } = renderList({
        pagination: { currentPage: 1, totalPages: 3, hasPrevious: false, hasNext: true, pageNumbers: [1, 2, 3] }
      });

      expect($(".govuk-pagination__prev")).toHaveLength(0);
      expect($(".govuk-pagination__next")).toHaveLength(1);
    });

    it("should not render a next link on the last page", () => {
      const { $ } = renderList({
        pagination: { currentPage: 3, totalPages: 3, hasPrevious: true, hasNext: false, pageNumbers: [1, 2, 3] }
      });

      expect($(".govuk-pagination__next")).toHaveLength(0);
      expect($(".govuk-pagination__prev")).toHaveLength(1);
    });

    it("should mark the current page as active", () => {
      const { $ } = renderList({
        pagination: { currentPage: 2, totalPages: 3, hasPrevious: true, hasNext: true, pageNumbers: [1, 2, 3] }
      });

      expect($(".govuk-pagination__item--current")).toHaveLength(1);
      const current = $("a[aria-current='page']");
      expect(current).toHaveLength(1);
      expect(current.attr("aria-label")).toBe("Page 2");
    });

    it("should include the active filters in pagination links", () => {
      const { $ } = renderList({
        filters: { postcodes: ["SW1A", "E1"], prosecutors: ["CPS", "TfL"] },
        pagination: { currentPage: 2, totalPages: 3, hasPrevious: true, hasNext: true, pageNumbers: [1, 2, 3] }
      });

      const hrefs = $(".govuk-pagination__link")
        .map((_, el) => $(el).attr("href"))
        .get()
        .join(" ");
      expect(hrefs).toContain("postcode=SW1A");
      expect(hrefs).toContain("postcode=E1");
      expect(hrefs).toContain("prosecutor=CPS");
      expect(hrefs).toContain("prosecutor=TfL");
    });
  });

  describe("Filter panel", () => {
    it("should be hidden by default", () => {
      const { $ } = renderList();

      expect($("#filter-panel").hasClass("hidden")).toBe(true);
    });

    it("should be visible when showFilter is true", () => {
      const { $ } = renderList({ showFilter: true });

      expect($("#filter-panel").hasClass("hidden")).toBe(false);
    });

    it("should be visible when filters are applied", () => {
      const { $ } = renderList({ filters: { postcodes: ["SW1A"], prosecutors: [] } });

      expect($("#filter-panel").hasClass("hidden")).toBe(false);
    });

    it("should render the filter title and selected-filters heading", () => {
      const { $ } = renderList();

      expect($("#filter-panel h2.govuk-heading-m").text()).toContain(en.common.filterTitle);
      expect($("#filter-panel h3.govuk-heading-s").text()).toContain(en.common.selectedFilters);
    });

    it("should render the clear-filters link preserving the artefact and filter state", () => {
      const { $ } = renderList();

      const clear = $("a[href*='showFilter=true']");
      expect(clear).toHaveLength(1);
      expect(clear.text()).toContain(en.common.clearFilters);
    });

    it("should render the apply-filters button", () => {
      const { $ } = renderList();

      expect($("#filter-panel .govuk-button").text()).toContain(en.common.applyFilters);
    });

    it("should render the filter search input", () => {
      const { $ } = renderList();

      expect($("#filter-search")).toHaveLength(1);
    });

    it("should include the hidden artefactId field", () => {
      const { $ } = renderList();

      const field = $("input[name='artefactId']");
      expect(field.attr("type")).toBe("hidden");
      expect(field.attr("value")).toBe("test-artefact-123");
    });
  });

  describe("Selected filter tags", () => {
    it("should not render any tags when no filters are selected", () => {
      const { $ } = renderList();

      expect($(".filter-tag")).toHaveLength(0);
    });

    it("should render a tag for each selected postcode", () => {
      const { $ } = renderList({ filters: { postcodes: ["SW1A", "E1"], prosecutors: [] } });

      const tags = $(".filter-tag")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(tags).toHaveLength(2);
      expect(tags.join(" ")).toContain("SW1A");
      expect(tags.join(" ")).toContain("E1");
    });

    it("should render a tag for each selected prosecutor", () => {
      const { $ } = renderList({ filters: { postcodes: [], prosecutors: ["CPS", "TfL"] } });

      const tags = $(".filter-tag")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(tags).toHaveLength(2);
      expect(tags.join(" ")).toContain("CPS");
      expect(tags.join(" ")).toContain("TfL");
    });

    it("should render a remove link per tag whose href preserves the other filters", () => {
      const { $ } = renderList({ filters: { postcodes: ["SW1A", "E1"], prosecutors: ["CPS"] } });

      expect($(".filter-tag-remove")).toHaveLength(3);
      const removeSw1a = $("a[aria-label='Remove SW1A filter']");
      expect(removeSw1a).toHaveLength(1);
      const href = removeSw1a.attr("href") ?? "";
      expect(href).toContain("postcode=E1");
      expect(href).toContain("prosecutor=CPS");
      expect(href).not.toContain("postcode=SW1A");
    });
  });

  describe("Postcode filter", () => {
    it("should render the postcode heading", () => {
      const { $ } = renderList();

      expect($("#postcodes-anchor").text()).toContain(en.common.postcodeFilterHeading);
    });

    it("should render a checkbox per postcode area", () => {
      const { $ } = renderList({ postcodeAreas: ["SW1A", "E1", "N1"] });

      const values = $("input[name='postcode']")
        .map((_, el) => $(el).attr("value"))
        .get();
      expect(values).toEqual(["SW1A", "E1", "N1"]);
    });

    it("should check only the selected postcodes", () => {
      const { $ } = renderList({ postcodeAreas: ["SW1A", "E1", "N1"], filters: { postcodes: ["SW1A", "N1"], prosecutors: [] } });

      expect($("input[name='postcode'][value='SW1A']").is("[checked]")).toBe(true);
      expect($("input[name='postcode'][value='N1']").is("[checked]")).toBe(true);
      expect($("input[name='postcode'][value='E1']").is("[checked]")).toBe(false);
    });

    it("should render and check the London postcodes checkbox when available", () => {
      const { $ } = renderList({ postcodeAreas: ["SW1A"], hasLondonPostcodes: true, filters: { postcodes: ["LONDON_POSTCODES"], prosecutors: [] } });

      const london = $("#postcode-london");
      expect(london).toHaveLength(1);
      expect(london.attr("value")).toBe("LONDON_POSTCODES");
      expect(london.is("[checked]")).toBe(true);
      expect($(".govuk-checkboxes__label[for='postcode-london']").text()).toContain(en.common.londonPostcodesLabel);
    });

    it("should not render the London postcodes checkbox when unavailable", () => {
      const { $ } = renderList({ postcodeAreas: ["SW1A"], hasLondonPostcodes: false });

      expect($("#postcode-london")).toHaveLength(0);
    });
  });

  describe("Prosecutor filter", () => {
    it("should render the prosecutor heading", () => {
      const { $ } = renderList();

      expect($("#prosecutor-anchor").text()).toContain(en.common.prosecutorFilterHeading);
    });

    it("should render a checkbox per prosecutor", () => {
      const { $ } = renderList({ prosecutors: ["CPS", "TfL", "Local Authority"] });

      const values = $("input[name='prosecutor']")
        .map((_, el) => $(el).attr("value"))
        .get();
      expect(values).toEqual(["CPS", "TfL", "Local Authority"]);
    });

    it("should check only the selected prosecutors", () => {
      const { $ } = renderList({ prosecutors: ["CPS", "TfL"], filters: { postcodes: [], prosecutors: ["CPS"] } });

      expect($("input[name='prosecutor'][value='CPS']").is("[checked]")).toBe(true);
      expect($("input[name='prosecutor'][value='TfL']").is("[checked]")).toBe(false);
    });
  });

  describe("Cases table", () => {
    it("should render the sortable table with the configured headers", () => {
      const { $ } = renderCases([buildCase()]);

      expect($("table[data-module='moj-sortable-table']")).toHaveLength(1);
      expect(tableHeaders($)).toEqual([en.common.nameHeader, en.common.postcodeHeader, en.common.offenceHeader, en.common.prosecutorHeader]);
    });

    it("should place each case field in its correct column", () => {
      const { $ } = renderCases([buildCase({ name: "John Smith", postcode: "SW1A 1AA", offence: "Speeding", prosecutor: "CPS" })]);

      const cells = $("table tbody tr").first().find("td");
      expect(cells.eq(COLUMN.name).text().trim()).toBe("John Smith");
      expect(cells.eq(COLUMN.postcode).text().trim()).toBe("SW1A 1AA");
      expect(cells.eq(COLUMN.offence).text().trim()).toBe("Speeding");
      expect(cells.eq(COLUMN.prosecutor).text().trim()).toBe("CPS");
    });

    it("should render a row per case", () => {
      const { $ } = renderCases([
        buildCase({ name: "John Smith", postcode: "SW1A 1AA", offence: "Speeding", prosecutor: "CPS" }),
        buildCase({ name: "Jane Doe", postcode: "E1 6AN", offence: "No insurance", prosecutor: "TfL" })
      ]);

      const names = $("table tbody tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.name).text().trim())
        .get();
      expect(names).toEqual(["John Smith", "Jane Doe"]);
      const postcodes = $("table tbody tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.postcode).text().trim())
        .get();
      expect(postcodes).toEqual(["SW1A 1AA", "E1 6AN"]);
    });

    it("should render an empty postcode cell when the case has no postcode", () => {
      const { $ } = renderCases([buildCase({ name: "John Smith", postcode: null, offence: "Speeding" })]);

      const cells = $("table tbody tr").first().find("td");
      expect(cells.eq(COLUMN.name).text().trim()).toBe("John Smith");
      expect(cells.eq(COLUMN.postcode).text().trim()).toBe("");
      expect(cells.eq(COLUMN.offence).text().trim()).toBe("Speeding");
    });

    it("should render an empty offence cell when the case has no offence", () => {
      const { $ } = renderCases([buildCase({ name: "John Smith", postcode: "SW1A 1AA", offence: null })]);

      const cells = $("table tbody tr").first().find("td");
      expect(cells.eq(COLUMN.name).text().trim()).toBe("John Smith");
      expect(cells.eq(COLUMN.postcode).text().trim()).toBe("SW1A 1AA");
      expect(cells.eq(COLUMN.offence).text().trim()).toBe("");
    });

    it("should render the no-cases message when the list is empty", () => {
      const { $ } = renderList();

      expect($("table")).toHaveLength(0);
      expect($("#content-area p.govuk-body").text().trim()).toBe(en.common.noCasesFound);
    });
  });

  describe("Back to top link", () => {
    it("should render the back-to-top link", () => {
      const { $ } = renderList();

      expect($(".back-to-top-link").text()).toContain(en.common.backToTop);
    });
  });

  describe("JavaScript section", () => {
    it("should render the page script with the CSP nonce", () => {
      const { $ } = renderList();

      const script = filterScript($);
      expect(script.attr("nonce")).toBe("test-nonce");
    });

    it("should wire up the filter toggle and section toggle scripts", () => {
      const { $ } = renderList();

      const script = filterScript($).text();
      expect(script).toContain("document.getElementById('filter-toggle')");
      expect(script).toContain("document.getElementById('filter-panel')");
      expect(script).toContain("document.getElementById('content-area')");
      expect(script).toContain("setupFilterToggle('postcodes-anchor', 'postcodes-link', 'postcodes-checkbox')");
      expect(script).toContain("setupFilterToggle('prosecutor-anchor', 'prosecutor-link', 'prosecutor-checkbox')");
    });

    it("should use the localised show/hide filter labels in the script", () => {
      const { $ } = renderList();

      const script = filterScript($).text();
      expect(script).toContain(`filterToggle.textContent = '${en.common.hideFilters}'`);
      expect(script).toContain(`filterToggle.textContent = '${en.common.showFilters}'`);
    });
  });

  describe("Welsh rendering", () => {
    it("should render the Welsh page title, summary labels and back-to-top link", () => {
      const { $ } = renderList({ totalCases: 5 }, cy);

      expect($("h1.govuk-heading-l").text().trim()).toBe(cy.SJP_PUBLIC_LIST.title);
      const summary = summaryText($, cy.common.listContaining);
      expect(summary).toContain(cy.common.listContaining);
      expect(summary).toContain(cy.common.generatedOn);
      expect(summary).toContain(cy.common.at);
      expect($(".back-to-top-link").text()).toContain(cy.common.backToTop);
    });

    it("should render the Welsh filter labels and no-cases message", () => {
      const { $ } = renderList({}, cy);

      expect($("#filter-toggle").text().trim()).toBe(cy.common.showFilters);
      expect($("#filter-panel h2.govuk-heading-m").text()).toContain(cy.common.filterTitle);
      expect($("#filter-panel h3.govuk-heading-s").text()).toContain(cy.common.selectedFilters);
      expect($("#postcodes-anchor").text()).toContain(cy.common.postcodeFilterHeading);
      expect($("#prosecutor-anchor").text()).toContain(cy.common.prosecutorFilterHeading);
      expect($("#content-area p.govuk-body").text().trim()).toBe(cy.common.noCasesFound);
    });

    it("should render the Welsh table headers", () => {
      const { $ } = renderCases([buildCase({ offence: "Goryrru" })], {}, cy);

      expect(tableHeaders($)).toEqual([cy.common.nameHeader, cy.common.postcodeHeader, cy.common.offenceHeader, cy.common.prosecutorHeader]);
    });

    it("should use the Welsh show/hide filter labels in the script", () => {
      const { $ } = renderList({}, cy);

      const script = filterScript($).text();
      expect(script).toContain(`filterToggle.textContent = '${cy.common.hideFilters}'`);
      expect(script).toContain(`filterToggle.textContent = '${cy.common.showFilters}'`);
    });
  });

  describe("Edge cases", () => {
    it("should render zero cases with the no-cases message", () => {
      const { $ } = renderList({ totalCases: 0 });

      expect(summaryText($, en.common.listContaining)).toContain(`${en.common.listContaining} 0 ${en.common.casesText}`);
      expect($("table")).toHaveLength(0);
      expect($("#content-area p.govuk-body").text().trim()).toBe(en.common.noCasesFound);
    });

    it("should render a single case", () => {
      const { $ } = renderCases([buildCase({ name: "Single Case" })], { totalCases: 1 });

      expect(summaryText($, en.common.listContaining)).toContain(`${en.common.listContaining} 1 ${en.common.casesText}`);
      expect($("table tbody tr")).toHaveLength(1);
      expect($("table tbody tr").first().find("td").eq(COLUMN.name).text().trim()).toBe("Single Case");
    });

    it("should render the prosecutor filter container with an empty prosecutor list", () => {
      const { $ } = renderList({ prosecutors: [] });

      expect($("#prosecutor-checkbox")).toHaveLength(1);
      expect($("input[name='prosecutor']")).toHaveLength(0);
    });

    it("should render the postcode filter container with an empty postcode list", () => {
      const { $ } = renderList({ postcodeAreas: [] });

      expect($("#postcodes-checkbox")).toHaveLength(1);
      expect($("input[name='postcode']")).toHaveLength(0);
    });

    it("should render pagination at a boundary page without a previous link", () => {
      const { $ } = renderList({
        totalCases: 5000,
        pagination: { currentPage: 1, totalPages: 5, hasPrevious: false, hasNext: true, pageNumbers: [1, 2, 3, 4, 5] }
      });

      expect($(".govuk-pagination__prev")).toHaveLength(0);
      expect($(".govuk-pagination__next")).toHaveLength(1);
    });
  });
});
