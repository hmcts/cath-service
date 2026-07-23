import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import {
  upperTribunalAdministrativeAppealsChamberDailyHearingListCy as cy,
  upperTribunalAdministrativeAppealsChamberDailyHearingListEn as en
} from "@hmcts/upper-tribunal-administrative-appeals-chamber-daily-hearing-list";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk";

interface HearingOverrides {
  time?: string;
  appellant?: string;
  caseReferenceNumber?: string;
  judges?: string;
  members?: string;
  modeOfHearing?: string;
  venue?: string;
  additionalInformation?: string;
}

// Fixture builders — the view model is flat (a header object plus a hearings
// array), so each test overrides only the leaf fields it varies.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    time: "10:00am",
    appellant: "John Smith",
    caseReferenceNumber: "UT/AAC/2026/001",
    judges: "Judge Wilson",
    members: "Member A",
    modeOfHearing: "Remote hearing via CVP",
    venue: "Field House, London",
    additionalInformation: "Public hearing",
    ...overrides
  };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    header: {
      listTitle: locale.pageTitle,
      hearingDate: "13 July 2026",
      lastUpdatedDate: "13 July 2026",
      lastUpdatedTime: "9:00am"
    },
    dataSource: "Manual Upload"
  };
}

function renderList(hearings: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, hearings });
}

// The rendered hearings table columns, in order.
const COLUMN = {
  time: 0,
  appellant: 1,
  caseRef: 2,
  judges: 3,
  members: 4,
  modeOfHearing: 5,
  venue: 6,
  additionalInformation: 7
} as const;

function firstDataRowCells($: CheerioAPI) {
  return $("tbody.govuk-table__body tr")
    .first()
    .find("td")
    .map((_, el) => $(el).text().trim())
    .get();
}

function headerTexts($: CheerioAPI) {
  return $("thead th")
    .map((_, el) => $(el).text().trim())
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("upper-tribunal-administrative-appeals-chamber-daily-hearing-list template", () => {
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
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the heading with the list title at the top anchor", () => {
      const { $ } = renderList([]);

      const heading = $("h1.govuk-heading-l#top");
      expect(heading).toHaveLength(1);
      expect(heading.text()).toContain(en.pageTitle);
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
    });

    it("should render the hearing date and last updated information", () => {
      const { $ } = renderList([]);

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(en.listForDate);
      expect(bodyText).toContain("13 July 2026");
      expect(bodyText).toContain(en.lastUpdated);
      expect(bodyText).toContain("9:00am");
    });
  });

  describe("Opening statement details", () => {
    it("should render the opening statement with all sections", () => {
      const { $ } = renderList([]);

      const details = $("details.govuk-details[data-module='govuk-details']");
      expect(details).toHaveLength(1);

      const text = details.text();
      expect(text).toContain(en.openingStatementTitle);
      expect(text).toContain(en.openingStatement.detailsTitle);
      expect(text).toContain(en.openingStatement.listChangeNotice);
      expect(text).toContain(en.openingStatement.englandAndWalesTitle);
      expect(text).toContain(en.openingStatement.englandAndWalesRemoteText);
      expect(text).toContain(en.openingStatement.scotlandTitle);
    });

    it("should render the England and Wales and Scotland contact email addresses", () => {
      const { $ } = renderList([]);

      const text = $("details.govuk-details").text();
      expect(text).toContain("adminappeals@justice.gov.uk");
      expect(text).toContain("UTAACMailbox@justice.gov.uk");
    });
  });

  describe("Search functionality", () => {
    it("should render the search input with an accessible label", () => {
      const { $ } = renderList([]);

      expect($("h2.govuk-heading-s").text()).toContain(en.searchCasesTitle);

      const input = $("input#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);

      const label = $("label[for='case-search-input']");
      expect(label.hasClass("govuk-visually-hidden")).toBe(true);
      expect(label.text().trim()).toBe(en.searchCasesLabel);
    });
  });

  describe("Hearings table", () => {
    it("should render the table with all headers and an accessible label", () => {
      const { $ } = renderList([]);

      const table = $("table#hearings-table[role='table']");
      expect(table).toHaveLength(1);
      expect(table.attr("aria-label")).toBe(en.pageTitle);

      const headers = headerTexts($);
      expect(headers).toEqual([
        en.tableHeaders.time,
        en.tableHeaders.appellant,
        en.tableHeaders.caseReferenceNumber,
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
          time: "10:00am",
          appellant: "John Smith",
          caseReferenceNumber: "UT/AAC/2026/001",
          judges: "Judge Wilson",
          members: "Member A, Member B",
          modeOfHearing: "Remote hearing via CVP",
          venue: "Field House, London",
          additionalInformation: "Public hearing"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.appellant]).toBe("John Smith");
      expect(cells[COLUMN.caseRef]).toBe("UT/AAC/2026/001");
      expect(cells[COLUMN.judges]).toBe("Judge Wilson");
      expect(cells[COLUMN.members]).toBe("Member A, Member B");
      expect(cells[COLUMN.modeOfHearing]).toBe("Remote hearing via CVP");
      expect(cells[COLUMN.venue]).toBe("Field House, London");
      expect(cells[COLUMN.additionalInformation]).toBe("Public hearing");
    });

    it("should render empty cells for empty optional fields without shifting columns", () => {
      const { $ } = renderList([
        buildHearing({
          time: "2:00pm",
          appellant: "Jane Doe",
          caseReferenceNumber: "UT/AAC/2026/002",
          judges: "Judge Brown",
          members: "",
          modeOfHearing: "In person",
          venue: "Glasgow Tribunals Centre",
          additionalInformation: ""
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.appellant]).toBe("Jane Doe");
      expect(cells[COLUMN.members]).toBe("");
      expect(cells[COLUMN.venue]).toBe("Glasgow Tribunals Centre");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });

    it("should render a row per hearing", () => {
      const { $ } = renderList([
        buildHearing({ appellant: "Appellant One", caseReferenceNumber: "UT/AAC/2026/100" }),
        buildHearing({ appellant: "Appellant Two", caseReferenceNumber: "UT/AAC/2026/101" }),
        buildHearing({ appellant: "Appellant Three", caseReferenceNumber: "UT/AAC/2026/102" })
      ]);

      const appellants = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.appellant).text().trim())
        .get();
      expect(appellants).toEqual(["Appellant One", "Appellant Two", "Appellant Three"]);

      const caseRefs = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseRef).text().trim())
        .get();
      expect(caseRefs).toEqual(["UT/AAC/2026/100", "UT/AAC/2026/101", "UT/AAC/2026/102"]);
    });

    it("should render the table structure but no data rows when there are no hearings", () => {
      const { $ } = renderList([]);

      expect($("table#hearings-table thead")).toHaveLength(1);
      expect($("table#hearings-table tbody")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });

    it("should render a long appellant name in the appellant column", () => {
      const longName = "Very Long Appellant Name With Multiple Parts And Additional Information";
      const { $ } = renderList([buildHearing({ appellant: longName, members: "", additionalInformation: "" })]);

      expect(firstDataRowCells($)[COLUMN.appellant]).toBe(longName);
    });

    it("should render multiple judges and members in their respective columns", () => {
      const { $ } = renderList([buildHearing({ judges: "Judge A, Judge B, Judge C", members: "Member X, Member Y" })]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.judges]).toBe("Judge A, Judge B, Judge C");
      expect(cells[COLUMN.members]).toBe("Member X, Member Y");
    });

    it("should render special characters as literal text", () => {
      const { $ } = renderList([
        buildHearing({
          appellant: "O'Brien & Sons Ltd",
          judges: "Judge Smith-Jones",
          members: "",
          additionalInformation: "Section 39 applies"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.appellant]).toBe("O'Brien & Sons Ltd");
      expect(cells[COLUMN.judges]).toBe("Judge Smith-Jones");
      expect(cells[COLUMN.additionalInformation]).toBe("Section 39 applies");
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Manual Upload" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("Manual Upload");
    });

    it("should render each provided data source value", () => {
      for (const source of ["XHIBIT", "SNL", "Common Platform", "Manual Upload"]) {
        const { $ } = renderList([], { dataSource: source });
        expect($("p.govuk-body-s").text()).toContain(source);
      }
    });

    it("should render a back-to-top link pointing at the top anchor", () => {
      const { $ } = renderList([]);

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(en.backToTop);
      expect($("#top")).toHaveLength(1);
    });

    it("should include the custom back-to-top styles", () => {
      const { $ } = renderList([]);

      const styles = $("style").text();
      expect(styles).toContain(".back-to-top");
      expect(styles).toContain("margin-top: 40px");
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh heading, labels, footer and table headers", () => {
      const { $ } = renderList([], { dataSource: "Llwytho â Llaw" }, cy);

      expect($("h1.govuk-heading-l#top").text()).toContain(cy.pageTitle);
      expect($("details.govuk-details").text()).toContain(cy.openingStatementTitle);
      expect($("h2.govuk-heading-s").text()).toContain(cy.searchCasesTitle);
      expect($("p.govuk-body-s").text()).toContain(cy.dataSource);
      expect($(".back-to-top a").text()).toContain(cy.backToTop);

      const headers = headerTexts($);
      expect(headers).toEqual([
        cy.tableHeaders.time,
        cy.tableHeaders.appellant,
        cy.tableHeaders.caseReferenceNumber,
        cy.tableHeaders.judges,
        cy.tableHeaders.members,
        cy.tableHeaders.modeOfHearing,
        cy.tableHeaders.venue,
        cy.tableHeaders.additionalInformation
      ]);
    });
  });
});
