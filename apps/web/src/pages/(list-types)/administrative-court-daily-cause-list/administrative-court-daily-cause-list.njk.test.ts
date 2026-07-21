import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { administrativeCourtDailyCauseListCy as cy, administrativeCourtDailyCauseListEn as en } from "@hmcts/administrative-court-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "administrative-court-daily-cause-list.njk";

type ListTypeKey =
  | "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
  | "LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
  | "BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
  | "MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST";

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
// hearing row and template view-model (common/listContent/header) default to a
// realistic minimal shape.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    venue: "Court Room 1",
    judge: "Judge Smith",
    time: "10:00am",
    caseNumber: "T123456/2026",
    caseDetails: "Test Case v Another Party",
    hearingType: "Trial",
    additionalInformation: "Video hearing",
    ...overrides
  };
}

function baseData(locale: typeof en | typeof cy = en, listTypeName: ListTypeKey = "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST") {
  const listContent = locale[listTypeName];
  return {
    en,
    cy,
    listTypeName,
    listContent,
    common: locale.common,
    header: {
      listTitle: listContent.pageTitle,
      listDate: "10 July 2026",
      lastUpdatedDate: "10 July 2026",
      lastUpdatedTime: "9:00am"
    },
    hearings: [] as unknown[],
    dataSource: "CPP"
  };
}

function renderList(
  hearings: unknown[],
  overrides: Record<string, unknown> = {},
  locale: typeof en | typeof cy = en,
  listTypeName: ListTypeKey = "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
) {
  return render(env, TEMPLATE, { ...baseData(locale, listTypeName), ...overrides, hearings });
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

describe("administrative-court-daily-cause-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same top-level keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should use https FACT link URLs", () => {
      expect(en.common.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.common.factLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the heading with the list title", () => {
      const { $ } = renderList([]);

      expect($("h1#top").text()).toContain(en.BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle);
    });

    it("should render the list date and last updated date and time", () => {
      const { $ } = renderList([], {
        header: {
          listTitle: en.BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
          listDate: "10 July 2026",
          lastUpdatedDate: "10 July 2026",
          lastUpdatedTime: "9:00am"
        }
      });

      const listForLine = $(".govuk-body").filter((_, el) => $(el).text().includes(en.common.listFor));
      expect(listForLine.text()).toContain("10 July 2026");
      const lastUpdatedLine = $(".govuk-body").filter((_, el) => $(el).text().includes(en.common.lastUpdated));
      expect(lastUpdatedLine.text()).toContain("9:00am");
      expect(lastUpdatedLine.text()).toContain(en.common.at);
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.common.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.common.factLinkText);
    });

    it("should not render the FACT link when the link text is empty", () => {
      const { $ } = renderList([], { common: { ...en.common, factLinkText: "" } });

      expect($(`a[href="${en.common.factLinkUrl}"]`)).toHaveLength(0);
    });
  });

  describe("Important information", () => {
    it("should render the important-information details when a list type is set", () => {
      const { $ } = renderList([]);

      const details = $(".govuk-details");
      expect(details).toHaveLength(1);
      expect(details.find(".govuk-details__summary-text").text()).toContain(en.common.importantInfoTitle);
      const detailsText = details.text();
      expect(detailsText).toContain(en.BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.importantInfoText.split("\n\n")[0]);
      expect(detailsText).toContain(en.BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.judgmentsTitle);
    });

    it("should not render the important-information details when no list type is set", () => {
      const { $ } = renderList([], { listTypeName: null });

      expect($(".govuk-details")).toHaveLength(0);
    });
  });

  describe("Search", () => {
    it("should render the search heading, label and input", () => {
      const { $ } = renderList([]);

      expect($(".search-container h2").text()).toContain(en.common.searchCasesTitle);
      const input = $("#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("aria-label")).toBe(en.common.searchCasesLabel);
      expect($("label[for='case-search-input']").text()).toContain(en.common.searchCasesLabel);
    });
  });

  describe("Hearings table", () => {
    it("should render all table headers in order", () => {
      const { $ } = renderList([]);

      const headers = $("#hearings-table thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        en.common.tableHeaders.venue,
        en.common.tableHeaders.judge,
        en.common.tableHeaders.time,
        en.common.tableHeaders.caseNumber,
        en.common.tableHeaders.caseDetails,
        en.common.tableHeaders.hearingType,
        en.common.tableHeaders.additionalInformation
      ]);
    });

    it("should render the table with no data rows when there are no hearings", () => {
      const { $ } = renderList([]);

      expect($("#hearings-table")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          venue: "Court Room 1",
          judge: "Judge Smith",
          time: "10:00am",
          caseNumber: "T123456/2026",
          caseDetails: "Test Case v Another Party",
          hearingType: "Trial",
          additionalInformation: "Video hearing"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.venue]).toBe("Court Room 1");
      expect(cells[COLUMN.judge]).toBe("Judge Smith");
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.caseNumber]).toBe("T123456/2026");
      expect(cells[COLUMN.caseDetails]).toBe("Test Case v Another Party");
      expect(cells[COLUMN.hearingType]).toBe("Trial");
      expect(cells[COLUMN.additionalInformation]).toBe("Video hearing");
    });

    it("should render a row per hearing", () => {
      const { $ } = renderList([
        buildHearing({ caseNumber: "T123456/2026", hearingType: "Trial" }),
        buildHearing({ caseNumber: "T789012/2026", hearingType: "Directions", additionalInformation: "" })
      ]);

      const rows = $("tbody.govuk-table__body tr");
      expect(rows).toHaveLength(2);
      const caseNumbers = rows.map((_, row) => $(row).find("td").eq(COLUMN.caseNumber).text().trim()).get();
      expect(caseNumbers).toEqual(["T123456/2026", "T789012/2026"]);
      const hearingTypes = rows.map((_, row) => $(row).find("td").eq(COLUMN.hearingType).text().trim()).get();
      expect(hearingTypes).toEqual(["Trial", "Directions"]);
    });

    it("should render a row with empty cells when hearing fields are empty", () => {
      const { $ } = renderList([
        {
          venue: "",
          judge: "",
          time: "",
          caseNumber: "",
          caseDetails: "",
          hearingType: "",
          additionalInformation: ""
        }
      ]);

      expect($("tbody.govuk-table__body tr")).toHaveLength(1);
      expect(firstDataRowCells($)).toEqual(["", "", "", "", "", "", ""]);
    });

    it("should render a row for every hearing when there are many", () => {
      const hearings = Array.from({ length: 10 }, (_, i) => buildHearing({ venue: `Court Room ${i + 1}`, caseNumber: `T${100000 + i}/2026` }));
      const { $ } = renderList(hearings);

      const rows = $("tbody.govuk-table__body tr");
      expect(rows).toHaveLength(10);
      expect(rows.first().find("td").eq(COLUMN.caseNumber).text().trim()).toBe("T100000/2026");
      expect(rows.last().find("td").eq(COLUMN.caseNumber).text().trim()).toBe("T100009/2026");
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "CPP" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.common.dataSource);
      expect(footer.text()).toContain("CPP");
    });

    it("should render a back-to-top link", () => {
      const { $ } = renderList([]);

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(en.common.backToTop);
    });
  });

  describe("Different list types", () => {
    it("should render the Leeds list type with its contact details", () => {
      const { $ } = renderList([], {}, en, "LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST");

      expect($("h1#top").text()).toContain(en.LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle);
      expect($(".govuk-details").text()).toContain(en.LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.importantInfoText.split("\n\n")[0]);
    });

    it("should render the Bristol and Cardiff list type", () => {
      const { $ } = renderList([], {}, en, "BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST");

      expect($("h1#top").text()).toContain(en.BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle);
      expect($(".govuk-details").text()).toContain(en.BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.importantInfoText.split("\n\n")[0]);
    });

    it("should render the Manchester list type with its contact details", () => {
      const { $ } = renderList([], {}, en, "MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST");

      expect($("h1#top").text()).toContain(en.MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle);
      expect($(".govuk-details").text()).toContain(en.MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.importantInfoText.split("\n\n")[0]);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, important information, search title and table headers", () => {
      const { $ } = renderList([], {}, cy);

      expect($("h1#top").text()).toContain(cy.BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle);
      expect($(".govuk-details .govuk-details__summary-text").text()).toContain(cy.common.importantInfoTitle);
      expect($(".govuk-details").text()).toContain(cy.BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.importantInfoText.split("\n\n")[0]);
      expect($(".search-container h2").text()).toContain(cy.common.searchCasesTitle);
      const headers = $("#hearings-table thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(cy.common.tableHeaders.venue);
      expect(headers).toContain(cy.common.tableHeaders.judge);
      expect(headers).toContain(cy.common.tableHeaders.time);
      expect($(".back-to-top a").text()).toContain(cy.common.backToTop);
    });
  });
});
