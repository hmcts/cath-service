import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fttTaxChamberWeeklyHearingListCy as cy, fttTaxChamberWeeklyHearingListEn as en } from "@hmcts/ftt-tax-chamber-weekly-hearing-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "ftt-tax-chamber-weekly-hearing-list.njk";

interface HearingOverrides {
  date?: string;
  hearingTime?: string;
  caseName?: string;
  caseReferenceNumber?: string;
  judges?: string;
  members?: string;
  venuePlatform?: string;
}

// Fixture builders — each test passes only the varied leaf fields; the full
// header/hearing/data-source view-model tree is defaulted here.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    date: "01/01/2024",
    hearingTime: "10:00am",
    caseName: "Appellant v HMRC",
    caseReferenceNumber: "TC/2024/001",
    judges: "Judge Johnson",
    members: "Member A, Member B",
    venuePlatform: "Video hearing",
    ...overrides
  };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    header: {
      listTitle: "First-tier Tribunal (Tax Chamber) Weekly Hearing List",
      weekCommencingDate: "Monday 1 January 2024",
      lastUpdatedDate: "1 January 2024",
      lastUpdatedTime: "10:30am"
    },
    dataSource: "TAX"
  };
}

function renderList(hearings: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, hearings });
}

// The rendered hearings table columns, in order.
const COLUMN = { date: 0, hearingTime: 1, caseName: 2, caseReferenceNumber: 3, judges: 4, members: 5, venuePlatform: 6 } as const;

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
  env = createTestEnvironment([__dirname, webCoreViews], { trimBlocks: true, lstripBlocks: true });
});

describe("ftt-tax-chamber-weekly-hearing-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should use https FACT and guidance link URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.importantInformationLinkUrl).toMatch(/^https:\/\//);
      expect(cy.importantInformationLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the heading with the list title", () => {
      const { $ } = renderList([buildHearing()]);

      expect($("h1#top").text().trim()).toBe(baseData().header.listTitle);
    });

    it("should render the week commencing and last updated lines", () => {
      const { $ } = renderList([buildHearing()]);

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(`${en.listForWeekCommencing} Monday 1 January 2024`);
      expect(bodyText).toContain(`${en.lastUpdated} 1 January 2024 ${en.at} 10:30am`);
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList([buildHearing()]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
      expect($(".govuk-body").text()).toContain(en.factAdditionalText);
    });

    it("should render the important information details with every paragraph and guidance link", () => {
      const { $ } = renderList([buildHearing()]);

      const details = $("details.govuk-details");
      expect(details).toHaveLength(1);
      expect(details.find(".govuk-details__summary-text").text().trim()).toBe(en.importantInformationTitle);

      const paragraphs = details
        .find(".govuk-details__text p.govuk-body")
        .map((_, el) => $(el).text().trim())
        .get();
      for (const paragraph of en.importantInformationParagraphs) {
        expect(paragraphs).toContain(paragraph);
      }

      const guidanceLink = details.find(`a[href="${en.importantInformationLinkUrl}"]`);
      expect(guidanceLink).toHaveLength(1);
      expect(guidanceLink.text().trim()).toBe(en.importantInformationLinkText);
    });

    it("should render the case search input with its heading and hidden label", () => {
      const { $ } = renderList([buildHearing()]);

      expect($("h2.govuk-heading-s").text()).toContain(en.searchCasesTitle);
      const label = $('label[for="case-search-input"]');
      expect(label).toHaveLength(1);
      expect(label.hasClass("govuk-visually-hidden")).toBe(true);
      expect(label.text().trim()).toBe(en.searchCasesLabel);

      const input = $("input#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("type")).toBe("text");
      expect(input.hasClass("govuk-input")).toBe(true);
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);
    });
  });

  describe("Hearings table", () => {
    it("should render all column headers in order", () => {
      const { $ } = renderList([buildHearing()]);

      const headers = $("thead.govuk-table__head th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        en.tableHeaders.date,
        en.tableHeaders.hearingTime,
        en.tableHeaders.caseName,
        en.tableHeaders.caseReferenceNumber,
        en.tableHeaders.judges,
        en.tableHeaders.members,
        en.tableHeaders.venuePlatform
      ]);
    });

    it("should have a table with an accessible name and column scopes", () => {
      const { $ } = renderList([buildHearing()]);

      const table = $("table.govuk-table");
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe(baseData().header.listTitle);
      expect($("thead.govuk-table__head th[scope='col']")).toHaveLength(7);
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          date: "15/03/2024",
          hearingTime: "2:30pm",
          caseName: "Jones v HMRC",
          caseReferenceNumber: "TC/2024/999",
          judges: "Judge Smith, Judge Williams",
          members: "Member X, Member Y, Member Z",
          venuePlatform: "Court Room 5"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.date]).toBe("15/03/2024");
      expect(cells[COLUMN.hearingTime]).toBe("2:30pm");
      expect(cells[COLUMN.caseName]).toBe("Jones v HMRC");
      expect(cells[COLUMN.caseReferenceNumber]).toBe("TC/2024/999");
      expect(cells[COLUMN.judges]).toBe("Judge Smith, Judge Williams");
      expect(cells[COLUMN.members]).toBe("Member X, Member Y, Member Z");
      expect(cells[COLUMN.venuePlatform]).toBe("Court Room 5");
    });

    it("should render no data rows when the hearings array is empty", () => {
      const { $ } = renderList([]);

      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });

    it("should render a single hearing as one row", () => {
      const { $ } = renderList([buildHearing({ caseReferenceNumber: "TC/2024/123", caseName: "Solo v HMRC" })]);

      expect($("tbody.govuk-table__body tr")).toHaveLength(1);
      const cells = firstDataRowCells($);
      expect(cells[COLUMN.caseReferenceNumber]).toBe("TC/2024/123");
      expect(cells[COLUMN.caseName]).toBe("Solo v HMRC");
    });

    it("should render a row per hearing for multiple hearings", () => {
      const { $ } = renderList([
        buildHearing({ caseReferenceNumber: "TC/2024/001" }),
        buildHearing({ caseReferenceNumber: "TC/2024/002" }),
        buildHearing({ caseReferenceNumber: "TC/2024/003" })
      ]);

      const caseRefs = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseReferenceNumber).text().trim())
        .get();
      expect(caseRefs).toEqual(["TC/2024/001", "TC/2024/002", "TC/2024/003"]);
    });

    it("should render empty judge and member cells without dropping the row", () => {
      const { $ } = renderList([buildHearing({ caseReferenceNumber: "TC/2024/777", judges: "", members: "" })]);

      expect($("tbody.govuk-table__body tr")).toHaveLength(1);
      const cells = firstDataRowCells($);
      expect(cells[COLUMN.caseReferenceNumber]).toBe("TC/2024/777");
      expect(cells[COLUMN.judges]).toBe("");
      expect(cells[COLUMN.members]).toBe("");
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([buildHearing()], { dataSource: "Tax Data Platform" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("Tax Data Platform");
    });

    it("should render a back-to-top link", () => {
      const { $ } = renderList([buildHearing()]);

      const backToTop = $('a[href="#top"]');
      expect(backToTop.text()).toContain(en.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, table headers and labels", () => {
      const { $ } = renderList(
        [buildHearing()],
        {
          header: {
            listTitle: cy.pageTitle,
            weekCommencingDate: "Dydd Llun 1 Ionawr 2024",
            lastUpdatedDate: "1 Ionawr 2024",
            lastUpdatedTime: "10:30yb"
          }
        },
        cy
      );

      expect($(".govuk-body").text()).toContain(cy.listForWeekCommencing);
      expect($(".govuk-body").text()).toContain(cy.lastUpdated);
      expect($("details.govuk-details .govuk-details__summary-text").text().trim()).toBe(cy.importantInformationTitle);
      expect($("h2.govuk-heading-s").text()).toContain(cy.searchCasesTitle);

      const headers = $("thead.govuk-table__head th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(cy.tableHeaders.date);
      expect(headers).toContain(cy.tableHeaders.caseName);
      expect(headers).toContain(cy.tableHeaders.venuePlatform);

      expect($('a[href="#top"]').text()).toContain(cy.backToTop);
    });
  });
});
