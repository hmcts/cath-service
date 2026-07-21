import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fttLrtWeeklyHearingListCy as cy, fttLrtWeeklyHearingListEn as en } from "@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "ftt-lands-registration-tribunal-weekly-hearing-list.njk";

interface HearingOverrides {
  date?: string;
  hearingTime?: string;
  caseName?: string;
  caseReferenceNumber?: string;
  judge?: string;
  venuePlatform?: string;
}

// Fixture builders — each hearing row defaults to a realistic minimal shape and
// only the varied leaf fields are passed per test.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    date: "Monday 7 July 2026",
    hearingTime: "10:00am",
    caseName: "Smith v Jones",
    caseReferenceNumber: "LR/2026/001",
    judge: "Judge Williams",
    venuePlatform: "Video Hearing",
    ...overrides
  };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    header: {
      listTitle: en.pageTitle,
      weekCommencingDate: "7 July 2026",
      lastUpdatedDate: "10 July 2026",
      lastUpdatedTime: "9:00am"
    },
    dataSource: "Test Source"
  };
}

function renderList(hearings: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, hearings });
}

// The rendered hearings table columns, in order.
const COLUMN = { date: 0, hearingTime: 1, caseName: 2, caseReferenceNumber: 3, judge: 4, venuePlatform: 5 } as const;

function rowCells($: CheerioAPI, rowIndex = 0) {
  return $("tbody.govuk-table__body tr")
    .eq(rowIndex)
    .find("td")
    .map((_, el) => $(el).text().trim())
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("ftt-lands-registration-tribunal-weekly-hearing-list template", () => {
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

    it("should use https URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.importantInformationLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.importantInformationLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the heading with the list title", () => {
      const { $ } = renderList([]);

      expect($("h1#top").text()).toContain(en.pageTitle);
    });

    it("should render the week commencing and last updated details", () => {
      const { $ } = renderList([]);

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(en.listForWeekCommencing);
      expect(bodyText).toContain("7 July 2026");
      expect(bodyText).toContain(en.lastUpdated);
      expect(bodyText).toContain("10 July 2026");
      expect(bodyText).toContain("9:00am");
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
      expect($(".govuk-body").text()).toContain(en.factAdditionalText);
    });

    it("should render the important information details section", () => {
      const { $ } = renderList([]);

      const details = $("details.govuk-details");
      expect(details).toHaveLength(1);
      expect(details.find(".govuk-details__summary-text").text()).toContain(en.importantInformationTitle);
      expect(details.find(".govuk-details__text").text()).toContain(en.importantInformationText);

      const infoLink = details.find(`a[href="${en.importantInformationLinkUrl}"]`);
      expect(infoLink).toHaveLength(1);
      expect(infoLink.text()).toContain(en.importantInformationLinkText);
    });

    it("should render the search input", () => {
      const { $ } = renderList([]);

      expect($("h2").text()).toContain(en.searchCasesTitle);
      const input = $("input#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);
    });
  });

  describe("Table headers", () => {
    it("should render every table header from the locale", () => {
      const { $ } = renderList([]);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        en.tableHeaders.date,
        en.tableHeaders.hearingTime,
        en.tableHeaders.caseName,
        en.tableHeaders.caseReferenceNumber,
        en.tableHeaders.judge,
        en.tableHeaders.venuePlatform
      ]);
    });
  });

  describe("Hearings table", () => {
    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          date: "Monday 7 July 2026",
          hearingTime: "10:00am",
          caseName: "Smith v Jones",
          caseReferenceNumber: "LR/2026/001",
          judge: "Judge Williams",
          venuePlatform: "Video Hearing"
        })
      ]);

      const cells = rowCells($);
      expect(cells[COLUMN.date]).toBe("Monday 7 July 2026");
      expect(cells[COLUMN.hearingTime]).toBe("10:00am");
      expect(cells[COLUMN.caseName]).toBe("Smith v Jones");
      expect(cells[COLUMN.caseReferenceNumber]).toBe("LR/2026/001");
      expect(cells[COLUMN.judge]).toBe("Judge Williams");
      expect(cells[COLUMN.venuePlatform]).toBe("Video Hearing");
    });

    it("should render a row per hearing across multiple hearings", () => {
      const { $ } = renderList([
        buildHearing({ caseName: "Smith v Jones", caseReferenceNumber: "LR/2026/001", venuePlatform: "Video Hearing" }),
        buildHearing({
          date: "Tuesday 8 July 2026",
          hearingTime: "2:00pm",
          caseName: "Brown v White",
          caseReferenceNumber: "LR/2026/002",
          judge: "Judge Taylor",
          venuePlatform: "In Person"
        }),
        buildHearing({
          date: "Wednesday 9 July 2026",
          hearingTime: "11:30am",
          caseName: "Green v Blue",
          caseReferenceNumber: "LR/2026/003",
          judge: "Judge Anderson",
          venuePlatform: "Telephone Hearing"
        })
      ]);

      expect($("tbody.govuk-table__body tr")).toHaveLength(3);
      const caseNames = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseName).text().trim())
        .get();
      expect(caseNames).toEqual(["Smith v Jones", "Brown v White", "Green v Blue"]);
      const caseRefs = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseReferenceNumber).text().trim())
        .get();
      expect(caseRefs).toEqual(["LR/2026/001", "LR/2026/002", "LR/2026/003"]);
    });

    it("should render empty cells for empty optional fields", () => {
      const { $ } = renderList([buildHearing({ hearingTime: "", judge: "", venuePlatform: "", caseName: "Test Case", caseReferenceNumber: "LR/2026/004" })]);

      const cells = rowCells($);
      expect(cells[COLUMN.date]).toBe("Monday 7 July 2026");
      expect(cells[COLUMN.caseName]).toBe("Test Case");
      expect(cells[COLUMN.caseReferenceNumber]).toBe("LR/2026/004");
      expect(cells[COLUMN.hearingTime]).toBe("");
      expect(cells[COLUMN.judge]).toBe("");
      expect(cells[COLUMN.venuePlatform]).toBe("");
    });

    it("should render an empty table body when there are no hearings", () => {
      const { $ } = renderList([]);

      expect($("tbody.govuk-table__body")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });

    it("should render a long case name in the case name column", () => {
      const longName =
        "A Very Long Case Name With Multiple Parties Including Smith, Jones, Brown and Several Other Interested Parties v The Defendant and Several Other Respondents";
      const { $ } = renderList([buildHearing({ caseName: longName, caseReferenceNumber: "LR/2026/999" })]);

      const cells = rowCells($);
      expect(cells[COLUMN.caseName]).toBe(longName);
      expect(cells[COLUMN.caseReferenceNumber]).toBe("LR/2026/999");
    });

    it("should render special characters in case name and judge columns unescaped in text", () => {
      const { $ } = renderList([
        buildHearing({ caseName: "Smith & Co v Jones & Associates", judge: "Judge O'Brien", caseReferenceNumber: "LR/2026/100", venuePlatform: "In Person" })
      ]);

      const cells = rowCells($);
      expect(cells[COLUMN.caseName]).toBe("Smith & Co v Jones & Associates");
      expect(cells[COLUMN.judge]).toBe("Judge O'Brien");
    });

    it("should render each venue/platform value in the venue column", () => {
      const { $ } = renderList([
        buildHearing({ caseName: "Case 1", caseReferenceNumber: "LR/2026/201", venuePlatform: "In Person" }),
        buildHearing({ caseName: "Case 2", caseReferenceNumber: "LR/2026/202", venuePlatform: "Video Hearing" }),
        buildHearing({ caseName: "Case 3", caseReferenceNumber: "LR/2026/203", venuePlatform: "Telephone Hearing" }),
        buildHearing({ caseName: "Case 4", caseReferenceNumber: "LR/2026/204", venuePlatform: "Hybrid Hearing" })
      ]);

      const venues = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.venuePlatform).text().trim())
        .get();
      expect(venues).toEqual(["In Person", "Video Hearing", "Telephone Hearing", "Hybrid Hearing"]);
    });

    it("should render each hearing time in the hearing time column", () => {
      const { $ } = renderList([
        buildHearing({ hearingTime: "9:00am", caseName: "Morning Case", caseReferenceNumber: "LR/2026/301" }),
        buildHearing({ hearingTime: "12:30pm", caseName: "Midday Case", caseReferenceNumber: "LR/2026/302" }),
        buildHearing({ hearingTime: "4:30pm", caseName: "Afternoon Case", caseReferenceNumber: "LR/2026/303" })
      ]);

      const times = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.hearingTime).text().trim())
        .get();
      expect(times).toEqual(["9:00am", "12:30pm", "4:30pm"]);
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Land Registry Platform" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("Land Registry Platform");
    });

    it("should render a back-to-top link", () => {
      const { $ } = renderList([]);

      const backToTop = $("a[href='#top']");
      expect(backToTop.text()).toContain(en.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh table headers and labels", () => {
      const { $ } = renderList([buildHearing({ date: "Dydd Llun 7 Gorffennaf 2026", judge: "Barnwr Williams", venuePlatform: "Gwrandawiad Fideo" })], {}, cy);

      expect($("h1#top").text()).toContain(cy.pageTitle);
      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(cy.tableHeaders.date);
      expect(headers).toContain(cy.tableHeaders.judge);
      expect(headers).toContain(cy.tableHeaders.venuePlatform);

      const cells = rowCells($);
      expect(cells[COLUMN.date]).toBe("Dydd Llun 7 Gorffennaf 2026");
      expect($("a[href='#top']").text()).toContain(cy.backToTop);
    });
  });
});
