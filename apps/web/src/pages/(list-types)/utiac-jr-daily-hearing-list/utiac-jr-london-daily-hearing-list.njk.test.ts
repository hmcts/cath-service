import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import { utiacJrDailyHearingListCy as cy, utiacJrDailyHearingListEn as en, londonTableHeaders, londonTableHeadersCy } from "@hmcts/utiac-jr-daily-hearing-list";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "utiac-jr-london-daily-hearing-list.njk";
const DEFAULT_LIST_TITLE = "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List";

interface HearingOverrides {
  hearingTime?: string;
  caseTitle?: string;
  representative?: string;
  caseReferenceNumber?: string;
  judges?: string;
  hearingType?: string;
  location?: string;
  additionalInformation?: string;
}

// Fixture builders — each test passes only the varied leaf fields; the full
// hearing row and surrounding view model default to a realistic minimal shape.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    hearingTime: "10:00am",
    caseTitle: "Smith v Secretary of State",
    representative: "J. Doe Solicitors",
    caseReferenceNumber: "JR/01234/2026",
    judges: "Upper Tribunal Judge Smith",
    hearingType: "Case Management Review",
    location: "Field House",
    additionalInformation: "Video hearing",
    ...overrides
  };
}

function baseData(locale: "en" | "cy" = "en") {
  const content = locale === "cy" ? cy : en;
  const tableHeaders = locale === "cy" ? londonTableHeadersCy : londonTableHeaders;
  return {
    t: { ...content, tableHeaders },
    en,
    cy,
    header: {
      listTitle: DEFAULT_LIST_TITLE,
      listForDate: "10 July 2026",
      lastUpdatedDate: "10 July 2026",
      lastUpdatedTime: "9:00am"
    },
    dataSource: "Manual Upload"
  };
}

function renderList(hearings: unknown[], overrides: Record<string, unknown> = {}, locale: "en" | "cy" = "en") {
  const base = baseData(locale);
  return render(env, TEMPLATE, { ...base, ...overrides, header: { ...base.header, ...(overrides.header as object) }, hearings });
}

// The rendered hearings table columns, in order.
const COLUMN = {
  hearingTime: 0,
  caseTitle: 1,
  representative: 2,
  caseReferenceNumber: 3,
  judges: 4,
  hearingType: 5,
  location: 6,
  additionalInformation: 7
} as const;

function firstDataRowCells($: CheerioAPI) {
  return $("tbody.govuk-table__body tr")
    .first()
    .find("td")
    .map((_, el) => $(el).text().trim())
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("utiac-jr-london-daily-hearing-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have the same keys in the English and Welsh London table headers", () => {
      expect(Object.keys(londonTableHeaders).sort()).toEqual(Object.keys(londonTableHeadersCy).sort());
    });

    it("should use https FACT and guidance link URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.importantInformationLinkUrl).toMatch(/^https:\/\//);
      expect(cy.importantInformationLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the list title as the h1 heading with the #top anchor", () => {
      const { $ } = renderList([], { header: { listTitle: "Custom List Title" } });

      const heading = $("h1#top");
      expect(heading).toHaveLength(1);
      expect(heading.text()).toContain("Custom List Title");
    });

    it("should render the FACT link with the configured text, URL and additional text", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
      expect($(".govuk-body").text()).toContain(en.factAdditionalText);
    });

    it("should render the list-for date and last-updated line", () => {
      const { $ } = renderList([], { header: { listForDate: "10 July 2026", lastUpdatedDate: "10 July 2026", lastUpdatedTime: "9:00am" } });

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(`${en.listForDate} 10 July 2026`);
      expect(bodyText).toContain(`${en.lastUpdated} 10 July 2026 ${en.at} 9:00am`);
    });
  });

  describe("Important information details", () => {
    it("should render an open GOV.UK details component with the important-information text", () => {
      const { $ } = renderList([]);

      const details = $("details.govuk-details[data-module='govuk-details']");
      expect(details).toHaveLength(1);
      expect(details.attr("open")).toBeDefined();
      expect(details.find(".govuk-details__summary-text").text()).toContain(en.importantInformationTitle);
      expect(details.find(".govuk-details__text").text()).toContain(en.importantInformationText);
    });

    it("should render the observe-a-hearing guidance link opening in a new tab safely", () => {
      const { $ } = renderList([]);

      const link = $(`a[href="${en.importantInformationLinkUrl}"]`);
      expect(link).toHaveLength(1);
      expect(link.text()).toContain(en.importantInformationLinkText);
      expect(link.attr("target")).toBe("_blank");
      expect(link.attr("rel")).toBe("noopener noreferrer");
    });
  });

  describe("Search", () => {
    it("should always render the search input with an accessible label", () => {
      const { $ } = renderList([]);

      expect($("h2").text()).toContain(en.searchCasesTitle);
      const input = $("#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);
    });
  });

  describe("Hearings table", () => {
    it("should render all eight column headers in order", () => {
      const { $ } = renderList([]);

      const headers = $("thead th[scope='col']")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        londonTableHeaders.hearingTime,
        londonTableHeaders.caseTitle,
        londonTableHeaders.representative,
        londonTableHeaders.caseReferenceNumber,
        londonTableHeaders.judges,
        londonTableHeaders.hearingType,
        londonTableHeaders.location,
        londonTableHeaders.additionalInformation
      ]);
    });

    it("should label the table with the list title", () => {
      const { $ } = renderList([], { header: { listTitle: "Test List Title" } });

      expect($("#hearings-table").attr("aria-label")).toBe("Test List Title");
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          hearingTime: "10:00am",
          caseTitle: "Smith v Secretary of State",
          representative: "J. Doe Solicitors",
          caseReferenceNumber: "JR/01234/2026",
          judges: "Upper Tribunal Judge Smith",
          hearingType: "Case Management Review",
          location: "Field House",
          additionalInformation: "Video hearing"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.hearingTime]).toBe("10:00am");
      expect(cells[COLUMN.caseTitle]).toBe("Smith v Secretary of State");
      expect(cells[COLUMN.representative]).toBe("J. Doe Solicitors");
      expect(cells[COLUMN.caseReferenceNumber]).toBe("JR/01234/2026");
      expect(cells[COLUMN.judges]).toBe("Upper Tribunal Judge Smith");
      expect(cells[COLUMN.hearingType]).toBe("Case Management Review");
      expect(cells[COLUMN.location]).toBe("Field House");
      expect(cells[COLUMN.additionalInformation]).toBe("Video hearing");
    });

    it("should render one row per hearing", () => {
      const { $ } = renderList(
        [
          buildHearing({ caseTitle: "Smith v Secretary of State", caseReferenceNumber: "JR/01234/2026" }),
          buildHearing({
            hearingTime: "2:00pm",
            caseTitle: "Jones v Home Office",
            representative: "A. Lawyer Associates",
            caseReferenceNumber: "JR/56789/2026",
            judges: "Upper Tribunal Judge Jones",
            hearingType: "Substantive Hearing",
            location: "Taylor House",
            additionalInformation: "In person hearing"
          })
        ],
        { dataSource: "XHIBIT" }
      );

      const caseTitles = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseTitle).text().trim())
        .get();
      expect(caseTitles).toEqual(["Smith v Secretary of State", "Jones v Home Office"]);
      const caseRefs = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseReferenceNumber).text().trim())
        .get();
      expect(caseRefs).toEqual(["JR/01234/2026", "JR/56789/2026"]);
      expect($("p.govuk-body-s").text()).toContain("XHIBIT");
    });

    it("should render empty cells for empty optional fields", () => {
      const { $ } = renderList([
        buildHearing({
          caseTitle: "Smith v Secretary of State",
          representative: "",
          caseReferenceNumber: "JR/01234/2026",
          judges: "",
          hearingType: "Case Management Review",
          location: "",
          additionalInformation: ""
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.caseTitle]).toBe("Smith v Secretary of State");
      expect(cells[COLUMN.caseReferenceNumber]).toBe("JR/01234/2026");
      expect(cells[COLUMN.hearingType]).toBe("Case Management Review");
      expect(cells[COLUMN.representative]).toBe("");
      expect(cells[COLUMN.judges]).toBe("");
      expect(cells[COLUMN.location]).toBe("");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });

    it("should render the table with a head and body but no data rows when there are no hearings", () => {
      const { $ } = renderList([]);

      expect($("thead.govuk-table__head")).toHaveLength(1);
      expect($("tbody.govuk-table__body")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Manual Upload" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("Manual Upload");
    });

    it("should render a back-to-top link anchored to #top", () => {
      const { $ } = renderList([]);

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(en.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, table headers, labels and hearing data", () => {
      const { $ } = renderList(
        [buildHearing({ hearingType: "Adolygiad Rheoli Achos", additionalInformation: "Gwrandawiad fideo" })],
        { header: { listTitle: "Rhestr Prawf", listForDate: "10 Gorffennaf 2026", lastUpdatedDate: "10 Gorffennaf 2026" }, dataSource: "Llwytho â llaw" },
        "cy"
      );

      expect($("h1#top").text()).toContain("Rhestr Prawf");
      expect($(".govuk-body").text()).toContain(`${cy.lastUpdated} 10 Gorffennaf 2026`);
      expect($("details .govuk-details__summary-text").text()).toContain(cy.importantInformationTitle);
      expect($("h2").text()).toContain(cy.searchCasesTitle);

      const headers = $("thead th[scope='col']")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(londonTableHeadersCy.additionalInformation);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.hearingType]).toBe("Adolygiad Rheoli Achos");
      expect(cells[COLUMN.additionalInformation]).toBe("Gwrandawiad fideo");

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(cy.dataSource);
      expect(footer.text()).toContain("Llwytho â llaw");
      expect($(".back-to-top a").text()).toContain(cy.backToTop);
    });
  });
});
