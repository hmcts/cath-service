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

const TEMPLATE = "senior-courts-costs-office-daily-cause-list.njk";

const listContent = en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST;
const listContentCy = cy.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST;
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
    venue: "Court Room 1",
    judge: "Master Smith",
    time: "10:00",
    caseNumber: "CA-2026-000001",
    caseDetails: "Smith v Jones",
    hearingType: "Detailed Assessment",
    additionalInformation: "Remote hearing",
    ...overrides
  };
}

function baseData(locale: "en" | "cy" = "en") {
  return {
    header: {
      listTitle: "Senior Courts Costs Office Daily Cause List",
      listDate: "10 July 2026",
      lastUpdatedDate: "9 July 2026",
      lastUpdatedTime: "4:30pm"
    },
    listContent: locale === "cy" ? listContentCy : listContent,
    common: locale === "cy" ? commonCy : common,
    dataSource: "CPP"
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

describe("senior-courts-costs-office-daily-cause-list.njk", () => {
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

    it("should use https FACT and more-info link URLs", () => {
      expect(common.factLinkUrl).toMatch(/^https:\/\//);
      expect(commonCy.factLinkUrl).toMatch(/^https:\/\//);
      expect(listContent.moreInfoLinkUrl).toMatch(/^https:\/\//);
      expect(listContentCy.moreInfoLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the list title as the top heading", () => {
      const { $ } = renderList([], { header: { listTitle: "Test List Title" } });

      const heading = $("h1.govuk-heading-l#top");
      expect(heading).toHaveLength(1);
      expect(heading.text()).toContain("Test List Title");
    });

    it("should render the list date and last-updated line", () => {
      const { $ } = renderList();

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(`${common.listFor} 10 July 2026`);
      expect(bodyText).toContain(`${common.lastUpdated} 9 July 2026 ${common.at} 4:30pm`);
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList();

      const factLink = $(`a[href="${common.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(common.factLinkText);
    });
  });

  describe("Location section", () => {
    it("should render all three location lines", () => {
      const { $ } = renderList();

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(listContent.locationLine1);
      expect(bodyText).toContain(listContent.locationLine2);
      expect(bodyText).toContain(listContent.locationLine3);
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
    it("should render the important-information details open by default with title and text", () => {
      const { $ } = renderList();

      const details = $("details.govuk-details[open]");
      expect(details).toHaveLength(1);
      expect(details.find(".govuk-details__summary-text").text()).toContain(common.importantInfoTitle);
      expect(details.text()).toContain("Hearings in the Senior Courts Costs Office");
      expect(details.text()).toContain("Open justice is a fundamental principle");
      expect(details.text()).toContain("scco@justice.gov.uk");
    });

    it("should split the important-info text into one paragraph per double newline", () => {
      const { $ } = renderList();

      const expectedParagraphs = listContent.importantInfoText.split("\n\n").length;
      const paragraphs = $("details.govuk-details .govuk-body");
      // The template appends one extra paragraph for the more-info link.
      expect(paragraphs.length).toBe(expectedParagraphs + 1);
    });

    it("should render the more-info link with text and URL at the end of the details", () => {
      const { $ } = renderList();

      const details = $("details.govuk-details");
      expect(details.text()).toContain(listContent.moreInfoLinkText);
      const moreInfoLink = details.find(`a[href="${listContent.moreInfoLinkUrl}"]`);
      expect(moreInfoLink).toHaveLength(1);
      expect(moreInfoLink.text()).toContain(listContent.moreInfoLinkUrl);
    });
  });

  describe("Search section", () => {
    it("should render the search heading, input and visually hidden label", () => {
      const { $ } = renderList();

      const heading = $(".search-container h2.govuk-heading-s");
      expect(heading.text()).toContain(common.searchCasesTitle);
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
          venue: "Court Room 1",
          judge: "Master Smith",
          time: "10:00",
          caseNumber: "CA-2026-000001",
          caseDetails: "Smith v Jones",
          hearingType: "Detailed Assessment",
          additionalInformation: "Remote hearing"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.venue]).toBe("Court Room 1");
      expect(cells[COLUMN.judge]).toBe("Master Smith");
      expect(cells[COLUMN.time]).toBe("10:00");
      expect(cells[COLUMN.caseNumber]).toBe("CA-2026-000001");
      expect(cells[COLUMN.caseDetails]).toBe("Smith v Jones");
      expect(cells[COLUMN.hearingType]).toBe("Detailed Assessment");
      expect(cells[COLUMN.additionalInformation]).toBe("Remote hearing");
    });

    it("should render a single hearing as one row", () => {
      const { $ } = renderList([
        buildHearing({
          venue: "Court Room 3",
          judge: "Master Williams",
          caseNumber: "CA-2026-000003",
          caseDetails: "White v Black",
          hearingType: "Provisional Assessment"
        })
      ]);

      const rows = $("tbody.govuk-table__body tr");
      expect(rows).toHaveLength(1);
      const cells = firstDataRowCells($);
      expect(cells[COLUMN.venue]).toBe("Court Room 3");
      expect(cells[COLUMN.judge]).toBe("Master Williams");
      expect(cells[COLUMN.caseNumber]).toBe("CA-2026-000003");
    });

    it("should render one row per hearing", () => {
      const { $ } = renderList([
        buildHearing({ venue: "Court Room 1", caseNumber: "CA-2026-000001", caseDetails: "Smith v Jones", hearingType: "Detailed Assessment" }),
        buildHearing({
          venue: "Court Room 2",
          judge: "Master Johnson",
          time: "14:00",
          caseNumber: "CA-2026-000002",
          caseDetails: "Brown v Green",
          hearingType: "Assessment Hearing",
          additionalInformation: ""
        })
      ]);

      const rows = $("tbody.govuk-table__body tr");
      expect(rows).toHaveLength(2);
      const caseNumbers = rows.map((_, row) => $(row).find("td").eq(COLUMN.caseNumber).text().trim()).get();
      expect(caseNumbers).toEqual(["CA-2026-000001", "CA-2026-000002"]);
      const hearingTypes = rows.map((_, row) => $(row).find("td").eq(COLUMN.hearingType).text().trim()).get();
      expect(hearingTypes).toEqual(["Detailed Assessment", "Assessment Hearing"]);
    });

    it("should render an empty cell for an empty additionalInformation field", () => {
      const { $ } = renderList([buildHearing({ caseDetails: "Test Case", hearingType: "Assessment", additionalInformation: "" })]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.caseDetails]).toBe("Test Case");
      expect(cells[COLUMN.hearingType]).toBe("Assessment");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });

    it("should render empty cells for every empty hearing field", () => {
      const { $ } = renderList([
        buildHearing({ venue: "", judge: "", time: "", caseNumber: "CA-2026-000001", caseDetails: "", hearingType: "", additionalInformation: "" })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.venue]).toBe("");
      expect(cells[COLUMN.judge]).toBe("");
      expect(cells[COLUMN.time]).toBe("");
      expect(cells[COLUMN.caseNumber]).toBe("CA-2026-000001");
      expect(cells[COLUMN.caseDetails]).toBe("");
      expect(cells[COLUMN.hearingType]).toBe("");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });

    it("should render very long case details text in full", () => {
      const longText = "A".repeat(500);
      const { $ } = renderList([buildHearing({ caseDetails: longText, hearingType: "Assessment", additionalInformation: "Note" })]);

      expect(firstDataRowCells($)[COLUMN.caseDetails]).toBe(longText);
    });

    it("should escape special characters in hearing data", () => {
      const { $ } = renderList([
        buildHearing({ venue: "Court Room 1 & 2", judge: "Master O'Brien", caseDetails: "Smith v Jones & Co <Ltd>", hearingType: 'Assessment "Final"' })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.venue]).toBe("Court Room 1 & 2");
      expect(cells[COLUMN.judge]).toBe("Master O'Brien");
      expect(cells[COLUMN.caseDetails]).toBe("Smith v Jones & Co <Ltd>");
      expect(cells[COLUMN.hearingType]).toBe('Assessment "Final"');
    });
  });

  describe("Footer", () => {
    it("should render the data source label and value", () => {
      const { $ } = renderList([], { dataSource: "CPP" });

      expect($("p.govuk-body-s").text()).toContain(`${common.dataSource}: CPP`);
    });

    it("should render a different data source value", () => {
      const { $ } = renderList([], { dataSource: "Manual Upload" });

      expect($("p.govuk-body-s").text()).toContain(`${common.dataSource}: Manual Upload`);
    });

    it("should escape special characters in the data source value", () => {
      const { $ } = renderList([], { dataSource: "P&I" });

      expect($("p.govuk-body-s").text()).toContain(`${common.dataSource}: P&I`);
    });

    it("should render a back-to-top link targeting the top anchor", () => {
      const { $ } = renderList();

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(common.backToTop);
    });
  });

  describe("Accessibility attributes", () => {
    it("should render the table with role table and the list title as its aria-label", () => {
      const { $ } = renderList([], { header: { listTitle: "Test List Title" } });

      const table = $("table#hearings-table");
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe("Test List Title");
    });

    it("should anchor the heading with id top for the back-to-top link", () => {
      const { $ } = renderList();

      expect($("h1#top")).toHaveLength(1);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh title, location, sections and search", () => {
      const { $ } = renderList([], { header: { listTitle: listContentCy.pageTitle } }, "cy");

      expect($("h1#top").text()).toContain(listContentCy.pageTitle);
      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(listContentCy.locationLine1);
      expect($("details.govuk-details .govuk-details__summary-text").text()).toContain(commonCy.importantInfoTitle);
      expect($("details.govuk-details").text()).toContain("Swyddfa Costau");
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

    it("should render Welsh footer and list date metadata", () => {
      const { $ } = renderList([], { dataSource: "Ffynhonnell Prawf" }, "cy");

      expect($("p.govuk-body-s").text()).toContain(`${commonCy.dataSource}: Ffynhonnell Prawf`);
      expect($(".back-to-top a").text()).toContain(commonCy.backToTop);
      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(`${commonCy.listFor} 10 July 2026`);
      expect(bodyText).toContain(`${commonCy.lastUpdated} 9 July 2026 ${commonCy.at} 4:30pm`);
    });
  });
});
