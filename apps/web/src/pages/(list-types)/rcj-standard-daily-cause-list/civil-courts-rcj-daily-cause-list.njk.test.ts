import path from "node:path";
import { fileURLToPath } from "node:url";
import { rcjStandardDailyCauseListCy, rcjStandardDailyCauseListEn } from "@hmcts/rcj-standard-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "civil-courts-rcj-daily-cause-list.njk";

const civilEn = rcjStandardDailyCauseListEn.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST;
const civilCy = rcjStandardDailyCauseListCy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST;
const commonEn = rcjStandardDailyCauseListEn.common;
const commonCy = rcjStandardDailyCauseListCy.common;

interface HearingOverrides {
  venue?: string;
  judge?: string;
  time?: string;
  caseNumber?: string;
  caseDetails?: string;
  hearingType?: string;
  additionalInformation?: string;
}

// Fixture builders — the template consumes a flat view model (header,
// listContent, common, hearings, dataSource). Each test passes only the leaf
// fields it varies instead of re-declaring the whole tree.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    venue: "Court Room 1",
    judge: "Judge Smith",
    time: "10:00am",
    caseNumber: "AB-2026-001",
    caseDetails: "Test v Example",
    hearingType: "Hearing",
    additionalInformation: "Remote hearing",
    ...overrides
  };
}

function baseData(locale: "en" | "cy" = "en") {
  const content = locale === "cy" ? civilCy : civilEn;
  const common = locale === "cy" ? commonCy : commonEn;
  return {
    header: {
      listTitle: content.pageTitle,
      listDate: locale === "cy" ? "10 Gorffennaf 2026" : "10 July 2026",
      lastUpdatedDate: locale === "cy" ? "10 Gorffennaf 2026" : "10 July 2026",
      lastUpdatedTime: locale === "cy" ? "2:30yp" : "2:30pm"
    },
    listContent: {
      locationLine1: content.locationLine1,
      locationLine2: content.locationLine2,
      locationLine3: content.locationLine3,
      mediaInquiriesText: content.mediaInquiriesText,
      openJusticeText: content.openJusticeText,
      courtExclusionText: content.courtExclusionText
    },
    common,
    hearings: [] as unknown[],
    dataSource: "XHIBIT"
  };
}

function renderList(hearings: unknown[] = [], overrides: Record<string, unknown> = {}, locale: "en" | "cy" = "en") {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, hearings });
}

// Rendered hearings table columns, in order.
const COLUMN = { venue: 0, judge: 1, time: 2, caseNumber: 3, caseDetails: 4, hearingType: 5, additionalInformation: 6 } as const;

function firstDataRowCells($: CheerioAPI) {
  return $("tbody.govuk-table__body tr")
    .first()
    .find("td")
    .map((_, el) => $(el).text().trim())
    .get();
}

function columnValues($: CheerioAPI, column: number) {
  return $("tbody.govuk-table__body tr")
    .map((_, row) => $(row).find("td").eq(column).text().trim())
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("civil-courts-rcj-daily-cause-list template", () => {
  describe("Locale consistency", () => {
    it("should have the same CIVIL_COURTS keys in English and Welsh", () => {
      expect(Object.keys(civilEn).sort()).toEqual(Object.keys(civilCy).sort());
    });

    it("should have the same common keys in English and Welsh", () => {
      expect(Object.keys(commonEn).sort()).toEqual(Object.keys(commonCy).sort());
    });

    it("should use an https FACT link URL", () => {
      expect(commonEn.factLinkUrl).toMatch(/^https:\/\//);
      expect(commonCy.factLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the page title in the top heading", () => {
      const { $ } = renderList();

      expect($("h1#top").text()).toContain(civilEn.pageTitle);
    });

    it("should render the FACT link with the configured text, URL and additional text", () => {
      const { $ } = renderList();

      const factLink = $(`a[href="${commonEn.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(commonEn.factLinkText);
      const paragraph = factLink.closest("p");
      expect(paragraph.text()).toContain(commonEn.factAdditionalText);
    });

    it("should render each location line", () => {
      const { $ } = renderList();

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(civilEn.locationLine1);
      expect(bodyText).toContain(civilEn.locationLine2);
      expect(bodyText).toContain(civilEn.locationLine3);
    });

    it("should render the list date and last updated metadata", () => {
      const { $ } = renderList();

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(`${commonEn.listFor} 10 July 2026`);
      expect(bodyText).toContain(`${commonEn.lastUpdated} 10 July 2026 ${commonEn.at} 2:30pm`);
    });
  });

  describe("Important information details", () => {
    it("should render the details component open by default with the important information title", () => {
      const { $ } = renderList();

      const details = $("details.govuk-details[open]");
      expect(details).toHaveLength(1);
      expect(details.find(".govuk-details__summary-text").text()).toContain(commonEn.importantInfoTitle);
    });

    it("should render the media inquiries, open justice and court exclusion text", () => {
      const { $ } = renderList();

      const detailsText = $("details.govuk-details").text();
      expect(detailsText).toContain(civilEn.mediaInquiriesText);
      expect(detailsText).toContain(civilEn.openJusticeText);
      expect(detailsText).toContain(civilEn.courtExclusionText);
    });
  });

  describe("Search functionality", () => {
    it("should render the search container with title and accessible input", () => {
      const { $ } = renderList();

      const container = $(".search-container");
      expect(container).toHaveLength(1);
      expect(container.find("h2").text()).toContain(commonEn.searchCasesTitle);

      const input = $("#case-search-input");
      expect(input.attr("name")).toBe("search");
      expect(input.attr("type")).toBe("text");
      expect(input.attr("aria-label")).toBe(commonEn.searchCasesLabel);

      const label = $("label.govuk-visually-hidden[for='case-search-input']");
      expect(label).toHaveLength(1);
      expect(label.text()).toContain(commonEn.searchCasesLabel);
    });
  });

  describe("Hearings table", () => {
    it("should render all table headers", () => {
      const { $ } = renderList();

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        commonEn.tableHeaders.venue,
        commonEn.tableHeaders.judge,
        commonEn.tableHeaders.time,
        commonEn.tableHeaders.caseNumber,
        commonEn.tableHeaders.caseDetails,
        commonEn.tableHeaders.hearingType,
        commonEn.tableHeaders.additionalInformation
      ]);
    });

    it("should set the table accessibility attributes", () => {
      const { $ } = renderList();

      const table = $("#hearings-table");
      expect(table).toHaveLength(1);
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe(civilEn.pageTitle);
    });

    it("should render no data rows when there are no hearings", () => {
      const { $ } = renderList([]);

      expect($("table.govuk-table")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          venue: "Court Room 1",
          judge: "Judge Smith",
          time: "10:00am",
          caseNumber: "AB-2026-001",
          caseDetails: "Test v Example",
          hearingType: "Hearing",
          additionalInformation: "Remote hearing"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.venue]).toBe("Court Room 1");
      expect(cells[COLUMN.judge]).toBe("Judge Smith");
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.caseNumber]).toBe("AB-2026-001");
      expect(cells[COLUMN.caseDetails]).toBe("Test v Example");
      expect(cells[COLUMN.hearingType]).toBe("Hearing");
      expect(cells[COLUMN.additionalInformation]).toBe("Remote hearing");
    });

    it("should render a row per hearing", () => {
      const { $ } = renderList([
        buildHearing({ venue: "Court Room 1", caseNumber: "AB-2026-001" }),
        buildHearing({ venue: "Court Room 2", caseNumber: "CD-2026-002", judge: "Judge Jones", hearingType: "Trial" })
      ]);

      expect(columnValues($, COLUMN.venue)).toEqual(["Court Room 1", "Court Room 2"]);
      expect(columnValues($, COLUMN.caseNumber)).toEqual(["AB-2026-001", "CD-2026-002"]);
    });

    it("should render an empty venue cell while keeping other columns", () => {
      const { $ } = renderList([buildHearing({ venue: "", additionalInformation: "" })]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.venue]).toBe("");
      expect(cells[COLUMN.judge]).toBe("Judge Smith");
      expect(cells[COLUMN.caseNumber]).toBe("AB-2026-001");
    });

    it("should render an empty judge cell while keeping other columns", () => {
      const { $ } = renderList([buildHearing({ judge: "", additionalInformation: "" })]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.judge]).toBe("");
      expect(cells[COLUMN.venue]).toBe("Court Room 1");
      expect(cells[COLUMN.caseNumber]).toBe("AB-2026-001");
    });

    it("should render an empty additional information cell while keeping other columns", () => {
      const { $ } = renderList([buildHearing({ additionalInformation: "" })]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.additionalInformation]).toBe("");
      expect(cells[COLUMN.venue]).toBe("Court Room 1");
      expect(cells[COLUMN.hearingType]).toBe("Hearing");
    });
  });

  describe("Data source footer", () => {
    it("should render the data source label and value", () => {
      const { $ } = renderList([], { dataSource: "XHIBIT" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(`${commonEn.dataSource}: XHIBIT`);
    });

    it("should render a different data source value", () => {
      const { $ } = renderList([], { dataSource: "SNL" });

      expect($("p.govuk-body-s").text()).toContain(`${commonEn.dataSource}: SNL`);
    });

    it("should render the label with no value when the data source is empty", () => {
      const { $ } = renderList([], { dataSource: "" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(commonEn.dataSource);
      expect(footer.text()).not.toContain("XHIBIT");
    });
  });

  describe("Back to top link", () => {
    it("should render a back-to-top link pointing at the top anchor", () => {
      const { $ } = renderList();

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(commonEn.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, labels and metadata", () => {
      const { $ } = renderList([], {}, "cy");

      expect($("h1#top").text()).toContain(civilCy.pageTitle);
      expect($(".govuk-body").text()).toContain(civilCy.locationLine1);
      expect($(`a[href="${commonCy.factLinkUrl}"]`).text()).toContain(commonCy.factLinkText);
      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(commonCy.listFor);
      expect(bodyText).toContain(commonCy.lastUpdated);
      expect($("details.govuk-details .govuk-details__summary-text").text()).toContain(commonCy.importantInfoTitle);
      expect($(".search-container h2").text()).toContain(commonCy.searchCasesTitle);
      expect($("p.govuk-body-s").text()).toContain(commonCy.dataSource);
      expect($(".back-to-top a").text()).toContain(commonCy.backToTop);
    });

    it("should render the Welsh important information text", () => {
      const { $ } = renderList([], {}, "cy");

      const detailsText = $("details.govuk-details").text();
      expect(detailsText).toContain(civilCy.mediaInquiriesText);
      expect(detailsText).toContain(civilCy.openJusticeText);
      expect(detailsText).toContain(civilCy.courtExclusionText);
    });

    it("should render Welsh table headers", () => {
      const { $ } = renderList([], {}, "cy");

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        commonCy.tableHeaders.venue,
        commonCy.tableHeaders.judge,
        commonCy.tableHeaders.time,
        commonCy.tableHeaders.caseNumber,
        commonCy.tableHeaders.caseDetails,
        commonCy.tableHeaders.hearingType,
        commonCy.tableHeaders.additionalInformation
      ]);
    });

    it("should render Welsh hearing data in the correct columns", () => {
      const { $ } = renderList(
        [
          buildHearing({
            venue: "Ystafell Llys 1",
            judge: "Barnwr Smith",
            caseDetails: "Prawf v Enghraifft",
            hearingType: "Gwrandawiad",
            additionalInformation: "Gwrandawiad o bell"
          })
        ],
        {},
        "cy"
      );

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.venue]).toBe("Ystafell Llys 1");
      expect(cells[COLUMN.judge]).toBe("Barnwr Smith");
      expect(cells[COLUMN.caseDetails]).toBe("Prawf v Enghraifft");
      expect(cells[COLUMN.hearingType]).toBe("Gwrandawiad");
      expect(cells[COLUMN.additionalInformation]).toBe("Gwrandawiad o bell");
    });
  });

  describe("Edge cases", () => {
    it("should render very long case details in full", () => {
      const longDetails =
        "This is a very long case detail that might wrap across multiple lines and needs to be handled properly by the template rendering system without breaking the layout or causing display issues";
      const { $ } = renderList([buildHearing({ caseDetails: longDetails, additionalInformation: "" })]);

      expect(firstDataRowCells($)[COLUMN.caseDetails]).toBe(longDetails);
    });

    it("should render special characters as their decoded text", () => {
      const { $ } = renderList([
        buildHearing({
          judge: "Judge O'Brien",
          caseDetails: "Test & Example <Company> Ltd",
          additionalInformation: "Note: Special chars & symbols"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.judge]).toBe("Judge O'Brien");
      expect(cells[COLUMN.caseDetails]).toBe("Test & Example <Company> Ltd");
    });

    it("should render a row for every hearing when there are many", () => {
      const hearings = Array.from({ length: 50 }, (_, i) =>
        buildHearing({ venue: `Court Room ${i + 1}`, caseNumber: `AB-2026-${String(i + 1).padStart(3, "0")}` })
      );
      const { $ } = renderList(hearings);

      const venues = columnValues($, COLUMN.venue);
      expect(venues).toHaveLength(50);
      expect(venues[0]).toBe("Court Room 1");
      expect(venues[49]).toBe("Court Room 50");
    });

    it("should still render the last updated label when date components are missing", () => {
      const { $ } = renderList([], { header: { ...baseData().header, lastUpdatedDate: "", lastUpdatedTime: "" } });

      expect($(".govuk-body").text()).toContain(commonEn.lastUpdated);
    });

    it("should render the first location line when later lines are empty", () => {
      const { $ } = renderList([], { listContent: { ...baseData().listContent, locationLine2: "", locationLine3: "" } });

      expect($(".govuk-body").text()).toContain(civilEn.locationLine1);
    });
  });
});
