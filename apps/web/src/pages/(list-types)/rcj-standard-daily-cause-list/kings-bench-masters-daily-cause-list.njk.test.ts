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

const TEMPLATE = "kings-bench-masters-daily-cause-list.njk";

const kbEn = en.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST;
const kbCy = cy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST;

interface HearingOverrides {
  venue?: string;
  judge?: string;
  time?: string;
  caseNumber?: string;
  caseDetails?: string;
  hearingType?: string;
  additionalInformation?: string;
}

// Fixture builders — the template consumes a flat view model
// (header / listContent / common / hearings / dataSource); each test overrides
// only the varied leaf fields rather than re-declaring the whole tree.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    venue: "Court Room 1",
    judge: "Master Smith",
    time: "10:00am",
    caseNumber: "KB-2026-001",
    caseDetails: "Test v Example",
    hearingType: "Case Management",
    additionalInformation: "Remote hearing",
    ...overrides
  };
}

function baseData(locale: "en" | "cy" = "en") {
  const listContent = locale === "cy" ? kbCy : kbEn;
  const common = locale === "cy" ? cy.common : en.common;
  return {
    header: {
      listTitle: listContent.pageTitle,
      listDate: locale === "cy" ? "10 Gorffennaf 2026" : "10 July 2026",
      lastUpdatedDate: locale === "cy" ? "10 Gorffennaf 2026" : "10 July 2026",
      lastUpdatedTime: locale === "cy" ? "2:30yp" : "2:30pm"
    },
    listContent,
    common,
    hearings: [] as HearingOverrides[],
    dataSource: "XHIBIT"
  };
}

function renderList(overrides: Record<string, unknown> = {}, locale: "en" | "cy" = "en") {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides });
}

// The rendered hearings table columns, in order.
const COLUMN = { venue: 0, judge: 1, time: 2, caseNumber: 3, caseDetails: 4, hearingType: 5, additionalInformation: 6 } as const;

function firstRowCells($: CheerioAPI) {
  return $("tbody.govuk-table__body tr")
    .first()
    .find("td")
    .map((_, el) => $(el).text().trim())
    .get();
}

function tableHeaderTexts($: CheerioAPI) {
  return $("#hearings-table thead th")
    .map((_, el) => $(el).text().trim())
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("kings-bench-masters-daily-cause-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh for KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST", () => {
      expect(Object.keys(kbEn).sort()).toEqual(Object.keys(kbCy).sort());
    });

    it("should have the same keys in English and Welsh for common", () => {
      expect(Object.keys(en.common).sort()).toEqual(Object.keys(cy.common).sort());
    });

    it("should have the same table header keys in English and Welsh", () => {
      expect(Object.keys(en.common.tableHeaders).sort()).toEqual(Object.keys(cy.common.tableHeaders).sort());
    });

    it("should use https link URLs", () => {
      expect(en.common.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.common.factLinkUrl).toMatch(/^https:\/\//);
      expect(kbEn.kbGuideLinkUrl).toMatch(/^https:\/\//);
      expect(kbEn.trialWindowsLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the page title in the top heading", () => {
      const { $ } = renderList();

      const heading = $("h1#top");
      expect(heading).toHaveLength(1);
      expect(heading.text()).toContain(kbEn.pageTitle);
    });

    it("should render the FACT link with its text, URL and additional text", () => {
      const { $ } = renderList();

      const factLink = $(`a[href="${en.common.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.common.factLinkText);
      expect(factLink.parent().text()).toContain(en.common.factAdditionalText);
    });

    it("should render each location line", () => {
      const { $ } = renderList();

      const bodyText = $(".govuk-grid-column-full").text();
      expect(bodyText).toContain(kbEn.locationLine1);
      expect(bodyText).toContain(kbEn.locationLine2);
      expect(bodyText).toContain(kbEn.locationLine3);
    });

    it("should render the list date and last-updated metadata", () => {
      const { $ } = renderList();

      const bodyText = $(".govuk-grid-column-full").text();
      expect(bodyText).toContain(`${en.common.listFor} 10 July 2026`);
      expect(bodyText).toContain(`${en.common.lastUpdated} 10 July 2026 ${en.common.at} 2:30pm`);
    });
  });

  describe("Important information details", () => {
    it("should render the details component open by default with the important-information summary", () => {
      const { $ } = renderList();

      const details = $("details.govuk-details");
      expect(details).toHaveLength(1);
      expect($("details.govuk-details[open]")).toHaveLength(1);
      expect($(".govuk-details__summary-text").text()).toContain(en.common.importantInfoTitle);
    });

    it("should render each guidance section heading", () => {
      const { $ } = renderList();

      const headings = $(".govuk-details__text h3")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headings).toContain(kbEn.pressAndPublicTitle);
      expect(headings).toContain(kbEn.judgmentsTitle);
      expect(headings).toContain(kbEn.bundlesTitle);
      expect(headings).toContain(kbEn.inPersonHearingsTitle);
    });

    it("should render each guidance section body text", () => {
      const { $ } = renderList();

      const detailsText = $(".govuk-details__text").text();
      expect(detailsText).toContain(kbEn.pressAndPublicText.split("\n\n")[0]);
      expect(detailsText).toContain(kbEn.judgmentsText);
      expect(detailsText).toContain(kbEn.bundlesText.split("\n\n")[0]);
      expect(detailsText).toContain(kbEn.inPersonHearingsText);
    });

    it("should split multi-paragraph guidance text into separate paragraphs", () => {
      const { $ } = renderList();

      expect($(".govuk-details__text p.govuk-body").length).toBeGreaterThan(1);
    });

    it("should render the King's Bench Guide and trial windows links", () => {
      const { $ } = renderList();

      const guideLink = $(`.govuk-details__text a[href="${kbEn.kbGuideLinkUrl}"]`);
      expect(guideLink.text()).toContain(kbEn.kbGuideLinkText);

      const trialLink = $(`.govuk-details__text a[href="${kbEn.trialWindowsLinkUrl}"]`);
      expect(trialLink.text()).toContain(kbEn.trialWindowsLinkText);
    });
  });

  describe("Search functionality", () => {
    it("should render the search container with title and accessible input", () => {
      const { $ } = renderList();

      expect($(".search-container")).toHaveLength(1);
      expect($(".search-container h2").text()).toContain(en.common.searchCasesTitle);

      const input = $("#case-search-input");
      expect(input.attr("name")).toBe("search");
      expect(input.attr("type")).toBe("text");
      expect(input.attr("aria-label")).toBe(en.common.searchCasesLabel);

      const label = $("label.govuk-visually-hidden[for='case-search-input']");
      expect(label.text()).toContain(en.common.searchCasesLabel);
    });
  });

  describe("Hearings table", () => {
    it("should render all table headers in order", () => {
      const { $ } = renderList();

      const headers = en.common.tableHeaders;
      expect(tableHeaderTexts($)).toEqual([
        headers.venue,
        headers.judge,
        headers.time,
        headers.caseNumber,
        headers.caseDetails,
        headers.hearingType,
        headers.additionalInformation
      ]);
    });

    it("should set the table accessibility attributes", () => {
      const { $ } = renderList();

      const table = $("#hearings-table");
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe(kbEn.pageTitle);
    });

    it("should render an empty table body when there are no hearings", () => {
      const { $ } = renderList();

      expect($("tbody.govuk-table__body")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList({
        hearings: [
          buildHearing({
            venue: "Court Room 1",
            judge: "Master Smith",
            time: "10:00am",
            caseNumber: "KB-2026-001",
            caseDetails: "Test v Example",
            hearingType: "Case Management",
            additionalInformation: "Remote hearing"
          })
        ]
      });

      const cells = firstRowCells($);
      expect(cells[COLUMN.venue]).toBe("Court Room 1");
      expect(cells[COLUMN.judge]).toBe("Master Smith");
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.caseNumber]).toBe("KB-2026-001");
      expect(cells[COLUMN.caseDetails]).toBe("Test v Example");
      expect(cells[COLUMN.hearingType]).toBe("Case Management");
      expect(cells[COLUMN.additionalInformation]).toBe("Remote hearing");
    });

    it("should render one row per hearing", () => {
      const { $ } = renderList({
        hearings: [
          buildHearing({ venue: "Court Room 1", judge: "Master Smith", caseNumber: "KB-2026-001" }),
          buildHearing({ venue: "Court Room 2", judge: "Master Jones", caseNumber: "KB-2026-002" })
        ]
      });

      expect($("tbody.govuk-table__body tr")).toHaveLength(2);
      const venues = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.venue).text().trim())
        .get();
      expect(venues).toEqual(["Court Room 1", "Court Room 2"]);
      const caseNumbers = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseNumber).text().trim())
        .get();
      expect(caseNumbers).toEqual(["KB-2026-001", "KB-2026-002"]);
    });

    it("should render empty leaf fields as empty cells while keeping populated ones", () => {
      const { $ } = renderList({
        hearings: [buildHearing({ venue: "", judge: "", additionalInformation: "" })]
      });

      const cells = firstRowCells($);
      expect(cells[COLUMN.venue]).toBe("");
      expect(cells[COLUMN.judge]).toBe("");
      expect(cells[COLUMN.additionalInformation]).toBe("");
      expect(cells[COLUMN.caseNumber]).toBe("KB-2026-001");
      expect(cells[COLUMN.hearingType]).toBe("Case Management");
    });

    it("should render a row for every hearing when there are many", () => {
      const hearings = Array.from({ length: 50 }, (_, i) =>
        buildHearing({ venue: `Court Room ${i + 1}`, caseNumber: `KB-2026-${String(i + 1).padStart(3, "0")}` })
      );
      const { $ } = renderList({ hearings });

      const rows = $("tbody.govuk-table__body tr");
      expect(rows).toHaveLength(50);
      expect(rows.first().find("td").eq(COLUMN.venue).text().trim()).toBe("Court Room 1");
      expect(rows.last().find("td").eq(COLUMN.venue).text().trim()).toBe("Court Room 50");
    });

    it("should escape special characters within cells", () => {
      const { $ } = renderList({
        hearings: [
          buildHearing({
            judge: "Master O'Brien",
            caseDetails: "Test & Example <Company> Ltd",
            additionalInformation: "Note: Special chars & symbols"
          })
        ]
      });

      const cells = firstRowCells($);
      expect(cells[COLUMN.judge]).toBe("Master O'Brien");
      expect(cells[COLUMN.caseDetails]).toBe("Test & Example <Company> Ltd");
      expect(cells[COLUMN.additionalInformation]).toBe("Note: Special chars & symbols");
    });

    it("should render long case details in the case details column", () => {
      const longDetails =
        "This is a very long case detail that might wrap across multiple lines and needs to be handled properly by the template rendering system without breaking the layout or causing display issues";
      const { $ } = renderList({ hearings: [buildHearing({ caseDetails: longDetails })] });

      expect(firstRowCells($)[COLUMN.caseDetails]).toBe(longDetails);
    });
  });

  describe("Footer", () => {
    it("should render the data source label and value", () => {
      const { $ } = renderList();

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.common.dataSource);
      expect(footer.text()).toContain("XHIBIT");
    });

    it("should render a different data source value", () => {
      const { $ } = renderList({ dataSource: "SNL" });

      expect($("p.govuk-body-s").text()).toContain("SNL");
    });

    it("should still render the data source label when the value is empty", () => {
      const { $ } = renderList({ dataSource: "" });

      expect($("p.govuk-body-s").text()).toContain(en.common.dataSource);
    });

    it("should render a back-to-top link", () => {
      const { $ } = renderList();

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(en.common.backToTop);
    });
  });

  describe("Edge cases", () => {
    it("should still render the last-updated label when date components are missing", () => {
      const { $ } = renderList({ header: { ...baseData().header, lastUpdatedDate: "", lastUpdatedTime: "" } });

      expect($(".govuk-grid-column-full").text()).toContain(en.common.lastUpdated);
    });

    it("should render the first location line when later lines are empty", () => {
      const { $ } = renderList({ listContent: { ...kbEn, locationLine2: "", locationLine3: "" } });

      expect($(".govuk-grid-column-full").text()).toContain(kbEn.locationLine1);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh chrome, guidance and metadata", () => {
      const { $ } = renderList({}, "cy");

      expect($("h1#top").text()).toContain(kbCy.pageTitle);
      expect($(".govuk-grid-column-full").text()).toContain(kbCy.locationLine1);
      expect($(`a[href="${cy.common.factLinkUrl}"]`).text()).toContain(cy.common.factLinkText);

      const bodyText = $(".govuk-grid-column-full").text();
      expect(bodyText).toContain(cy.common.listFor);
      expect(bodyText).toContain(cy.common.lastUpdated);

      expect($(".govuk-details__summary-text").text()).toContain(cy.common.importantInfoTitle);
      const headings = $(".govuk-details__text h3")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headings).toContain(kbCy.pressAndPublicTitle);
      expect(headings).toContain(kbCy.judgmentsTitle);
      expect(headings).toContain(kbCy.bundlesTitle);
      expect(headings).toContain(kbCy.inPersonHearingsTitle);
      expect($(`.govuk-details__text a[href="${kbCy.kbGuideLinkUrl}"]`).text()).toContain(kbCy.kbGuideLinkText);
      expect($(`.govuk-details__text a[href="${kbCy.trialWindowsLinkUrl}"]`).text()).toContain(kbCy.trialWindowsLinkText);

      expect($(".search-container h2").text()).toContain(cy.common.searchCasesTitle);

      const headers = cy.common.tableHeaders;
      expect(tableHeaderTexts($)).toEqual([
        headers.venue,
        headers.judge,
        headers.time,
        headers.caseNumber,
        headers.caseDetails,
        headers.hearingType,
        headers.additionalInformation
      ]);

      expect($("p.govuk-body-s").text()).toContain(cy.common.dataSource);
      expect($(".back-to-top a[href='#top']").text()).toContain(cy.common.backToTop);
    });

    it("should render Welsh hearing data in the correct columns", () => {
      const { $ } = renderList(
        {
          hearings: [
            buildHearing({
              venue: "Ystafell Llys 1",
              judge: "Meistr Smith",
              caseDetails: "Prawf v Enghraifft",
              hearingType: "Rheoli Achos",
              additionalInformation: "Gwrandawiad o bell"
            })
          ]
        },
        "cy"
      );

      const cells = firstRowCells($);
      expect(cells[COLUMN.venue]).toBe("Ystafell Llys 1");
      expect(cells[COLUMN.judge]).toBe("Meistr Smith");
      expect(cells[COLUMN.caseDetails]).toBe("Prawf v Enghraifft");
      expect(cells[COLUMN.hearingType]).toBe("Rheoli Achos");
      expect(cells[COLUMN.additionalInformation]).toBe("Gwrandawiad o bell");
    });
  });
});
