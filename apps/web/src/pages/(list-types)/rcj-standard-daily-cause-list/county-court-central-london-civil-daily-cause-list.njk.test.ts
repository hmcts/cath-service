import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rcjStandardDailyCauseListCy as cy, rcjStandardDailyCauseListEn as en } from "@hmcts/rcj-standard-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "county-court-central-london-civil-daily-cause-list.njk";

const listContent = en.COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST;
const listContentCy = cy.COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST;
const common = en.common;
const commonCy = cy.common;

interface HearingOverrides {
  venue?: string;
  judge?: string;
  time?: string;
  caseNumber?: string;
  caseDetails?: string;
  hearingType?: string;
  additionalInformation?: string;
}

// Fixture builders — each test passes only the varied leaf fields; the header,
// locale content and data-source wrapper default to a realistic minimal shape.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    venue: "Court 1",
    judge: "Mr Justice Smith",
    time: "10:00am",
    caseNumber: "AB123456",
    caseDetails: "Smith v Jones",
    hearingType: "Application",
    additionalInformation: "In person",
    ...overrides
  };
}

function baseData(locale: "en" | "cy" = "en") {
  return {
    header: {
      listTitle: "County Court at Central London Civil Daily Cause List",
      listDate: "15 January 2026",
      lastUpdatedDate: "14 January 2026",
      lastUpdatedTime: "12:00pm"
    },
    listContent: locale === "cy" ? listContentCy : listContent,
    common: locale === "cy" ? commonCy : common,
    dataSource: "Manual Upload"
  };
}

function renderList(hearings: unknown[] = [], overrides: Record<string, unknown> = {}, locale: "en" | "cy" = "en") {
  const base = baseData(locale);
  return render(env, TEMPLATE, { ...base, ...overrides, header: { ...base.header, ...(overrides.header as object) }, hearings });
}

// The rendered hearings table columns, in order.
const COLUMN = { venue: 0, judge: 1, time: 2, caseNumber: 3, caseDetails: 4, hearingType: 5, additionalInformation: 6 } as const;

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

describe("county-court-central-london-civil-daily-cause-list.njk", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same list-content keys in English and Welsh", () => {
      expect(Object.keys(listContent).sort()).toEqual(Object.keys(listContentCy).sort());
    });

    it("should have the same common keys in English and Welsh", () => {
      expect(Object.keys(common).sort()).toEqual(Object.keys(commonCy).sort());
    });

    it("should use https FACT link URLs", () => {
      expect(common.factLinkUrl).toMatch(/^https:\/\//);
      expect(commonCy.factLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the list title as the top heading", () => {
      const { $ } = renderList();

      expect($("h1#top").text()).toContain("County Court at Central London Civil Daily Cause List");
    });

    it("should render the list date and last-updated line", () => {
      const { $ } = renderList();

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(`${common.listFor} 15 January 2026`);
      expect(bodyText).toContain(`${common.lastUpdated} 14 January 2026 ${common.at} 12:00pm`);
    });

    it("should render the FACT link with the configured text, URL and additional text", () => {
      const { $ } = renderList();

      const factLink = $(`a[href="${common.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(common.factLinkText);
      expect(factLink.parent().text()).toContain(common.factAdditionalText);
    });
  });

  describe("Location section", () => {
    it("should render all four location lines", () => {
      const { $ } = renderList();

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(listContent.locationLine1);
      expect(bodyText).toContain(listContent.locationLine2);
      expect(bodyText).toContain(listContent.locationLine3);
      expect(bodyText).toContain(listContent.locationLine4);
    });

    it("should render the first location line in a bold paragraph", () => {
      const { $ } = renderList();

      const boldTexts = $("p.govuk-\\!-font-weight-bold")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(boldTexts).toContain(listContent.locationLine1);
    });
  });

  describe("Important information section", () => {
    it("should render the important-information details with hearings and media text", () => {
      const { $ } = renderList();

      const details = $("details.govuk-details");
      expect(details).toHaveLength(1);
      expect(details.find(".govuk-details__summary-text").text()).toContain(common.importantInfoTitle);
      expect(details.text()).toContain("Central London County Court");
      expect(details.text()).toContain("enquiries.centrallondon.countycourt@justice.gov.uk");
    });

    it("should render the details component open by default", () => {
      const { $ } = renderList();

      expect($("details.govuk-details[open]")).toHaveLength(1);
    });
  });

  describe("Search section", () => {
    it("should render the search heading, input and visually hidden label", () => {
      const { $ } = renderList();

      expect($(".search-container h2").text()).toContain(common.searchCasesTitle);
      const input = $("input#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("aria-label")).toBe(common.searchCasesLabel);
      const label = $("label.govuk-visually-hidden[for='case-search-input']");
      expect(label).toHaveLength(1);
      expect(label.text()).toContain(common.searchCasesLabel);
    });
  });

  describe("Table headers", () => {
    it("should render all seven table headers with scope col in order", () => {
      const { $ } = renderList();

      const headers = $("thead th[scope='col']");
      expect(headers).toHaveLength(7);
      const headerTexts = headers.map((_, el) => $(el).text().trim()).get();
      expect(headerTexts).toEqual([
        common.tableHeaders.venue,
        common.tableHeaders.judge,
        common.tableHeaders.time,
        common.tableHeaders.caseNumber,
        common.tableHeaders.caseDetails,
        common.tableHeaders.hearingType,
        common.tableHeaders.additionalInformation
      ]);
    });
  });

  describe("Hearings table", () => {
    it("should render no data cells when the hearings array is empty", () => {
      const { $ } = renderList([]);

      expect($("tbody.govuk-table__body")).toHaveLength(1);
      expect($("tbody.govuk-table__body td")).toHaveLength(0);
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          venue: "Court 1",
          judge: "Mr Justice Smith",
          time: "10:00am",
          caseNumber: "AB123456",
          caseDetails: "Smith v Jones",
          hearingType: "Application",
          additionalInformation: "In person"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.venue]).toBe("Court 1");
      expect(cells[COLUMN.judge]).toBe("Mr Justice Smith");
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.caseNumber]).toBe("AB123456");
      expect(cells[COLUMN.caseDetails]).toBe("Smith v Jones");
      expect(cells[COLUMN.hearingType]).toBe("Application");
      expect(cells[COLUMN.additionalInformation]).toBe("In person");
    });

    it("should render one row per hearing", () => {
      const { $ } = renderList([
        buildHearing({ venue: "Court 1", caseNumber: "AB123456", caseDetails: "Smith v Jones" }),
        buildHearing({
          venue: "Court 2",
          judge: "Mrs Justice Brown",
          time: "11:00am",
          caseNumber: "CD789012",
          caseDetails: "Brown v White",
          hearingType: "Trial",
          additionalInformation: "Remote"
        })
      ]);

      const rows = $("tbody.govuk-table__body tr");
      expect(rows).toHaveLength(2);
      const venues = rows.map((_, row) => $(row).find("td").eq(COLUMN.venue).text().trim()).get();
      expect(venues).toEqual(["Court 1", "Court 2"]);
      const caseNumbers = rows.map((_, row) => $(row).find("td").eq(COLUMN.caseNumber).text().trim()).get();
      expect(caseNumbers).toEqual(["AB123456", "CD789012"]);
    });

    it("should render empty cells for empty hearing fields", () => {
      const { $ } = renderList([
        buildHearing({ venue: "", judge: "", time: "10:00am", caseNumber: "AB123456", caseDetails: "", hearingType: "", additionalInformation: "" })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.venue]).toBe("");
      expect(cells[COLUMN.judge]).toBe("");
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.caseNumber]).toBe("AB123456");
      expect(cells[COLUMN.caseDetails]).toBe("");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });
  });

  describe("Footer", () => {
    it("should render the data source label and value", () => {
      const { $ } = renderList([], { dataSource: "Manual Upload" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(`${common.dataSource}: Manual Upload`);
    });

    it("should render a different data source value", () => {
      const { $ } = renderList([], { dataSource: "CPP" });

      expect($("p.govuk-body-s").text()).toContain(`${common.dataSource}: CPP`);
    });

    it("should render a back-to-top link targeting the top anchor", () => {
      const { $ } = renderList();

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(common.backToTop);
    });
  });

  describe("Accessibility attributes", () => {
    it("should render the table with the list title as its aria-label", () => {
      const { $ } = renderList([], { header: { listTitle: "County Court at Central London Civil Daily Cause List" } });

      expect($("table#hearings-table").attr("aria-label")).toBe("County Court at Central London Civil Daily Cause List");
    });

    it("should anchor the heading with id top for the back-to-top link", () => {
      const { $ } = renderList();

      expect($("h1#top")).toHaveLength(1);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh title, location, sections and search", () => {
      const { $ } = renderList([], { header: { listTitle: "Rhestr Achosion Dyddiol Sifil yn y Llys Sirol yng Nghanol Llundain" } }, "cy");

      expect($("h1#top").text()).toContain("Rhestr Achosion Dyddiol Sifil yn y Llys Sirol yng Nghanol Llundain");
      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(listContentCy.locationLine1);
      expect($("details.govuk-details .govuk-details__summary-text").text()).toContain(commonCy.importantInfoTitle);
      expect($(".search-container h2").text()).toContain(commonCy.searchCasesTitle);
    });

    it("should render Welsh table headers", () => {
      const { $ } = renderList([], {}, "cy");

      const headerTexts = $("thead th[scope='col']")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headerTexts).toEqual([
        commonCy.tableHeaders.venue,
        commonCy.tableHeaders.judge,
        commonCy.tableHeaders.time,
        commonCy.tableHeaders.caseNumber,
        commonCy.tableHeaders.caseDetails,
        commonCy.tableHeaders.hearingType,
        commonCy.tableHeaders.additionalInformation
      ]);
    });

    it("should render Welsh footer text", () => {
      const { $ } = renderList([], { dataSource: "Llwytho â Llaw" }, "cy");

      expect($("p.govuk-body-s").text()).toContain(`${commonCy.dataSource}: Llwytho â Llaw`);
      expect($(".back-to-top a").text()).toContain(commonCy.backToTop);
    });
  });
});
