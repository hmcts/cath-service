import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import {
  upperTribunalLandsChamberDailyHearingListCy as cy,
  upperTribunalLandsChamberDailyHearingListEn as en
} from "@hmcts/upper-tribunal-lands-chamber-daily-hearing-list";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "upper-tribunal-lands-chamber-daily-hearing-list.njk";

interface HearingOverrides {
  time?: string;
  caseReferenceNumber?: string;
  caseName?: string;
  judges?: string;
  members?: string;
  hearingType?: string;
  venue?: string;
  modeOfHearing?: string;
  additionalInformation?: string;
}

// Fixture builders — each test passes only the leaf fields it varies; the view
// model is flat (header + hearings[] + dataSource) so the builders keep the
// full shape out of individual tests.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    time: "10:00am",
    caseReferenceNumber: "LC/2026/001",
    caseName: "Smith v Jones",
    judges: "Mr Justice Williams",
    members: "A Member Esq",
    hearingType: "Final hearing",
    venue: "Royal Courts of Justice",
    modeOfHearing: "Video hearing",
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
      listTitle: locale.pageTitle,
      hearingDate: "15 January 2026",
      lastUpdatedDate: "14 January 2026",
      lastUpdatedTime: "12:00pm"
    },
    dataSource: "Manual Upload"
  };
}

function renderList(hearings: unknown[] = [], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, hearings });
}

// Table columns, in rendered order.
const COLUMN = {
  time: 0,
  caseReferenceNumber: 1,
  caseName: 2,
  judges: 3,
  members: 4,
  hearingType: 5,
  venue: 6,
  modeOfHearing: 7,
  additionalInformation: 8
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
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("upper-tribunal-lands-chamber-daily-hearing-list template", () => {
  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should use https FACT and observe link URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.openingStatement.observeLinkUrl).toMatch(/^https:\/\//);
      expect(cy.openingStatement.observeLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Header section", () => {
    it("should render the title as an h1 anchored at the top", () => {
      const { $ } = renderList();

      const heading = $("h1#top");
      expect(heading).toHaveLength(1);
      expect(heading.text()).toContain(en.pageTitle);
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList();

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
      expect(factLink.parent().text()).toContain(en.factAdditionalText);
    });

    it("should render the list date line", () => {
      const { $ } = renderList();

      const dateLine = $(".govuk-body").filter((_, el) => $(el).text().includes(en.listForDate));
      expect(dateLine.text()).toContain("15 January 2026");
    });

    it("should render the last updated line", () => {
      const { $ } = renderList();

      const updatedLine = $(".govuk-body").filter((_, el) => $(el).text().includes(en.lastUpdated));
      const text = updatedLine.text();
      expect(text).toContain("14 January 2026");
      expect(text).toContain(en.at);
      expect(text).toContain("12:00pm");
    });
  });

  describe("Opening statement section", () => {
    it("should render an open details component with the title", () => {
      const { $ } = renderList();

      const details = $("details.govuk-details[data-module='govuk-details']");
      expect(details).toHaveLength(1);
      expect(details.is("[open]")).toBe(true);
      expect(details.find(".govuk-details__summary-text").text()).toContain(en.openingStatementTitle);
    });

    it("should render the contact text", () => {
      const { $ } = renderList();

      expect($(".govuk-details__text").text()).toContain(en.openingStatement.contactText);
    });

    it("should render the observe link opening in a new tab", () => {
      const { $ } = renderList();

      const observeLink = $(`a[href="${en.openingStatement.observeLinkUrl}"]`);
      expect(observeLink).toHaveLength(1);
      expect(observeLink.text()).toContain(en.openingStatement.observeLinkText);
      expect(observeLink.attr("target")).toBe("_blank");
      expect(observeLink.attr("rel")).toBe("noopener noreferrer");
    });
  });

  describe("Search section", () => {
    it("should render the search title", () => {
      const { $ } = renderList();

      expect($("h2.govuk-heading-s").text()).toContain(en.searchCasesTitle);
    });

    it("should render a text search input with a visually hidden associated label", () => {
      const { $ } = renderList();

      const input = $("#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("name")).toBe("search");
      expect(input.attr("type")).toBe("text");
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);

      const label = $("label[for='case-search-input']");
      expect(label.hasClass("govuk-visually-hidden")).toBe(true);
      expect(label.text().trim()).toBe(en.searchCasesLabel);
    });
  });

  describe("Table structure", () => {
    it("should render the table with a role and aria-label", () => {
      const { $ } = renderList();

      const table = $("#hearings-table");
      expect(table).toHaveLength(1);
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe(en.pageTitle);
    });

    it("should render all nine column headers with scope=col", () => {
      const { $ } = renderList();

      const headers = $("thead th[scope='col']")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toHaveLength(9);
      expect(headers).toEqual([
        en.tableHeaders.time,
        en.tableHeaders.caseReferenceNumber,
        en.tableHeaders.caseName,
        en.tableHeaders.judges,
        en.tableHeaders.members,
        en.tableHeaders.hearingType,
        en.tableHeaders.venue,
        en.tableHeaders.modeOfHearing,
        en.tableHeaders.additionalInformation
      ]);
    });
  });

  describe("Hearings data", () => {
    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          time: "10:00am",
          caseReferenceNumber: "LC/2026/001",
          caseName: "Smith v Jones",
          judges: "Mr Justice Williams",
          members: "A Member Esq",
          hearingType: "Final hearing",
          venue: "Royal Courts of Justice",
          modeOfHearing: "Video hearing",
          additionalInformation: "Interpreter required"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.caseReferenceNumber]).toBe("LC/2026/001");
      expect(cells[COLUMN.caseName]).toBe("Smith v Jones");
      expect(cells[COLUMN.judges]).toBe("Mr Justice Williams");
      expect(cells[COLUMN.members]).toBe("A Member Esq");
      expect(cells[COLUMN.hearingType]).toBe("Final hearing");
      expect(cells[COLUMN.venue]).toBe("Royal Courts of Justice");
      expect(cells[COLUMN.modeOfHearing]).toBe("Video hearing");
      expect(cells[COLUMN.additionalInformation]).toBe("Interpreter required");
    });

    it("should render one row per hearing", () => {
      const { $ } = renderList([
        buildHearing({ caseReferenceNumber: "LC/2026/001", caseName: "Smith v Jones" }),
        buildHearing({ caseReferenceNumber: "LC/2026/002", caseName: "Brown v Taylor" })
      ]);

      const rows = $("tbody.govuk-table__body tr");
      expect(rows).toHaveLength(2);
      const caseRefs = rows.map((_, row) => $(row).find("td").eq(COLUMN.caseReferenceNumber).text().trim()).get();
      expect(caseRefs).toEqual(["LC/2026/001", "LC/2026/002"]);
      const caseNames = rows.map((_, row) => $(row).find("td").eq(COLUMN.caseName).text().trim()).get();
      expect(caseNames).toEqual(["Smith v Jones", "Brown v Taylor"]);
    });

    it("should render an empty members cell when no members are provided", () => {
      const { $ } = renderList([buildHearing({ judges: "Mrs Justice Davis", members: "" })]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.judges]).toBe("Mrs Justice Davis");
      expect(cells[COLUMN.members]).toBe("");
    });

    it("should render an empty additional information cell when none is provided", () => {
      const { $ } = renderList([buildHearing({ caseName: "Brown v Taylor", additionalInformation: "" })]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.caseName]).toBe("Brown v Taylor");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });

    it("should render the headers but no data rows when there are no hearings", () => {
      const { $ } = renderList([]);

      expect($("table.govuk-table")).toHaveLength(1);
      expect($("thead th[scope='col']")).toHaveLength(9);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });
  });

  describe("Footer section", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Manual Upload" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("Manual Upload");
    });

    it("should render a back-to-top link anchored to the top", () => {
      const { $ } = renderList();

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(en.backToTop);
    });

    it("should include the back-to-top custom style in the head", () => {
      const { $ } = renderList();

      expect($("head style").text()).toContain(".back-to-top");
    });
  });

  describe("Accessibility", () => {
    it("should render a full-width grid layout", () => {
      const { $ } = renderList();

      expect($(".govuk-grid-row .govuk-grid-column-full")).toHaveLength(1);
    });

    it("should render a single h1 and at least one h2", () => {
      const { $ } = renderList();

      expect($("h1")).toHaveLength(1);
      expect($("h2").length).toBeGreaterThanOrEqual(1);
    });

    it("should render semantic table structure with a head and body", () => {
      const { $ } = renderList([buildHearing()]);

      expect($("table.govuk-table thead")).toHaveLength(1);
      expect($("table.govuk-table tbody")).toHaveLength(1);
      expect($("thead th[scope='col']").length).toBeGreaterThan(0);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, links, table headers and footer", () => {
      const { $ } = renderList([], {}, cy);

      expect($("h1#top").text()).toContain(cy.pageTitle);
      const dateLine = $(".govuk-body").filter((_, el) => $(el).text().includes(cy.listForDate));
      expect(dateLine.text()).toContain(cy.listForDate);
      expect(
        $(".govuk-body")
          .filter((_, el) => $(el).text().includes(cy.lastUpdated))
          .text()
      ).toContain(cy.at);
      expect($("h2.govuk-heading-s").text()).toContain(cy.searchCasesTitle);

      const headers = $("thead th[scope='col']")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        cy.tableHeaders.time,
        cy.tableHeaders.caseReferenceNumber,
        cy.tableHeaders.caseName,
        cy.tableHeaders.judges,
        cy.tableHeaders.members,
        cy.tableHeaders.hearingType,
        cy.tableHeaders.venue,
        cy.tableHeaders.modeOfHearing,
        cy.tableHeaders.additionalInformation
      ]);

      expect($("p.govuk-body-s").text()).toContain(cy.dataSource);
      expect($(".back-to-top a[href='#top']").text()).toContain(cy.backToTop);
    });

    it("should render the Welsh opening statement", () => {
      const { $ } = renderList([], {}, cy);

      expect($(".govuk-details__summary-text").text()).toContain(cy.openingStatementTitle);
      expect($(".govuk-details__text").text()).toContain(cy.openingStatement.contactText);
      expect($(`a[href="${cy.openingStatement.observeLinkUrl}"]`).text()).toContain(cy.openingStatement.observeLinkText);
    });
  });
});
