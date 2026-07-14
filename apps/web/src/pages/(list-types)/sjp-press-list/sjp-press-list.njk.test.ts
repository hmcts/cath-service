import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sjpPressListCy as cy, sjpPressListEn as en } from "@hmcts/sjp-press-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "sjp-press-list.njk";
const MEDIA_PROTOCOL_URL =
  "https://www.gov.uk/government/publications/guidance-to-staff-on-supporting-media-access-to-courts-and-tribunals/protocol-on-sharing-court-lists-registers-and-documents-with-the-media-accessible-version";

interface OffenceOverrides {
  offenceTitle?: string;
  offenceWording?: string | null;
  reportingRestriction?: boolean;
}

interface CaseOverrides {
  name?: string;
  dateOfBirth?: Date | null;
  age?: string | null;
  reference?: string | null;
  address?: string | null;
  prosecutor?: string | null;
  offences?: unknown[];
}

// Fixture builders — each layer defaults to a realistic minimal shape and only
// the varied leaf fields are passed per test, keeping the view-model tree out
// of individual tests.
function buildOffence(overrides: OffenceOverrides = {}) {
  return { offenceTitle: "Speeding", offenceWording: "Exceeded speed limit on A1 road", reportingRestriction: false, ...overrides };
}

function buildCase(overrides: CaseOverrides = {}) {
  return {
    name: "John Doe",
    dateOfBirth: new Date("1985-03-15"),
    age: "39",
    reference: "REF123456",
    address: "123 Main Street, London, SW1A 1AA",
    prosecutor: "CPS",
    offences: [],
    ...overrides
  };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    title: locale.SJP_PRESS_LIST.title,
    ...locale.common,
    list: {
      artefactId: "test-artefact-123",
      contentDate: new Date("2026-01-15"),
      publishedAt: new Date("2026-01-15T10:00:00Z")
    },
    cases: [] as unknown[],
    prosecutors: [] as string[],
    postcodeAreas: [] as string[],
    hasLondonPostcodes: false,
    londonPostcodes: [] as string[],
    pagination: { currentPage: 1, totalPages: 1, hasPrevious: false, hasNext: false, pageNumbers: [1] },
    filters: { postcodes: [] as string[], prosecutors: [] as string[] },
    showFilter: false,
    cspNonce: "test-nonce-12345"
  };
}

function renderList(overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides });
}

// The rendered case summary-list rows, in order.
const ROW = { name: 0, dob: 1, reference: 2, address: 3, prosecutor: 4 } as const;

function caseSummaryValues($: CheerioAPI, caseIndex = 0) {
  return $(".govuk-summary-list")
    .eq(caseIndex)
    .find(".govuk-summary-list__value")
    .map((_, el) => $(el).text().trim())
    .get();
}

function offenceText($: CheerioAPI) {
  return $("p.govuk-\\!-margin-top-3").text().replace(/\s+/g, " ").trim();
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

describe("sjp-press-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same top-level and common keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
      expect(Object.keys(en.common).sort()).toEqual(Object.keys(cy.common).sort());
    });

    it("should use an https FACT link URL", () => {
      expect(en.common.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.common.factLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Header section", () => {
    it("should render the page title as the heading", () => {
      const { $ } = renderList();

      expect($("h1.govuk-heading-l").text()).toContain(en.SJP_PRESS_LIST.title);
    });

    it("should render the FACT link with the configured text, URL and trailing text", () => {
      const { $ } = renderList();

      const factLink = $(`a[href="${en.common.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.common.factLinkText);
      expect(factLink.parent("p.govuk-body").text()).toContain(en.common.factAdditionalText);
    });

    it("should render the SJP explanation accordion", () => {
      const { $ } = renderList();

      const accordion = $(".govuk-details").eq(0);
      expect(accordion.find(".govuk-details__summary-text").text()).toContain(en.common.accordionTitle);
      expect(accordion.find(".govuk-details__text").text()).toContain(en.common.accordionContent);
    });

    it("should render the content date and published date line", () => {
      const { $ } = renderList();

      const dateLine = $("p.govuk-body").filter((_, el) => $(el).find("strong").length > 0);
      expect(dateLine.find("strong").text()).toContain(en.common.listFor);
      expect(dateLine.text()).toContain(en.common.published);
      expect(dateLine.text()).toContain(en.common.at);
    });

    it("should render the important information section with the media protocol link", () => {
      const { $ } = renderList();

      const importantInfo = $(".govuk-details").eq(1);
      expect(importantInfo.find(".govuk-details__summary-text").text()).toContain(en.common.importantInfoTitle);
      expect(importantInfo.find(".govuk-details__text").text()).toContain(en.common.importantInfoContent);

      const protocolLink = $(`a[href="${MEDIA_PROTOCOL_URL}"]`);
      expect(protocolLink).toHaveLength(1);
      expect(protocolLink.text()).toContain(en.common.mediaProtocolLink);
    });
  });

  describe("Filter toggle", () => {
    it("should label the toggle 'Show filters' when no filters are active", () => {
      const { $ } = renderList();

      expect($("#filter-toggle").text().trim()).toBe(en.common.showFilters);
    });

    it("should label the toggle 'Hide filters' when showFilter is true", () => {
      const { $ } = renderList({ showFilter: true });

      expect($("#filter-toggle").text().trim()).toBe(en.common.hideFilters);
    });

    it("should label the toggle 'Hide filters' when postcode filters are active", () => {
      const { $ } = renderList({ filters: { postcodes: ["SW1"], prosecutors: [] } });

      expect($("#filter-toggle").text().trim()).toBe(en.common.hideFilters);
    });

    it("should label the toggle 'Hide filters' when prosecutor filters are active", () => {
      const { $ } = renderList({ filters: { postcodes: [], prosecutors: ["CPS"] } });

      expect($("#filter-toggle").text().trim()).toBe(en.common.hideFilters);
    });
  });

  describe("Filter panel", () => {
    it("should mark the filter panel hidden when no filters are active", () => {
      const { $ } = renderList();

      expect($("#filter-panel").hasClass("hidden")).toBe(true);
    });

    it("should not hide the filter panel when showFilter is true", () => {
      const { $ } = renderList({ showFilter: true });

      expect($("#filter-panel").hasClass("hidden")).toBe(false);
    });

    it("should render the filter title and apply button", () => {
      const { $ } = renderList({ showFilter: true });

      expect($("#filter-panel h2.govuk-heading-m").text()).toContain(en.common.filterTitle);
      const applyButton = $("button.govuk-button").filter((_, el) => $(el).text().trim() === en.common.applyFilters);
      expect(applyButton).toHaveLength(1);
    });

    it("should render the selected filters heading and clear filters link", () => {
      const { $ } = renderList({ showFilter: true });

      expect($("h3.govuk-heading-s").text()).toContain(en.common.selectedFilters);
      const clearLink = $('a[href="?artefactId=test-artefact-123&showFilter=true"]');
      expect(clearLink).toHaveLength(1);
      expect(clearLink.text()).toContain(en.common.clearFilters);
    });

    it("should render active postcode filter tags", () => {
      const { $ } = renderList({ filters: { postcodes: ["SW1", "E1"], prosecutors: [] } });

      const tags = $(".filter-tag")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(tags).toHaveLength(2);
      expect(tags[0]).toContain("SW1");
      expect(tags[1]).toContain("E1");
      expect($(".filter-tag-remove")).toHaveLength(2);
    });

    it("should render active prosecutor filter tags", () => {
      const { $ } = renderList({ filters: { postcodes: [], prosecutors: ["CPS", "TfL"] } });

      const tags = $(".filter-tag")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(tags).toHaveLength(2);
      expect(tags[0]).toContain("CPS");
      expect(tags[1]).toContain("TfL");
    });

    it("should render filter tags with an accessible remove link", () => {
      const { $ } = renderList({ filters: { postcodes: ["SW1"], prosecutors: [] } });

      const removeLink = $('a[aria-label="Remove SW1 filter"]');
      expect(removeLink).toHaveLength(1);
      expect(removeLink.hasClass("filter-tag-remove")).toBe(true);
    });

    it("should render the search input with its label", () => {
      const { $ } = renderList({ showFilter: true });

      const input = $("#filter-search");
      expect(input).toHaveLength(1);
      expect(input.attr("name")).toBe("filter-search");
      expect($('label[for="filter-search"]').text()).toContain(en.common.searchLabel);
    });

    it("should render the postcode filter section", () => {
      const { $ } = renderList({ showFilter: true, postcodeAreas: ["SW1", "E1", "N1"] });

      expect($("#postcodes-anchor").text()).toContain(en.common.postcodeFilterHeading);
      expect($("#postcodes-checkbox")).toHaveLength(1);
    });

    it("should render a checkbox per postcode area", () => {
      const { $ } = renderList({ showFilter: true, postcodeAreas: ["SW1", "E1"] });

      expect($("#postcode-1").attr("value")).toBe("SW1");
      expect($("#postcode-2").attr("value")).toBe("E1");
    });

    it("should check the postcode checkbox when its area is an active filter", () => {
      const { $ } = renderList({
        showFilter: true,
        postcodeAreas: ["SW1", "E1"],
        filters: { postcodes: ["SW1"], prosecutors: [] }
      });

      expect($("#postcode-1").is(":checked")).toBe(true);
      expect($("#postcode-2").is(":checked")).toBe(false);
    });

    it("should render the London postcodes option when hasLondonPostcodes is true", () => {
      const { $ } = renderList({ showFilter: true, postcodeAreas: ["E", "W", "N"], hasLondonPostcodes: true });

      const londonOption = $("#postcode-london");
      expect(londonOption).toHaveLength(1);
      expect(londonOption.attr("value")).toBe("LONDON_POSTCODES");
      expect($('label[for="postcode-london"]').text()).toContain(en.common.londonPostcodesLabel);
    });

    it("should not render the London postcodes option when hasLondonPostcodes is false", () => {
      const { $ } = renderList({ showFilter: true, postcodeAreas: ["AB1", "CD2"], hasLondonPostcodes: false });

      expect($("#postcode-london")).toHaveLength(0);
    });

    it("should render the prosecutor filter section", () => {
      const { $ } = renderList({ showFilter: true, prosecutors: ["CPS", "TfL"] });

      expect($("#prosecutor-anchor").text()).toContain(en.common.prosecutorFilterHeading);
      expect($("#prosecutor-checkbox")).toHaveLength(1);
    });

    it("should render a checkbox per prosecutor", () => {
      const { $ } = renderList({ showFilter: true, prosecutors: ["CPS", "TfL"] });

      expect($("#prosecutor-1").attr("value")).toBe("CPS");
      expect($("#prosecutor-2").attr("value")).toBe("TfL");
    });

    it("should check the prosecutor checkbox when it is an active filter", () => {
      const { $ } = renderList({
        showFilter: true,
        prosecutors: ["CPS", "TfL"],
        filters: { postcodes: [], prosecutors: ["CPS"] }
      });

      expect($("#prosecutor-1").is(":checked")).toBe(true);
      expect($("#prosecutor-2").is(":checked")).toBe(false);
    });

    it("should render a hidden artefactId input", () => {
      const { $ } = renderList({ showFilter: true });

      const input = $('input[name="artefactId"]');
      expect(input.attr("type")).toBe("hidden");
      expect(input.attr("value")).toBe("test-artefact-123");
    });
  });

  describe("Pagination", () => {
    it("should not render pagination when there is only one page", () => {
      const { $ } = renderList();

      expect($(".govuk-pagination")).toHaveLength(0);
    });

    it("should render pagination when there are multiple pages", () => {
      const { $ } = renderList({
        pagination: { currentPage: 2, totalPages: 5, hasPrevious: true, hasNext: true, pageNumbers: [1, 2, 3, 4, 5] }
      });

      expect($(".govuk-pagination")).toHaveLength(1);
    });

    it("should render a previous link when hasPrevious is true", () => {
      const { $ } = renderList({
        pagination: { currentPage: 2, totalPages: 3, hasPrevious: true, hasNext: true, pageNumbers: [1, 2, 3] }
      });

      const prev = $(".govuk-pagination__prev a");
      expect(prev).toHaveLength(1);
      expect(prev.text()).toContain(en.common.previous);
      expect(prev.attr("href")).toContain("artefactId=test-artefact-123");
      expect(prev.attr("href")).toContain("page=1");
    });

    it("should not render a previous link when hasPrevious is false", () => {
      const { $ } = renderList({
        pagination: { currentPage: 1, totalPages: 3, hasPrevious: false, hasNext: true, pageNumbers: [1, 2, 3] }
      });

      expect($(".govuk-pagination__prev")).toHaveLength(0);
    });

    it("should render a next link when hasNext is true", () => {
      const { $ } = renderList({
        pagination: { currentPage: 1, totalPages: 3, hasPrevious: false, hasNext: true, pageNumbers: [1, 2, 3] }
      });

      const next = $(".govuk-pagination__next a");
      expect(next).toHaveLength(1);
      expect(next.text()).toContain(en.common.next);
      expect(next.attr("href")).toContain("artefactId=test-artefact-123");
      expect(next.attr("href")).toContain("page=2");
    });

    it("should not render a next link when hasNext is false", () => {
      const { $ } = renderList({
        pagination: { currentPage: 3, totalPages: 3, hasPrevious: true, hasNext: false, pageNumbers: [1, 2, 3] }
      });

      expect($(".govuk-pagination__next")).toHaveLength(0);
    });

    it("should render a link for each page number", () => {
      const { $ } = renderList({
        pagination: { currentPage: 2, totalPages: 3, hasPrevious: true, hasNext: true, pageNumbers: [1, 2, 3] }
      });

      const pageLabels = $(".govuk-pagination__list a")
        .map((_, el) => $(el).attr("aria-label"))
        .get();
      expect(pageLabels).toEqual(["Page 1", "Page 2", "Page 3"]);
    });

    it("should mark the current page with aria-current", () => {
      const { $ } = renderList({
        pagination: { currentPage: 2, totalPages: 3, hasPrevious: true, hasNext: true, pageNumbers: [1, 2, 3] }
      });

      const current = $('[aria-current="page"]');
      expect(current).toHaveLength(1);
      expect(current.attr("aria-label")).toBe("Page 2");
      expect($(".govuk-pagination__item--current")).toHaveLength(1);
    });

    it("should include active filters in the pagination links", () => {
      const { $ } = renderList({
        pagination: { currentPage: 1, totalPages: 2, hasPrevious: false, hasNext: true, pageNumbers: [1, 2] },
        filters: { postcodes: ["SW1"], prosecutors: ["CPS"] }
      });

      const nextHref = $(".govuk-pagination__next a").attr("href");
      expect(nextHref).toContain("postcode=SW1");
      expect(nextHref).toContain("prosecutor=CPS");
    });
  });

  describe("Cases", () => {
    it("should render the no cases message when the cases array is empty", () => {
      const { $ } = renderList();

      expect($("#content-area").text()).toContain(en.common.noCasesFound);
      expect($(".govuk-summary-list")).toHaveLength(0);
    });

    it("should place each case field in its correct summary row", () => {
      const { $ } = renderList({
        cases: [
          buildCase({
            name: "John Doe",
            reference: "REF123456",
            address: "123 Main Street, London, SW1A 1AA",
            prosecutor: "CPS",
            offences: [buildOffence({ offenceTitle: "Speeding", offenceWording: "Exceeded speed limit on A1 road", reportingRestriction: true })]
          })
        ]
      });

      const values = caseSummaryValues($);
      expect(values[ROW.name]).toBe("John Doe");
      expect(values[ROW.reference]).toBe("REF123456");
      expect(values[ROW.address]).toBe("123 Main Street, London, SW1A 1AA");
      expect(values[ROW.prosecutor]).toBe("CPS");

      const offences = offenceText($);
      expect(offences).toContain(en.common.reportingRestrictionHeader);
      expect(offences).toContain("True");
      expect(offences).toContain("Speeding");
      expect(offences).toContain("Exceeded speed limit on A1 road");
    });

    it("should render the date of birth without age when no age is present", () => {
      const { $ } = renderList({ cases: [buildCase({ name: "Jane Smith", age: null, offences: [] })] });

      expect(caseSummaryValues($)[ROW.name]).toBe("Jane Smith");
      expect(caseSummaryValues($)[ROW.dob]).not.toContain("(");
    });

    it("should render an empty date of birth when no date of birth is present", () => {
      const { $ } = renderList({ cases: [buildCase({ name: "Bob Jones", dateOfBirth: null, age: null, offences: [] })] });

      expect(caseSummaryValues($)[ROW.name]).toBe("Bob Jones");
      expect(caseSummaryValues($)[ROW.dob]).toBe("");
    });

    it("should render empty values for missing optional fields", () => {
      const { $ } = renderList({
        cases: [buildCase({ name: "Alice Brown", age: null, reference: null, address: null, prosecutor: null, offences: [] })]
      });

      const values = caseSummaryValues($);
      expect(values[ROW.name]).toBe("Alice Brown");
      expect(values[ROW.reference]).toBe("");
      expect(values[ROW.address]).toBe("");
      expect(values[ROW.prosecutor]).toBe("");
      expect($(".govuk-summary-list")).toHaveLength(1);
    });

    it("should render an offence without a separator when it has no wording", () => {
      const { $ } = renderList({
        cases: [buildCase({ offences: [buildOffence({ offenceTitle: "TV Licence Offence", offenceWording: null })] })]
      });

      const offences = offenceText($);
      expect(offences).toContain("TV Licence Offence");
      expect(offences).not.toMatch(/TV Licence Offence\s+-/);
    });

    it("should render a false reporting restriction", () => {
      const { $ } = renderList({
        cases: [
          buildCase({
            offences: [buildOffence({ offenceTitle: "Parking Violation", offenceWording: "Parked in restricted zone", reportingRestriction: false })]
          })
        ]
      });

      const offences = offenceText($);
      expect(offences).toContain(en.common.reportingRestrictionHeader);
      expect(offences).toContain("False");
    });

    it("should render every offence for a case", () => {
      const { $ } = renderList({
        cases: [
          buildCase({
            offences: [
              buildOffence({ offenceTitle: "Speeding", offenceWording: "70mph in 50mph zone" }),
              buildOffence({ offenceTitle: "No Insurance", offenceWording: "Driving without valid insurance", reportingRestriction: true })
            ]
          })
        ]
      });

      expect($("p.govuk-\\!-margin-top-3")).toHaveLength(2);
      const offences = offenceText($);
      expect(offences).toContain("Speeding");
      expect(offences).toContain("70mph in 50mph zone");
      expect(offences).toContain("No Insurance");
      expect(offences).toContain("Driving without valid insurance");
    });

    it("should render a summary list and section break per case for multiple cases", () => {
      const { $ } = renderList({
        cases: [buildCase({ name: "First Person", offences: [] }), buildCase({ name: "Second Person", offences: [] })]
      });

      expect($(".govuk-summary-list")).toHaveLength(2);
      expect(caseSummaryValues($, 0)[ROW.name]).toBe("First Person");
      expect(caseSummaryValues($, 1)[ROW.name]).toBe("Second Person");
      expect($("hr.govuk-section-break")).toHaveLength(1);
    });

    it("should not render a section break for a single case", () => {
      const { $ } = renderList({ cases: [buildCase({ name: "Only Person", offences: [] })] });

      expect(caseSummaryValues($)[ROW.name]).toBe("Only Person");
      expect($("hr.govuk-section-break")).toHaveLength(0);
    });
  });

  describe("Footer", () => {
    it("should render a back to top link", () => {
      const { $ } = renderList();

      const backToTop = $("a.back-to-top-link");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.attr("href")).toBe("#");
      expect(backToTop.text()).toContain(en.common.backToTop);
    });
  });

  describe("Error handling", () => {
    it("should render the error summary when errors exist", () => {
      const { $ } = renderList({
        errors: [
          { text: "Enter a valid postcode", href: "#postcode" },
          { text: "Select at least one filter", href: "#filters" }
        ]
      });

      const summary = $(".govuk-error-summary");
      expect(summary).toHaveLength(1);
      expect(summary.text()).toContain(en.common.errorSummaryTitle);
      expect(summary.text()).toContain("Enter a valid postcode");
      expect(summary.text()).toContain("Select at least one filter");
    });

    it("should not render the error summary when there are no errors", () => {
      const { $ } = renderList();

      expect($(".govuk-error-summary")).toHaveLength(0);
    });
  });

  describe("Client-side scripts", () => {
    it("should render the filter toggle script under the CSP nonce", () => {
      const { $ } = renderList();

      const script = $('script[nonce="test-nonce-12345"]').filter((_, el) => $(el).text().includes("filterToggle"));
      expect(script).toHaveLength(1);
      expect(script.text()).toContain("filterPanel");
    });

    it("should render the collapsible filter sections script", () => {
      const { $ } = renderList();

      const script = $('script[nonce="test-nonce-12345"]').filter((_, el) => $(el).text().includes("setupFilterToggle"));
      expect(script).toHaveLength(1);
      expect(script.text()).toContain("postcodes-anchor");
      expect(script.text()).toContain("prosecutor-anchor");
    });
  });

  describe("Welsh rendering", () => {
    it("should render the Welsh heading and date labels", () => {
      const { $ } = renderList({}, cy);

      expect($("h1.govuk-heading-l").text()).toContain(cy.SJP_PRESS_LIST.title);
      const dateLine = $("p.govuk-body").filter((_, el) => $(el).find("strong").length > 0);
      expect(dateLine.find("strong").text()).toContain(cy.common.listFor);
      expect(dateLine.text()).toContain(cy.common.published);
      expect(dateLine.text()).toContain(cy.common.at);
    });

    it("should render the Welsh filter labels", () => {
      const { $ } = renderList({ showFilter: true, postcodeAreas: ["SW1"], prosecutors: ["CPS"] }, cy);

      expect($("#filter-panel h2.govuk-heading-m").text()).toContain(cy.common.filterTitle);
      expect($("#postcodes-anchor").text()).toContain(cy.common.postcodeFilterHeading);
      expect($("#prosecutor-anchor").text()).toContain(cy.common.prosecutorFilterHeading);
      const applyButton = $("button.govuk-button").filter((_, el) => $(el).text().trim() === cy.common.applyFilters);
      expect(applyButton).toHaveLength(1);
    });

    it("should render Welsh case summary headers", () => {
      const { $ } = renderList({ cases: [buildCase({ name: "Enw Prawf", reference: "CYF123", address: "Cyfeiriad Prawf", offences: [] })] }, cy);

      const keys = $(".govuk-summary-list__key")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(keys).toContain(cy.common.nameHeader);
      expect(keys).toContain(cy.common.dobHeader);
      expect(keys).toContain(cy.common.referenceHeader);
      expect(keys).toContain(cy.common.addressHeader);
      expect(keys).toContain(cy.common.prosecutorHeader);
    });

    it("should render the Welsh no cases message", () => {
      const { $ } = renderList({}, cy);

      expect($("#content-area").text()).toContain(cy.common.noCasesFound);
    });

    it("should render Welsh pagination labels", () => {
      const { $ } = renderList({ pagination: { currentPage: 2, totalPages: 3, hasPrevious: true, hasNext: true, pageNumbers: [1, 2, 3] } }, cy);

      expect($(".govuk-pagination__prev a").text()).toContain(cy.common.previous);
      expect($(".govuk-pagination__next a").text()).toContain(cy.common.next);
    });
  });
});
