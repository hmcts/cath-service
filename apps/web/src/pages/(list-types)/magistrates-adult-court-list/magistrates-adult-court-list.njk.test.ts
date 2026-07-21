import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { magistratesAdultCourtListDailyCy as cy, magistratesAdultCourtListDailyEn as en } from "@hmcts/magistrates-adult-court-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "magistrates-adult-court-list.njk";

interface CaseOverrides {
  blockStart?: string;
  caseNumber?: string;
  defendantName?: string;
  dateOfBirth?: string;
  age?: string;
  address?: string;
  informant?: string;
  offenceCode?: string;
  offenceTitle?: string;
  offenceSummary?: string;
}

interface SessionOverrides {
  court?: string;
  lja?: string;
  room?: number;
  sessionStart?: string;
  cases?: unknown[];
}

// Fixture builders — each layer defaults to a realistic minimal shape and only
// the varied leaf fields are passed per test, keeping the session/case tree out
// of individual tests. The controller renders `listData.sessions`, where each
// session carries a flat `cases` array.
function buildCase(overrides: CaseOverrides = {}) {
  return {
    blockStart: "10:00am",
    caseNumber: "CASE001",
    defendantName: "John Smith",
    dateOfBirth: "01/01/1980",
    age: "44",
    address: "123 Test Street, Test City, TC1 1AA",
    informant: "CPS",
    offenceCode: "TH001",
    offenceTitle: "Theft",
    offenceSummary: "Theft from a shop",
    ...overrides
  };
}

function buildSession(overrides: SessionOverrides = {}) {
  return {
    court: "Court 1",
    lja: "Greater London",
    room: 1,
    sessionStart: "9:30am",
    cases: [buildCase()],
    ...overrides
  };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    title: locale.title,
    header: {
      locationName: "Test Magistrates Court",
      contentDate: "15 January 2026",
      publishedDate: "14 January 2026",
      publishedTime: "12:00pm",
      venueAddress: [] as string[]
    },
    openJustice: null,
    dataSource: "Manual Upload"
  };
}

function renderList(sessions: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, listData: { sessions } });
}

// The rendered hearings table columns, in order.
const COLUMN = { blockStart: 0, defendantName: 1, dateOfBirth: 2, address: 3, age: 4, informant: 5, caseNumber: 6, offenceCode: 7 } as const;

// Each case renders a main row (8 cells) plus two colspan detail rows for the
// offence title and summary; filtering on eight cells isolates the case rows.
function dataRows($: CheerioAPI) {
  return $("tbody.govuk-table__body tr").filter((_, r) => $(r).find("td").length === 8);
}

function dataRowsColumn($: CheerioAPI, col: number) {
  return dataRows($)
    .map((_, row) => $(row).find("td").eq(col).text().trim())
    .get();
}

// Reads the value cell of a colspan detail row keyed by its label cell text.
function detailRowValue($: CheerioAPI, label: string) {
  const labelCell = $("tbody.govuk-table__body td").filter((_, el) => $(el).text().trim() === `${label}:`);
  return labelCell.first().next("td").text().trim();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("magistrates-adult-court-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should use https FACT link URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the heading with the page title and location name", () => {
      const { $ } = renderList([]);

      const heading = $("h1.govuk-heading-l").first().text();
      expect(heading).toContain(en.pageTitle);
      expect(heading).toContain("Test Magistrates Court");
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
    });

    it("should render the content date", () => {
      const { $ } = renderList([]);

      const listDate = $("p.govuk-body.govuk-\\!-font-weight-bold").text();
      expect(listDate).toContain(en.listDate);
      expect(listDate).toContain("15 January 2026");
    });

    it("should render the last-updated date and time", () => {
      const { $ } = renderList([]);

      const updatedLine = $("p.govuk-body").filter((_, el) => $(el).text().includes("14 January 2026"));
      expect(updatedLine.text()).toContain("14 January 2026");
      expect(updatedLine.text()).toContain("12:00pm");
    });

    it("should render the venue address lines only when present", () => {
      const withAddress = renderList([], {
        header: { ...baseData().header, venueAddress: ["1 Court Street", "Test City", "TC1 1AA"] }
      }).$;
      const addressPara = withAddress("p.govuk-body").filter((_, el) => withAddress(el).text().includes("1 Court Street"));
      expect(addressPara).toHaveLength(1);
      for (const line of ["1 Court Street", "Test City", "TC1 1AA"]) {
        expect(addressPara.text()).toContain(line);
      }

      const withoutAddress = renderList([]).$;
      expect(withoutAddress("p.govuk-body").filter((_, el) => withoutAddress(el).text().includes("Court Street"))).toHaveLength(0);
    });

    it("should render the reporting-restrictions guidance section", () => {
      const { $ } = renderList([]);

      const section = $(".restriction-list-section");
      expect(section).toHaveLength(1);
      expect(section.find("h3").text()).toContain(en.restrictionInformationHeading);
      expect(section.find(".govuk-warning-text__text").text()).toContain(en.restrictionInformationBoldText);
      const bullets = section
        .find("ul.govuk-list--bullet li")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(bullets).toEqual([en.restrictionBulletPoint1, en.restrictionBulletPoint2]);
    });

    it("should render the case search input and heading", () => {
      const { $ } = renderList([]);

      expect($("h2.govuk-heading-m").text()).toContain(en.searchCases);
      const input = $("#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("type")).toBe("text");
    });
  });

  describe("Empty sessions", () => {
    it("should render an empty accordion with no tables when there are no sessions", () => {
      const { $ } = renderList([]);

      expect($("#court-lists-container")).toHaveLength(1);
      expect($(".govuk-accordion__section")).toHaveLength(0);
      expect($("table")).toHaveLength(0);
    });
  });

  describe("Session accordion", () => {
    it("should render the court name in the section heading", () => {
      const { $ } = renderList([buildSession({ court: "The Magistrates Court at Westminster", cases: [] })]);

      expect($(".govuk-accordion__section-button").text()).toContain("The Magistrates Court at Westminster");
    });

    it("should render the courtroom, LJA and session start details", () => {
      const { $ } = renderList([buildSession({ room: 3, lja: "Greater London", sessionStart: "9:30am", cases: [] })]);

      const content = $(".govuk-accordion__section-content").text();
      expect(content).toContain(en.sittingAt);
      expect(content).toContain(en.courtroom);
      expect(content).toContain("3");
      expect(content).toContain(en.ljaLabel);
      expect(content).toContain("Greater London");
      expect(content).toContain(en.sessionStart);
      expect(content).toContain("9:30am");
    });

    it("should render one accordion section and table per session", () => {
      const { $ } = renderList([
        buildSession({ court: "Court 1", cases: [buildCase({ caseNumber: "CASE001", defendantName: "First Defendant" })] }),
        buildSession({ court: "Court 2", cases: [buildCase({ caseNumber: "CASE002", defendantName: "Second Defendant" })] })
      ]);

      expect($(".govuk-accordion__section")).toHaveLength(2);
      expect($("table")).toHaveLength(2);
      const headings = $(".govuk-accordion__section-button")
        .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
        .get();
      expect(headings).toEqual(["Court 1", "Court 2"]);
      expect(dataRowsColumn($, COLUMN.defendantName)).toEqual(["First Defendant", "Second Defendant"]);
    });
  });

  describe("Cases table", () => {
    it("should render the table headers in order", () => {
      const { $ } = renderList([buildSession()]);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([en.blockStart, en.defendantName, en.dateOfBirth, en.address, en.age, en.informant, en.caseNumber, en.offenceCode]);
    });

    it("should place each case field in its correct column", () => {
      const { $ } = renderList([
        buildSession({
          cases: [
            buildCase({
              blockStart: "10:00am",
              defendantName: "John Smith",
              dateOfBirth: "01/01/1980",
              address: "123 Test Street, Test City, TC1 1AA",
              age: "44",
              informant: "Crown Prosecution Service",
              caseNumber: "CASE123",
              offenceCode: "TH001"
            })
          ]
        })
      ]);

      const cells = dataRows($).first().find("td");
      expect(cells.eq(COLUMN.blockStart).text().trim()).toBe("10:00am");
      expect(cells.eq(COLUMN.defendantName).text().trim()).toBe("John Smith");
      expect(cells.eq(COLUMN.dateOfBirth).text().trim()).toBe("01/01/1980");
      expect(cells.eq(COLUMN.address).text().trim()).toBe("123 Test Street, Test City, TC1 1AA");
      expect(cells.eq(COLUMN.age).text().trim()).toBe("44");
      expect(cells.eq(COLUMN.informant).text().trim()).toBe("Crown Prosecution Service");
      expect(cells.eq(COLUMN.caseNumber).text().trim()).toBe("CASE123");
      expect(cells.eq(COLUMN.offenceCode).text().trim()).toBe("TH001");
    });

    it("should render the offence title and summary detail rows for each case", () => {
      const { $ } = renderList([buildSession({ cases: [buildCase({ offenceTitle: "Burglary", offenceSummary: "Entered a dwelling as a trespasser" })] })]);

      expect(detailRowValue($, en.offenceTitle)).toBe("Burglary");
      expect(detailRowValue($, en.offenceSummary)).toBe("Entered a dwelling as a trespasser");
    });

    it("should render a row per case within a session", () => {
      const { $ } = renderList([
        buildSession({
          cases: [buildCase({ caseNumber: "CASE001", defendantName: "John Smith" }), buildCase({ caseNumber: "CASE002", defendantName: "Jane Doe" })]
        })
      ]);

      expect(dataRowsColumn($, COLUMN.caseNumber)).toEqual(["CASE001", "CASE002"]);
      expect(dataRowsColumn($, COLUMN.defendantName)).toEqual(["John Smith", "Jane Doe"]);
    });

    it("should not render a table for a session with no cases", () => {
      const { $ } = renderList([buildSession({ court: "Empty Court", cases: [] })]);

      expect($(".govuk-accordion__section-button").text()).toContain("Empty Court");
      expect(dataRows($)).toHaveLength(0);
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Magistrates Data Platform" });

      const footer = $("p.govuk-body").filter((_, el) => $(el).text().includes(en.dataSource));
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("Magistrates Data Platform");
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, table headers and labels", () => {
      const { $ } = renderList([buildSession({ court: "Llys 1" })], {}, cy);

      expect($("h1.govuk-heading-l").first().text()).toContain(cy.pageTitle);
      expect($(".govuk-accordion__section-button").text()).toContain("Llys 1");
      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([cy.blockStart, cy.defendantName, cy.dateOfBirth, cy.address, cy.age, cy.informant, cy.caseNumber, cy.offenceCode]);
      const sectionText = $(".restriction-list-section").text();
      expect(sectionText).toContain(cy.restrictionInformationHeading);
      expect(sectionText).toContain(cy.restrictionInformationBoldText);
    });
  });
});
