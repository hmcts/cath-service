import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rcjStandardDailyCauseListCy, rcjStandardDailyCauseListEn } from "@hmcts/rcj-standard-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import { moduleRoot as webCoreModuleRoot } from "@hmcts/web-core/config";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webCoreViews = path.join(webCoreModuleRoot, "views");

const TEMPLATE = "kings-bench-division-daily-cause-list.njk";

const listEn = rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST;
const listCy = rcjStandardDailyCauseListCy.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST;
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

// Fixture builders — each test passes only the varied leaf fields; the full
// view-model (header + listContent + common + hearings) is defaulted here so the
// nested tree stays out of individual tests.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    venue: "Court 1",
    judge: "Mr Justice Smith",
    time: "10:00am",
    caseNumber: "KB-2026-001234",
    caseDetails: "Smith v Jones",
    hearingType: "Trial",
    additionalInformation: "In person",
    ...overrides
  };
}

function baseData(locale: "en" | "cy" = "en") {
  const listContent = locale === "cy" ? listCy : listEn;
  const common = locale === "cy" ? commonCy : commonEn;
  return {
    header: {
      listTitle: listContent.pageTitle,
      listDate: locale === "cy" ? "10 Gorffennaf 2026" : "10 July 2026",
      lastUpdatedDate: locale === "cy" ? "9 Gorffennaf 2026" : "9 July 2026",
      lastUpdatedTime: "4:30pm"
    },
    listContent,
    common,
    hearings: [] as ReturnType<typeof buildHearing>[],
    dataSource: locale === "cy" ? "Platfform Data Llys" : "Court Data Platform"
  };
}

function renderList(hearings: ReturnType<typeof buildHearing>[] = [], overrides: Record<string, unknown> = {}, locale: "en" | "cy" = "en") {
  return render(env, TEMPLATE, { ...baseData(locale), hearings, ...overrides });
}

// Rendered hearings-table columns, in template order.
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
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("kings-bench-division-daily-cause-list.njk", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST keys in English and Welsh", () => {
      expect(Object.keys(listEn).sort()).toEqual(Object.keys(listCy).sort());
    });

    it("should have the same common keys in English and Welsh", () => {
      expect(Object.keys(commonEn).sort()).toEqual(Object.keys(commonCy).sort());
    });

    it("should use an https FACT link URL", () => {
      expect(commonEn.factLinkUrl).toMatch(/^https:\/\//);
      expect(commonCy.factLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Header and location information", () => {
    it("should render the heading with the list title", () => {
      const { $ } = renderList();

      const heading = $("h1#top");
      expect(heading).toHaveLength(1);
      expect(heading.text()).toContain(listEn.pageTitle);
    });

    it("should render each location line as its own paragraph", () => {
      const { $ } = renderList();

      const paragraphs = $("p.govuk-body")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(paragraphs).toContain(listEn.locationLine1);
      expect(paragraphs).toContain(listEn.locationLine2);
      expect(paragraphs).toContain(listEn.locationLine3);
    });

    it("should render the list date and last updated information", () => {
      const { $ } = renderList();

      const listForLine = $("p.govuk-body").filter((_, el) => $(el).text().includes(commonEn.listFor));
      expect(listForLine.text()).toContain("10 July 2026");

      const lastUpdatedLine = $("p.govuk-body").filter((_, el) => $(el).text().includes(commonEn.lastUpdated));
      expect(lastUpdatedLine.text()).toContain("9 July 2026");
      expect(lastUpdatedLine.text()).toContain(commonEn.at);
      expect(lastUpdatedLine.text()).toContain("4:30pm");
    });
  });

  describe("Important information section", () => {
    it("should render the details component with the section titles", () => {
      const { $ } = renderList();

      const details = $(".govuk-details");
      expect(details).toHaveLength(1);
      expect(details.find(".govuk-details__summary-text").text()).toContain(commonEn.importantInfoTitle);

      const sectionTitles = details
        .find("h3")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(sectionTitles).toContain(listEn.remoteHearingsTitle);
      expect(sectionTitles).toContain(listEn.remoteJudgmentsTitle);
      expect(sectionTitles).toContain(listEn.bundlesTitle);
    });

    it("should render the remote hearings text", () => {
      const { $ } = renderList();

      const detailsText = $(".govuk-details").text();
      for (const paragraph of listEn.remoteHearingsText.split("\n\n")) {
        expect(detailsText).toContain(paragraph);
      }
    });

    it("should render the remote judgments text", () => {
      const { $ } = renderList();

      const detailsText = $(".govuk-details").text();
      for (const paragraph of listEn.remoteJudgmentsText.split("\n\n")) {
        expect(detailsText).toContain(paragraph);
      }
    });

    it("should render the bundles filing text", () => {
      const { $ } = renderList();

      expect($(".govuk-details").text()).toContain(listEn.bundleFilingText);
    });

    it("should split multi-paragraph text into separate paragraphs", () => {
      const { $ } = renderList();

      const expectedParagraphs =
        listEn.remoteHearingsText.split("\n\n").length + listEn.remoteJudgmentsText.split("\n\n").length + listEn.bundleFilingText.split("\n\n").length;
      expect($(".govuk-details p.govuk-body")).toHaveLength(expectedParagraphs);
    });
  });

  describe("FACT link section", () => {
    it("should render the FACT link with the configured text and additional text", () => {
      const { $ } = renderList();

      const factLink = $(`a[href="${commonEn.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(commonEn.factLinkText);
      expect(factLink.parent().text()).toContain(commonEn.factAdditionalText);
    });
  });

  describe("Search functionality", () => {
    it("should render the search input with the correct attributes and title", () => {
      const { $ } = renderList();

      const input = $("#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("name")).toBe("search");
      expect(input.attr("type")).toBe("text");
      expect($(".search-container h2").text()).toContain(commonEn.searchCasesTitle);
    });

    it("should render a visually hidden label for screen readers", () => {
      const { $ } = renderList();

      const label = $("label.govuk-visually-hidden[for='case-search-input']");
      expect(label).toHaveLength(1);
      expect(label.text().trim()).toBe(commonEn.searchCasesLabel);
    });
  });

  describe("Hearings table", () => {
    it("should render the table headers in column order", () => {
      const { $ } = renderList();

      const headers = $("thead.govuk-table__head th")
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

    it("should render the table with a role and aria-label", () => {
      const { $ } = renderList();

      const table = $("table#hearings-table");
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe(listEn.pageTitle);
    });

    it("should render no data rows when no hearings are provided", () => {
      const { $ } = renderList([]);

      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          venue: "Court 1",
          judge: "Mr Justice Smith",
          time: "10:00am",
          caseNumber: "KB-2026-001234",
          caseDetails: "Smith v Jones",
          hearingType: "Trial",
          additionalInformation: "In person"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.venue]).toBe("Court 1");
      expect(cells[COLUMN.judge]).toBe("Mr Justice Smith");
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.caseNumber]).toBe("KB-2026-001234");
      expect(cells[COLUMN.caseDetails]).toBe("Smith v Jones");
      expect(cells[COLUMN.hearingType]).toBe("Trial");
      expect(cells[COLUMN.additionalInformation]).toBe("In person");
    });

    it("should render a row per hearing", () => {
      const { $ } = renderList([
        buildHearing({ caseNumber: "KB-2026-001234", caseDetails: "Smith v Jones" }),
        buildHearing({ caseNumber: "KB-2026-005678", caseDetails: "Johnson v Williams", hearingType: "Application" }),
        buildHearing({ caseNumber: "KB-2026-009999", caseDetails: "Taylor v Anderson", hearingType: "CMC", additionalInformation: "" })
      ]);

      const rows = $("tbody.govuk-table__body tr");
      expect(rows).toHaveLength(3);
      const caseNumbers = rows.map((_, row) => $(row).find("td").eq(COLUMN.caseNumber).text().trim()).get();
      expect(caseNumbers).toEqual(["KB-2026-001234", "KB-2026-005678", "KB-2026-009999"]);
      const caseDetails = rows.map((_, row) => $(row).find("td").eq(COLUMN.caseDetails).text().trim()).get();
      expect(caseDetails).toEqual(["Smith v Jones", "Johnson v Williams", "Taylor v Anderson"]);
    });

    it("should render empty cells for empty string values while keeping all columns", () => {
      const { $ } = renderList([
        buildHearing({ venue: "", judge: "", caseNumber: "KB-2026-001234", caseDetails: "Smith v Jones", hearingType: "", additionalInformation: "" })
      ]);

      const cells = firstDataRowCells($);
      expect(cells).toHaveLength(7);
      expect(cells[COLUMN.venue]).toBe("");
      expect(cells[COLUMN.judge]).toBe("");
      expect(cells[COLUMN.caseNumber]).toBe("KB-2026-001234");
      expect(cells[COLUMN.caseDetails]).toBe("Smith v Jones");
    });
  });

  describe("Footer section", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Court Data Platform" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(commonEn.dataSource);
      expect(footer.text()).toContain("Court Data Platform");
    });

    it("should render a back-to-top link", () => {
      const { $ } = renderList();

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(commonEn.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, section titles and labels", () => {
      const { $ } = renderList([], {}, "cy");

      expect($("h1#top").text()).toContain(listCy.pageTitle);
      const paragraphs = $("p.govuk-body")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(paragraphs).toContain(listCy.locationLine1);

      const details = $(".govuk-details");
      expect(details.find(".govuk-details__summary-text").text()).toContain(commonCy.importantInfoTitle);
      const sectionTitles = details
        .find("h3")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(sectionTitles).toContain(listCy.remoteHearingsTitle);
      expect(sectionTitles).toContain(listCy.remoteJudgmentsTitle);
      expect(sectionTitles).toContain(listCy.bundlesTitle);

      expect($(".search-container h2").text()).toContain(commonCy.searchCasesTitle);
      expect($(".back-to-top a").text()).toContain(commonCy.backToTop);
    });

    it("should render the Welsh table headers in column order", () => {
      const { $ } = renderList([], {}, "cy");

      const headers = $("thead.govuk-table__head th")
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
  });
});
