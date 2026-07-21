import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendDailyHearingListCy as cy, sendDailyHearingListEn as en } from "@hmcts/send-daily-hearing-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "send-daily-hearing-list.njk";

interface HearingOverrides {
  time?: string;
  caseReferenceNumber?: string;
  respondent?: string;
  hearingType?: string;
  venue?: string;
  timeEstimate?: string;
}

// Fixture builders — each hearing defaults to a realistic minimal shape and only
// the varied leaf fields are passed per test, keeping the flat hearing record
// out of individual tests.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    time: "10:00am",
    caseReferenceNumber: "SEND/2026/001",
    respondent: "Sample Local Authority",
    hearingType: "Final Hearing",
    venue: "Video Hearing",
    timeEstimate: "2 hours",
    ...overrides
  };
}

function baseHeader(locale: typeof en | typeof cy = en) {
  return {
    listTitle: locale.pageTitle,
    listForDate: "15 January 2026",
    lastUpdatedDate: "14 January 2026",
    lastUpdatedTime: "12:00pm"
  };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    header: baseHeader(locale),
    hearings: [] as unknown[],
    dataSource: "Manual Upload"
  };
}

function renderPage(hearings: unknown[] = [], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, hearings });
}

// The rendered hearings table columns, in order.
const COLUMN = { time: 0, caseRef: 1, respondent: 2, hearingType: 3, venue: 4, timeEstimate: 5 } as const;

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

describe("send-daily-hearing-list template", () => {
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

    it("should use https FACT link URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the heading with the list title anchored at the top of the page", () => {
      const { $ } = renderPage([], { header: { ...baseHeader(), listTitle: "Custom List Title" } });

      const heading = $("h1#top");
      expect(heading).toHaveLength(1);
      expect(heading.text().trim()).toBe("Custom List Title");
    });

    it("should render the FACT link with the configured text, URL and additional text", () => {
      const { $ } = renderPage();

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
      expect(factLink.parent().text()).toContain(en.factAdditionalText);
    });

    it("should render the list-for date", () => {
      const { $ } = renderPage([], { header: { ...baseHeader(), listForDate: "15 January 2026" } });

      const listForLine = $("p.govuk-body strong").filter((_, el) => $(el).text().includes(en.listForDate));
      expect(listForLine).toHaveLength(1);
      expect(listForLine.text().trim()).toBe(`${en.listForDate} 15 January 2026`);
    });

    it("should render the last updated date and time", () => {
      const { $ } = renderPage([], { header: { ...baseHeader(), lastUpdatedDate: "14 January 2026", lastUpdatedTime: "12:00pm" } });

      const lastUpdatedLine = $("p.govuk-body").filter((_, el) => $(el).text().trim().startsWith(en.lastUpdated));
      expect(lastUpdatedLine).toHaveLength(1);
      expect(lastUpdatedLine.text().replace(/\s+/g, " ").trim()).toBe(`${en.lastUpdated} 14 January 2026 ${en.at} 12:00pm`);
    });
  });

  describe("Important information", () => {
    it("should render an open details element titled with the important information heading", () => {
      const { $ } = renderPage();

      const details = $("details.govuk-details");
      expect(details).toHaveLength(1);
      expect(details.attr("open")).toBeDefined();
      expect(details.find(".govuk-details__summary-text").text()).toContain(en.importantInformationTitle);
    });

    it("should render each important information paragraph", () => {
      const { $ } = renderPage();

      const paragraphs = $("details.govuk-details .govuk-details__text p")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(paragraphs).toEqual(en.importantInformationParagraphs);
      expect(paragraphs.join(" ")).toContain("send@justice.gov.uk");
    });
  });

  describe("Search section", () => {
    it("should render a search input with a visually hidden label and aria-label", () => {
      const { $ } = renderPage();

      expect($("h2.govuk-heading-s").text()).toContain(en.searchCasesTitle);

      const input = $("input#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("type")).toBe("text");
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);

      const label = $("label[for='case-search-input']");
      expect(label.hasClass("govuk-visually-hidden")).toBe(true);
      expect(label.text()).toContain(en.searchCasesLabel);
    });
  });

  describe("Hearings table", () => {
    it("should render the table shell with an accessible role and label", () => {
      const { $ } = renderPage();

      const table = $("table#hearings-table");
      expect(table).toHaveLength(1);
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe(en.pageTitle);
    });

    it("should render the table headers in column order", () => {
      const { $ } = renderPage();

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        en.tableHeaders.time,
        en.tableHeaders.caseReferenceNumber,
        en.tableHeaders.respondent,
        en.tableHeaders.hearingType,
        en.tableHeaders.venue,
        en.tableHeaders.timeEstimate
      ]);
      expect($("thead th[scope='col']")).toHaveLength(6);
    });

    it("should render an empty table body when there are no hearings", () => {
      const { $ } = renderPage([]);

      expect($("tbody.govuk-table__body")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });
  });

  describe("Hearings data", () => {
    it("should place each hearing field in its correct column", () => {
      const { $ } = renderPage([
        buildHearing({
          time: "10:00am",
          caseReferenceNumber: "SEND/2026/001",
          respondent: "Sample Local Authority",
          hearingType: "Final Hearing",
          venue: "Video Hearing",
          timeEstimate: "2 hours"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.caseRef]).toBe("SEND/2026/001");
      expect(cells[COLUMN.respondent]).toBe("Sample Local Authority");
      expect(cells[COLUMN.hearingType]).toBe("Final Hearing");
      expect(cells[COLUMN.venue]).toBe("Video Hearing");
      expect(cells[COLUMN.timeEstimate]).toBe("2 hours");
    });

    it("should render a row per hearing", () => {
      const { $ } = renderPage([
        buildHearing({ caseReferenceNumber: "SEND/2026/001", respondent: "First Authority" }),
        buildHearing({ caseReferenceNumber: "SEND/2026/002", respondent: "Second Authority" })
      ]);

      const caseRefs = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseRef).text().trim())
        .get();
      expect(caseRefs).toEqual(["SEND/2026/001", "SEND/2026/002"]);

      const respondents = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.respondent).text().trim())
        .get();
      expect(respondents).toEqual(["First Authority", "Second Authority"]);
    });

    it("should render an empty time-estimate cell without dropping the other columns", () => {
      const { $ } = renderPage([buildHearing({ caseReferenceNumber: "SEND/2026/001", respondent: "Sample Authority", timeEstimate: "" })]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.caseRef]).toBe("SEND/2026/001");
      expect(cells[COLUMN.respondent]).toBe("Sample Authority");
      expect(cells[COLUMN.timeEstimate]).toBe("");
    });

    it("should render a long respondent name in the respondent column", () => {
      const { $ } = renderPage([buildHearing({ respondent: "Very Long Local Authority Name For Testing Purposes" })]);

      expect(firstDataRowCells($)[COLUMN.respondent]).toBe("Very Long Local Authority Name For Testing Purposes");
    });

    it("should render special characters in case data as text", () => {
      const { $ } = renderPage([buildHearing({ respondent: "Authority & Partner", hearingType: "Pre-hearing Review", venue: "Room 1 - Building A" })]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.respondent]).toBe("Authority & Partner");
      expect(cells[COLUMN.hearingType]).toBe("Pre-hearing Review");
      expect(cells[COLUMN.venue]).toBe("Room 1 - Building A");
    });
  });

  describe("Footer", () => {
    it("should render the data source label and value", () => {
      const { $ } = renderPage([], { dataSource: "Manual Upload" });

      const footer = $("p.govuk-body-s");
      expect(footer).toHaveLength(1);
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("Manual Upload");
    });

    it("should render a back-to-top link pointing at the top anchor", () => {
      const { $ } = renderPage();

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(en.backToTop);
    });
  });

  describe("Data source variations", () => {
    it("should render an ampersand-containing data source as text", () => {
      const { $ } = renderPage([], { dataSource: "P&I" });

      expect($("p.govuk-body-s").text()).toContain("P&I");
    });

    it("should still render the data source label when the value is empty", () => {
      const { $ } = renderPage([], { dataSource: "" });

      expect($("p.govuk-body-s").text()).toContain(en.dataSource);
    });

    it("should render a long data source name", () => {
      const { $ } = renderPage([], { dataSource: "Publications and Information Directorate" });

      expect($("p.govuk-body-s").text()).toContain("Publications and Information Directorate");
    });
  });

  describe("Accessibility", () => {
    it("should render a logical heading hierarchy", () => {
      const { $ } = renderPage();

      expect($("h1.govuk-heading-l")).toHaveLength(1);
      expect($("h2.govuk-heading-s")).toHaveLength(1);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, labels, table headers and footer", () => {
      const { $ } = renderPage(
        [buildHearing({ respondent: "Awdurdod Lleol Enghreifftiol", hearingType: "Gwrandawiad Terfynol", venue: "Gwrandawiad Fideo" })],
        {},
        cy
      );

      expect($("h1#top").text().trim()).toBe(cy.pageTitle);
      expect($("p.govuk-body strong").text()).toContain(cy.listForDate);
      expect($("details.govuk-details .govuk-details__summary-text").text()).toContain(cy.importantInformationTitle);
      expect($("h2.govuk-heading-s").text()).toContain(cy.searchCasesTitle);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        cy.tableHeaders.time,
        cy.tableHeaders.caseReferenceNumber,
        cy.tableHeaders.respondent,
        cy.tableHeaders.hearingType,
        cy.tableHeaders.venue,
        cy.tableHeaders.timeEstimate
      ]);

      expect(firstDataRowCells($)[COLUMN.respondent]).toBe("Awdurdod Lleol Enghreifftiol");
      expect($("p.govuk-body-s").text()).toContain(cy.dataSource);
      expect($(".back-to-top a").text()).toContain(cy.backToTop);
    });

    it("should render each Welsh important information paragraph", () => {
      const { $ } = renderPage([], {}, cy);

      const paragraphs = $("details.govuk-details .govuk-details__text p")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(paragraphs).toEqual(cy.importantInformationParagraphs);
      expect(paragraphs.join(" ")).toContain("send@justice.gov.uk");
    });
  });
});
