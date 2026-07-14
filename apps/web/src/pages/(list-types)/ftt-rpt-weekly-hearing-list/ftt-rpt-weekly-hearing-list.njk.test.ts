import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fttRptWeeklyHearingListCy as cy, fttRptWeeklyHearingListEn as en } from "@hmcts/ftt-rpt-weekly-hearing-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "ftt-rpt-weekly-hearing-list.njk";

interface HearingOverrides {
  date?: string;
  time?: string;
  venue?: string;
  caseType?: string;
  caseReferenceNumber?: string;
  judges?: string;
  members?: string;
  hearingMethod?: string;
  additionalInformation?: string;
}

// Fixture builders — the view model for this list type is flat (a header object
// plus a hearings array), so each test overrides only the varied leaf fields.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    date: "01/01/2024",
    time: "10:00am",
    venue: "Tribunals Hearing Centre",
    caseType: "Leasehold",
    caseReferenceNumber: "RPT/2024/001",
    judges: "Judge Johnson",
    members: "Member A, Member B",
    hearingMethod: "Video hearing",
    additionalInformation: "Interpreter required",
    ...overrides
  };
}

function buildHeader(overrides: Record<string, unknown> = {}) {
  return {
    listTitle: en.rptEasternPageTitle,
    weekCommencingDate: "Monday 1 January 2024",
    lastUpdatedDate: "1 January 2024",
    lastUpdatedTime: "10:30am",
    ...overrides
  };
}

function renderList(hearings: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { t: locale, en, cy, header: buildHeader(), dataSource: "RPT", hearings, ...overrides });
}

// The rendered hearings table columns, in order.
const COLUMN = {
  date: 0,
  time: 1,
  venue: 2,
  caseType: 3,
  caseReferenceNumber: 4,
  judges: 5,
  members: 6,
  hearingMethod: 7,
  additionalInformation: 8
} as const;

function firstDataRowCells($: CheerioAPI) {
  return $("tbody.govuk-table__body tr")
    .first()
    .find("td")
    .map((_, el) => $(el).text().trim())
    .get();
}

function headerTexts($: CheerioAPI) {
  return $("thead th")
    .map((_, el) => $(el).text().trim())
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews], { trimBlocks: true, lstripBlocks: true });
});

describe("ftt-rpt-weekly-hearing-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have the same table header keys in English and Welsh", () => {
      expect(Object.keys(en.tableHeaders).sort()).toEqual(Object.keys(cy.tableHeaders).sort());
    });

    it("should use https link URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.importantInformationLinkUrl).toMatch(/^https:\/\//);
      expect(cy.importantInformationLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the list title as the top heading", () => {
      const { $ } = renderList([buildHearing()]);

      const heading = $("h1#top.govuk-heading-l");
      expect(heading).toHaveLength(1);
      expect(heading.text()).toContain(en.rptEasternPageTitle);
    });

    it("should render the week commencing and last updated lines", () => {
      const { $ } = renderList([buildHearing()]);

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(`${en.listForWeekCommencing} Monday 1 January 2024`);
      expect(bodyText).toContain(`${en.lastUpdated} 1 January 2024 ${en.at} 10:30am`);
    });

    it("should render the FACT link with the configured text, URL and additional text", () => {
      const { $ } = renderList([buildHearing()]);

      const factLink = $(`a.govuk-link[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
      expect(factLink.parent().text()).toContain(en.factAdditionalText);
    });
  });

  describe("Important information details", () => {
    it("should render an open details component with the important information", () => {
      const { $ } = renderList([buildHearing()]);

      const details = $("details.govuk-details[data-module='govuk-details']");
      expect(details).toHaveLength(1);
      expect(details.attr("open")).toBeDefined();
      expect(details.find(".govuk-details__summary-text").text()).toContain(en.importantInformationTitle);
      expect(details.find(".govuk-details__text").text()).toContain(en.importantInformationText);
    });

    it("should render the important information link with target and rel attributes", () => {
      const { $ } = renderList([buildHearing()]);

      const link = $(`.govuk-details__text a.govuk-link[href="${en.importantInformationLinkUrl}"]`);
      expect(link).toHaveLength(1);
      expect(link.text()).toContain(en.importantInformationLinkText);
      expect(link.attr("target")).toBe("_blank");
      expect(link.attr("rel")).toBe("noopener noreferrer");
    });
  });

  describe("Search input", () => {
    it("should render a text search input with a visually hidden label", () => {
      const { $ } = renderList([buildHearing()]);

      expect($("h2.govuk-heading-s").text()).toContain(en.searchCasesTitle);
      const input = $("input#case-search-input.govuk-input");
      expect(input).toHaveLength(1);
      expect(input.attr("type")).toBe("text");
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);
      const label = $("label.govuk-visually-hidden[for='case-search-input']");
      expect(label).toHaveLength(1);
      expect(label.text()).toContain(en.searchCasesLabel);
    });
  });

  describe("Hearings table", () => {
    it("should render the table with an accessible label and every column header in order", () => {
      const { $ } = renderList([buildHearing()]);

      const table = $("table.govuk-table#hearings-table");
      expect(table).toHaveLength(1);
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe(en.rptEasternPageTitle);
      expect($("thead.govuk-table__head th[scope='col']")).toHaveLength(9);
      expect(headerTexts($)).toEqual([
        en.tableHeaders.date,
        en.tableHeaders.time,
        en.tableHeaders.venue,
        en.tableHeaders.caseType,
        en.tableHeaders.caseReferenceNumber,
        en.tableHeaders.judges,
        en.tableHeaders.members,
        en.tableHeaders.hearingMethod,
        en.tableHeaders.additionalInformation
      ]);
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          date: "15/03/2024",
          time: "2:30pm",
          venue: "Manchester Tribunals Centre",
          caseType: "Service Charge",
          caseReferenceNumber: "RPT/2024/999",
          judges: "Judge Smith, Judge Williams",
          members: "Member X, Member Y, Member Z",
          hearingMethod: "In person",
          additionalInformation: "Special arrangements required"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.date]).toBe("15/03/2024");
      expect(cells[COLUMN.time]).toBe("2:30pm");
      expect(cells[COLUMN.venue]).toBe("Manchester Tribunals Centre");
      expect(cells[COLUMN.caseType]).toBe("Service Charge");
      expect(cells[COLUMN.caseReferenceNumber]).toBe("RPT/2024/999");
      expect(cells[COLUMN.judges]).toBe("Judge Smith, Judge Williams");
      expect(cells[COLUMN.members]).toBe("Member X, Member Y, Member Z");
      expect(cells[COLUMN.hearingMethod]).toBe("In person");
      expect(cells[COLUMN.additionalInformation]).toBe("Special arrangements required");
    });

    it("should render no data rows when there are no hearings", () => {
      const { $ } = renderList([]);

      expect($("tbody.govuk-table__body")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });

    it("should render a single hearing row", () => {
      const { $ } = renderList([buildHearing({ caseReferenceNumber: "RPT/2024/123" })]);

      expect($("tbody.govuk-table__body tr")).toHaveLength(1);
      expect(firstDataRowCells($)[COLUMN.caseReferenceNumber]).toBe("RPT/2024/123");
    });

    it("should render a row per hearing preserving order", () => {
      const { $ } = renderList([
        buildHearing({ caseReferenceNumber: "RPT/2024/001" }),
        buildHearing({ caseReferenceNumber: "RPT/2024/002" }),
        buildHearing({ caseReferenceNumber: "RPT/2024/003" })
      ]);

      const caseRefs = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseReferenceNumber).text().trim())
        .get();
      expect(caseRefs).toEqual(["RPT/2024/001", "RPT/2024/002", "RPT/2024/003"]);
    });

    it("should render empty cells for empty optional fields without collapsing the row", () => {
      const { $ } = renderList([buildHearing({ caseReferenceNumber: "RPT/2024/500", judges: "", members: "", additionalInformation: "" })]);

      const cells = firstDataRowCells($);
      expect(cells).toHaveLength(9);
      expect(cells[COLUMN.judges]).toBe("");
      expect(cells[COLUMN.members]).toBe("");
      expect(cells[COLUMN.additionalInformation]).toBe("");
      expect(cells[COLUMN.caseReferenceNumber]).toBe("RPT/2024/500");
    });

    it("should render distinct hearing method values in the hearing method column", () => {
      const { $ } = renderList([
        buildHearing({ caseReferenceNumber: "RPT/2024/001", hearingMethod: "Video hearing" }),
        buildHearing({ caseReferenceNumber: "RPT/2024/002", hearingMethod: "Telephone hearing" }),
        buildHearing({ caseReferenceNumber: "RPT/2024/003", hearingMethod: "In person" }),
        buildHearing({ caseReferenceNumber: "RPT/2024/004", hearingMethod: "Hybrid" })
      ]);

      const methods = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.hearingMethod).text().trim())
        .get();
      expect(methods).toEqual(["Video hearing", "Telephone hearing", "In person", "Hybrid"]);
    });

    it("should render distinct venue values in the venue column", () => {
      const { $ } = renderList([
        buildHearing({ caseReferenceNumber: "RPT/2024/001", venue: "Birmingham Tribunals Centre" }),
        buildHearing({ caseReferenceNumber: "RPT/2024/002", venue: "Manchester Tribunals Centre" }),
        buildHearing({ caseReferenceNumber: "RPT/2024/003", venue: "London Tribunals Centre" })
      ]);

      const venues = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.venue).text().trim())
        .get();
      expect(venues).toEqual(["Birmingham Tribunals Centre", "Manchester Tribunals Centre", "London Tribunals Centre"]);
    });

    it("should render distinct case type values in the case type column", () => {
      const { $ } = renderList([
        buildHearing({ caseReferenceNumber: "RPT/2024/001", caseType: "Leasehold" }),
        buildHearing({ caseReferenceNumber: "RPT/2024/002", caseType: "Service Charge" }),
        buildHearing({ caseReferenceNumber: "RPT/2024/003", caseType: "Right to Manage" }),
        buildHearing({ caseReferenceNumber: "RPT/2024/004", caseType: "Lease Extension" })
      ]);

      const caseTypes = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseType).text().trim())
        .get();
      expect(caseTypes).toEqual(["Leasehold", "Service Charge", "Right to Manage", "Lease Extension"]);
    });

    it("should render distinct time values in the time column", () => {
      const { $ } = renderList([
        buildHearing({ caseReferenceNumber: "RPT/2024/001", time: "9:00am" }),
        buildHearing({ caseReferenceNumber: "RPT/2024/002", time: "2:30pm" }),
        buildHearing({ caseReferenceNumber: "RPT/2024/003", time: "10:00am" }),
        buildHearing({ caseReferenceNumber: "RPT/2024/004", time: "4:00pm" })
      ]);

      const times = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.time).text().trim())
        .get();
      expect(times).toEqual(["9:00am", "2:30pm", "10:00am", "4:00pm"]);
    });

    it("should render distinct date values in the date column", () => {
      const { $ } = renderList([
        buildHearing({ caseReferenceNumber: "RPT/2024/001", date: "01/01/2024" }),
        buildHearing({ caseReferenceNumber: "RPT/2024/002", date: "15/03/2024" }),
        buildHearing({ caseReferenceNumber: "RPT/2024/003", date: "25/12/2024" })
      ]);

      const dates = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.date).text().trim())
        .get();
      expect(dates).toEqual(["01/01/2024", "15/03/2024", "25/12/2024"]);
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([buildHearing()], { dataSource: "RPT Data Platform" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("RPT Data Platform");
    });

    it("should render a back-to-top link pointing at the top anchor", () => {
      const { $ } = renderList([buildHearing()]);

      const backToTop = $("a.govuk-link[href='#top']");
      expect(backToTop.text()).toContain(en.backToTop);
      expect($("#top")).toHaveLength(1);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh table headers, week commencing line and back-to-top label", () => {
      const { $ } = renderList(
        [buildHearing()],
        { header: buildHeader({ listTitle: cy.rptEasternPageTitle, weekCommencingDate: "Dydd Llun 1 Ionawr 2024" }) },
        cy
      );

      expect($("h1#top").text()).toContain(cy.rptEasternPageTitle);
      expect($(".govuk-body").text()).toContain(`${cy.listForWeekCommencing} Dydd Llun 1 Ionawr 2024`);
      const headers = headerTexts($);
      expect(headers).toContain(cy.tableHeaders.date);
      expect(headers).toContain(cy.tableHeaders.caseReferenceNumber);
      expect($("a.govuk-link[href='#top']").text()).toContain(cy.backToTop);
    });
  });
});
