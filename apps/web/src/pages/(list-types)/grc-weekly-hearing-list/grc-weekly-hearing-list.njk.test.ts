import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { grcWeeklyHearingListCy as cy, grcWeeklyHearingListEn as en } from "@hmcts/grc-weekly-hearing-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "grc-weekly-hearing-list.njk";

interface HearingOverrides {
  date?: string;
  hearingTime?: string;
  caseReferenceNumber?: string;
  caseName?: string;
  judges?: string;
  members?: string;
  modeOfHearing?: string;
  venue?: string;
  additionalInformation?: string;
}

// Fixture builders — the GRC list renders a single flat hearings table, so each
// test only overrides the leaf fields it cares about rather than re-declaring
// the whole hearing/header tree.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    date: "01/01/2024",
    hearingTime: "10:00am",
    caseReferenceNumber: "GRC/2024/001",
    caseName: "Appellant v HMRC",
    judges: "Judge Johnson",
    members: "Member A, Member B",
    modeOfHearing: "Video hearing",
    venue: "Tribunals Hearing Centre",
    additionalInformation: "Interpreter required",
    ...overrides
  };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    header: {
      listTitle: "General Regulatory Chamber Weekly Hearing List",
      weekCommencingDate: "Monday 1 January 2024",
      lastUpdatedDate: "1 January 2024",
      lastUpdatedTime: "10:30am"
    },
    dataSource: "GRC"
  };
}

function renderList(hearings: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, hearings });
}

// The rendered hearings table columns, in order.
const COLUMN = {
  date: 0,
  hearingTime: 1,
  caseReferenceNumber: 2,
  caseName: 3,
  judges: 4,
  members: 5,
  modeOfHearing: 6,
  venue: 7,
  additionalInformation: 8
} as const;

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

describe("grc-weekly-hearing-list template", () => {
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

    it("should use https FACT and guidance link URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.importantInformationLinkUrl).toMatch(/^https:\/\//);
      expect(en.importantInformationLink2Url).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the list title as the top heading", () => {
      const { $ } = renderList([buildHearing()]);

      const heading = $("h1#top");
      expect(heading).toHaveLength(1);
      expect(heading.text()).toContain("General Regulatory Chamber Weekly Hearing List");
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
  });

  describe("Important information", () => {
    it("should render an open details component with the guidance text and links", () => {
      const { $ } = renderList([buildHearing()]);

      const details = $("details.govuk-details[data-module='govuk-details']");
      expect(details).toHaveLength(1);
      expect(details.attr("open")).toBeDefined();

      expect(details.find(".govuk-details__summary-text").text()).toContain(en.importantInformationTitle);
      const detailsText = details.find(".govuk-details__text").text();
      expect(detailsText).toContain(en.importantInformationText);
      expect(detailsText).toContain(en.importantInformationRecordingText);

      const link1 = details.find(`a[href="${en.importantInformationLinkUrl}"]`);
      expect(link1.text()).toContain(en.importantInformationLinkText);
      expect(link1.attr("target")).toBe("_blank");
      expect(link1.attr("rel")).toBe("noopener noreferrer");

      const link2 = details.find(`a[href="${en.importantInformationLink2Url}"]`);
      expect(link2.text()).toContain(en.importantInformationLink2Text);
      expect(link2.attr("target")).toBe("_blank");
      expect(link2.attr("rel")).toBe("noopener noreferrer");
    });
  });

  describe("Search", () => {
    it("should render the search input with a visually hidden label", () => {
      const { $ } = renderList([buildHearing()]);

      expect($("h2.govuk-heading-s").text()).toContain(en.searchCasesTitle);

      const input = $("input#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("type")).toBe("text");
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);

      const label = $("label.govuk-visually-hidden[for='case-search-input']");
      expect(label.text()).toContain(en.searchCasesLabel);
    });
  });

  describe("Hearings table", () => {
    it("should render every column header in order", () => {
      const { $ } = renderList([buildHearing()]);

      const table = $("table#hearings-table");
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe(en.pageTitle);

      const headers = $("thead.govuk-table__head th[scope='col']")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        en.tableHeaders.date,
        en.tableHeaders.hearingTime,
        en.tableHeaders.caseReferenceNumber,
        en.tableHeaders.caseName,
        en.tableHeaders.judges,
        en.tableHeaders.members,
        en.tableHeaders.modeOfHearing,
        en.tableHeaders.venue,
        en.tableHeaders.additionalInformation
      ]);
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          date: "15/03/2024",
          hearingTime: "2:30pm",
          caseReferenceNumber: "GRC/2024/999",
          caseName: "Jones v Revenue and Customs",
          judges: "Judge Smith, Judge Williams",
          members: "Member X, Member Y, Member Z",
          modeOfHearing: "In person",
          venue: "Manchester Tribunals Centre",
          additionalInformation: "Special arrangements required"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.date]).toBe("15/03/2024");
      expect(cells[COLUMN.hearingTime]).toBe("2:30pm");
      expect(cells[COLUMN.caseReferenceNumber]).toBe("GRC/2024/999");
      expect(cells[COLUMN.caseName]).toBe("Jones v Revenue and Customs");
      expect(cells[COLUMN.judges]).toBe("Judge Smith, Judge Williams");
      expect(cells[COLUMN.members]).toBe("Member X, Member Y, Member Z");
      expect(cells[COLUMN.modeOfHearing]).toBe("In person");
      expect(cells[COLUMN.venue]).toBe("Manchester Tribunals Centre");
      expect(cells[COLUMN.additionalInformation]).toBe("Special arrangements required");
    });

    it("should render a single hearing row", () => {
      const { $ } = renderList([buildHearing({ caseReferenceNumber: "GRC/2024/001", caseName: "Solo v HMRC", date: "02/02/2024" })]);

      const rows = $("tbody.govuk-table__body tr");
      expect(rows).toHaveLength(1);
      const cells = firstDataRowCells($);
      expect(cells[COLUMN.caseReferenceNumber]).toBe("GRC/2024/001");
      expect(cells[COLUMN.caseName]).toBe("Solo v HMRC");
      expect(cells[COLUMN.date]).toBe("02/02/2024");
    });

    it("should render one row per hearing for multiple hearings", () => {
      const { $ } = renderList([
        buildHearing({ caseReferenceNumber: "GRC/2024/001" }),
        buildHearing({ caseReferenceNumber: "GRC/2024/002" }),
        buildHearing({ caseReferenceNumber: "GRC/2024/003" })
      ]);

      expect($("tbody.govuk-table__body tr")).toHaveLength(3);
      expect(columnValues($, COLUMN.caseReferenceNumber)).toEqual(["GRC/2024/001", "GRC/2024/002", "GRC/2024/003"]);
    });

    it("should render distinct mode-of-hearing values in the mode column", () => {
      const { $ } = renderList([
        buildHearing({ caseReferenceNumber: "GRC/2024/001", modeOfHearing: "Video hearing" }),
        buildHearing({ caseReferenceNumber: "GRC/2024/002", modeOfHearing: "Telephone hearing" }),
        buildHearing({ caseReferenceNumber: "GRC/2024/003", modeOfHearing: "In person" }),
        buildHearing({ caseReferenceNumber: "GRC/2024/004", modeOfHearing: "Hybrid" })
      ]);

      expect(columnValues($, COLUMN.modeOfHearing)).toEqual(["Video hearing", "Telephone hearing", "In person", "Hybrid"]);
    });

    it("should render distinct venue values in the venue column", () => {
      const { $ } = renderList([
        buildHearing({ caseReferenceNumber: "GRC/2024/001", venue: "Birmingham Tribunals Centre" }),
        buildHearing({ caseReferenceNumber: "GRC/2024/002", venue: "Manchester Tribunals Centre" }),
        buildHearing({ caseReferenceNumber: "GRC/2024/003", venue: "London Tribunals Centre" })
      ]);

      expect(columnValues($, COLUMN.venue)).toEqual(["Birmingham Tribunals Centre", "Manchester Tribunals Centre", "London Tribunals Centre"]);
    });

    it("should render empty cells for blank optional fields while keeping the row", () => {
      const { $ } = renderList([buildHearing({ caseReferenceNumber: "GRC/2024/010", judges: "", members: "", additionalInformation: "" })]);

      expect($("tbody.govuk-table__body tr")).toHaveLength(1);
      const cells = firstDataRowCells($);
      expect(cells[COLUMN.caseReferenceNumber]).toBe("GRC/2024/010");
      expect(cells[COLUMN.judges]).toBe("");
      expect(cells[COLUMN.members]).toBe("");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });

    it("should render an empty table body when there are no hearings", () => {
      const { $ } = renderList([]);

      expect($("tbody.govuk-table__body")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([buildHearing()], { dataSource: "GRC Data Platform" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("GRC Data Platform");
    });

    it("should render a back-to-top link to the page anchor", () => {
      const { $ } = renderList([buildHearing()]);

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop.text()).toContain(en.backToTop);
      expect($("#top")).toHaveLength(1);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, table headers and labels", () => {
      const welshHeader = {
        listTitle: "[WELSH TRANSLATION REQUIRED: 'General Regulatory Chamber Weekly Hearing List']",
        weekCommencingDate: "Dydd Llun 1 Ionawr 2024",
        lastUpdatedDate: "1 Ionawr 2024",
        lastUpdatedTime: "10:30yb"
      };
      const { $ } = renderList([buildHearing()], { header: welshHeader }, cy);

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(cy.listForWeekCommencing);
      expect(bodyText).toContain(cy.lastUpdated);
      expect($(".govuk-details__summary-text").text()).toContain(cy.importantInformationTitle);
      expect($("h2.govuk-heading-s").text()).toContain(cy.searchCasesTitle);

      const headers = $("thead.govuk-table__head th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(cy.tableHeaders.additionalInformation);
      expect(headers).toContain(cy.tableHeaders.date);

      expect($(".back-to-top a").text()).toContain(cy.backToTop);
    });
  });
});
