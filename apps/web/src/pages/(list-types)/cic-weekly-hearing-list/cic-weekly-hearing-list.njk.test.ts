import path from "node:path";
import { fileURLToPath } from "node:url";
import { cicWeeklyHearingListCy as cy, cicWeeklyHearingListEn as en } from "@hmcts/cic-weekly-hearing-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import { moduleRoot as webCoreModuleRoot } from "@hmcts/web-core/config";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "cic-weekly-hearing-list.njk";
const webCoreViews = path.join(webCoreModuleRoot, "views");

interface HearingOverrides {
  date?: string;
  hearingTime?: string;
  caseReferenceNumber?: string;
  caseName?: string;
  venuePlatform?: string;
  judges?: string;
  members?: string;
  additionalInformation?: string;
}

// Fixture builders — each test passes only the varied leaf fields; the header
// and a realistic single-hearing default keep the boilerplate out of tests.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    date: "01/01/2024",
    hearingTime: "10:00am",
    caseReferenceNumber: "CIC/2024/001",
    caseName: "Smith v CICA",
    venuePlatform: "Video hearing",
    judges: "Judge Johnson",
    members: "Member A, Member B",
    additionalInformation: "Interpreter required",
    ...overrides
  };
}

function buildHeader(overrides: Record<string, string> = {}) {
  return {
    listTitle: "Criminal Injuries Compensation Weekly Hearing List",
    weekCommencingDate: "Monday 1 January 2024",
    lastUpdatedDate: "1 January 2024",
    lastUpdatedTime: "10:30am",
    ...overrides
  };
}

function renderList(hearings: unknown[] = [buildHearing()], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, {
    t: locale,
    en,
    cy,
    header: buildHeader(),
    hearings,
    dataSource: "CRIME",
    ...overrides
  });
}

// The rendered hearings table columns, in order.
const COLUMN = {
  date: 0,
  hearingTime: 1,
  caseReferenceNumber: 2,
  caseName: 3,
  venuePlatform: 4,
  judges: 5,
  members: 6,
  additionalInformation: 7
} as const;

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

describe("cic-weekly-hearing-list.njk", () => {
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
      const { $ } = renderList();

      expect($("h1#top").text().trim()).toBe("Criminal Injuries Compensation Weekly Hearing List");
    });

    it("should render the week commencing and last updated lines", () => {
      const { $ } = renderList([buildHearing()], {
        header: buildHeader({ weekCommencingDate: "Monday 8 January 2024", lastUpdatedDate: "8 January 2024", lastUpdatedTime: "9:15am" })
      });

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(en.listForWeekCommencing);
      expect(bodyText).toContain("Monday 8 January 2024");
      expect(bodyText).toContain(en.lastUpdated);
      expect(bodyText).toContain(en.at);
      expect(bodyText).toContain("8 January 2024");
      expect(bodyText).toContain("9:15am");
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList();

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
    });
  });

  describe("Important information", () => {
    it("should render the details component with paragraphs and reporting orders", () => {
      const { $ } = renderList();

      const details = $("details.govuk-details");
      expect(details).toHaveLength(1);
      expect(details.find(".govuk-details__summary-text").text()).toContain(en.importantInformationTitle);

      const detailsText = details.find(".govuk-details__text").text();
      for (const paragraph of en.importantInformationParagraphs) {
        expect(detailsText).toContain(paragraph);
      }
      expect(detailsText).toContain(en.restrictedReportingOrdersTitle);
      expect(detailsText).toContain(en.restrictedReportingOrdersText);

      const guidanceLink = details.find(`a[href="${en.importantInformationLinkUrl}"]`);
      expect(guidanceLink).toHaveLength(1);
      expect(guidanceLink.text()).toContain(en.importantInformationLinkText);
    });
  });

  describe("Search input", () => {
    it("should render a labelled text input", () => {
      const { $ } = renderList();

      expect($("h2.govuk-heading-s").text()).toContain(en.searchCasesTitle);

      const input = $("input#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("type")).toBe("text");
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);

      const hiddenLabel = $("label.govuk-visually-hidden[for='case-search-input']");
      expect(hiddenLabel.text()).toContain(en.searchCasesLabel);
    });
  });

  describe("Hearings table", () => {
    it("should render all column headers in order", () => {
      const { $ } = renderList();

      const table = $("table#hearings-table");
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe(en.pageTitle);

      const headers = $("thead th[scope='col']")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        en.tableHeaders.date,
        en.tableHeaders.hearingTime,
        en.tableHeaders.caseReferenceNumber,
        en.tableHeaders.caseName,
        en.tableHeaders.venuePlatform,
        en.tableHeaders.judges,
        en.tableHeaders.members,
        en.tableHeaders.additionalInformation
      ]);
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          date: "15/03/2024",
          hearingTime: "2:30pm",
          caseReferenceNumber: "CIC/2024/999",
          caseName: "Jones v CICA",
          venuePlatform: "Court Room 5",
          judges: "Judge Smith, Judge Williams",
          members: "Member X, Member Y, Member Z",
          additionalInformation: "Special arrangements required"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.date]).toBe("15/03/2024");
      expect(cells[COLUMN.hearingTime]).toBe("2:30pm");
      expect(cells[COLUMN.caseReferenceNumber]).toBe("CIC/2024/999");
      expect(cells[COLUMN.caseName]).toBe("Jones v CICA");
      expect(cells[COLUMN.venuePlatform]).toBe("Court Room 5");
      expect(cells[COLUMN.judges]).toBe("Judge Smith, Judge Williams");
      expect(cells[COLUMN.members]).toBe("Member X, Member Y, Member Z");
      expect(cells[COLUMN.additionalInformation]).toBe("Special arrangements required");
    });

    it("should render no data rows when the hearings array is empty", () => {
      const { $ } = renderList([]);

      expect($("tbody.govuk-table__body")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });

    it("should render a single hearing row", () => {
      const { $ } = renderList([buildHearing({ caseReferenceNumber: "CIC/2024/007", caseName: "Only v CICA" })]);

      expect($("tbody.govuk-table__body tr")).toHaveLength(1);
      const cells = firstDataRowCells($);
      expect(cells[COLUMN.caseReferenceNumber]).toBe("CIC/2024/007");
      expect(cells[COLUMN.caseName]).toBe("Only v CICA");
    });

    it("should render a row per hearing for multiple hearings", () => {
      const { $ } = renderList([
        buildHearing({ caseReferenceNumber: "CIC/2024/001" }),
        buildHearing({ caseReferenceNumber: "CIC/2024/002" }),
        buildHearing({ caseReferenceNumber: "CIC/2024/003" })
      ]);

      const caseRefs = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseReferenceNumber).text().trim())
        .get();
      expect(caseRefs).toEqual(["CIC/2024/001", "CIC/2024/002", "CIC/2024/003"]);
    });

    it("should render empty cells for empty string fields without dropping the row", () => {
      const { $ } = renderList([buildHearing({ judges: "", members: "", additionalInformation: "" })]);

      expect($("tbody.govuk-table__body tr")).toHaveLength(1);
      const cells = firstDataRowCells($);
      expect(cells[COLUMN.caseReferenceNumber]).toBe("CIC/2024/001");
      expect(cells[COLUMN.judges]).toBe("");
      expect(cells[COLUMN.members]).toBe("");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([buildHearing()], { dataSource: "MANUAL_UPLOAD" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("MANUAL_UPLOAD");
    });

    it("should render a back-to-top link", () => {
      const { $ } = renderList();

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop.text()).toContain(en.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, table headers and labels", () => {
      const { $ } = renderList([buildHearing()], {}, cy);

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(cy.listForWeekCommencing);
      expect(bodyText).toContain(cy.lastUpdated);

      expect($("details.govuk-details .govuk-details__summary-text").text()).toContain(cy.importantInformationTitle);
      expect($("h2.govuk-heading-s").text()).toContain(cy.searchCasesTitle);

      const headers = $("thead th[scope='col']")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        cy.tableHeaders.date,
        cy.tableHeaders.hearingTime,
        cy.tableHeaders.caseReferenceNumber,
        cy.tableHeaders.caseName,
        cy.tableHeaders.venuePlatform,
        cy.tableHeaders.judges,
        cy.tableHeaders.members,
        cy.tableHeaders.additionalInformation
      ]);

      expect($(".back-to-top a").text()).toContain(cy.backToTop);
    });
  });
});
