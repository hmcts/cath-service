import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import {
  upperTribunalTaxAndChanceryChamberDailyHearingListCy as cy,
  upperTribunalTaxAndChanceryChamberDailyHearingListEn as en
} from "@hmcts/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk";

interface HearingOverrides {
  time?: string;
  caseReferenceNumber?: string;
  caseName?: string;
  judges?: string;
  members?: string;
  hearingType?: string;
  venue?: string;
  additionalInformation?: string;
}

// Fixture builders — a hearing defaults to a realistic minimal shape and each
// test passes only the varied leaf fields, keeping the flat hearing record out
// of individual tests.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    time: "10:00am",
    caseReferenceNumber: "TC/2026/12345",
    caseName: "Smith v HMRC",
    judges: "Judge John Doe",
    members: "Jane Smith",
    hearingType: "Final Hearing",
    venue: "Royal Courts of Justice",
    additionalInformation: "Remote hearing",
    ...overrides
  };
}

function baseData(locale: typeof en | typeof cy = en) {
  const welsh = locale === cy;
  return {
    t: locale,
    en,
    cy,
    title: locale.pageTitle,
    header: {
      listTitle: locale.pageTitle,
      hearingDate: welsh ? "10 Gorffennaf 2026" : "10 July 2026",
      lastUpdatedDate: welsh ? "10 Gorffennaf 2026" : "10 July 2026",
      lastUpdatedTime: welsh ? "9:30yb" : "9:30am"
    },
    hearings: [] as ReturnType<typeof buildHearing>[],
    dataSource: welsh ? "Llwytho â Llaw" : "Manual Upload"
  };
}

function renderList(overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides });
}

// The rendered hearings table columns, in order.
const COLUMN = {
  time: 0,
  caseRef: 1,
  caseName: 2,
  judges: 3,
  members: 4,
  hearingType: 5,
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

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list template", () => {
  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should use https URLs for the FACT and observe links", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.openingStatement.observeLinkUrl).toMatch(/^https:\/\//);
      expect(cy.openingStatement.observeLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the list title as the h1", () => {
      const { $ } = renderList();

      const heading = $("h1.govuk-heading-l#top");
      expect(heading).toHaveLength(1);
      expect(heading.text()).toContain(en.pageTitle);
    });

    it("should render the FACT link with the configured text, URL and trailing text", () => {
      const { $ } = renderList();

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
      const paragraph = factLink.closest("p");
      expect(paragraph.text()).toContain(en.factAdditionalText);
    });

    it("should render the list date with its label", () => {
      const { $ } = renderList({ header: { ...baseData().header, hearingDate: "10 July 2026" } });

      const dateLine = $("p.govuk-body.govuk-\\!-font-weight-bold");
      expect(dateLine.text()).toContain(en.listForDate);
      expect(dateLine.text()).toContain("10 July 2026");
    });

    it("should render the last updated date and time", () => {
      const { $ } = renderList({
        header: { ...baseData().header, lastUpdatedDate: "10 July 2026", lastUpdatedTime: "9:30am" }
      });

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(en.lastUpdated);
      expect(bodyText).toContain("10 July 2026");
      expect(bodyText).toContain(en.at);
      expect(bodyText).toContain("9:30am");
    });
  });

  describe("Opening statement details", () => {
    it("should render the opening statement inside a details element open by default", () => {
      const { $ } = renderList();

      const details = $("details.govuk-details");
      expect(details).toHaveLength(1);
      expect(details.attr("open")).toBeDefined();
      expect(details.find(".govuk-details__summary-text").text()).toContain(en.openingStatementTitle);
    });

    it("should render the contact text containing the tribunal email", () => {
      const { $ } = renderList();

      expect($("details.govuk-details .govuk-details__text").text()).toContain("uttc@justice.gov.uk");
    });

    it("should render the observe link with URL and new-tab attributes", () => {
      const { $ } = renderList();

      const observeLink = $(`a[href="${en.openingStatement.observeLinkUrl}"]`);
      expect(observeLink).toHaveLength(1);
      expect(observeLink.text()).toContain(en.openingStatement.observeLinkText);
      expect(observeLink.attr("target")).toBe("_blank");
      expect(observeLink.attr("rel")).toBe("noopener noreferrer");
    });
  });

  describe("Search section", () => {
    it("should render the search heading, input and accessible labels", () => {
      const { $ } = renderList();

      expect($(".govuk-form-group h2.govuk-heading-s").text()).toContain(en.searchCasesTitle);

      const input = $("#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("name")).toBe("search");
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);

      const label = $("label.govuk-label.govuk-visually-hidden[for='case-search-input']");
      expect(label).toHaveLength(1);
      expect(label.text()).toContain(en.searchCasesLabel);
    });
  });

  describe("Hearings table", () => {
    it("should render the table with the configured headers and aria-label", () => {
      const { $ } = renderList();

      const table = $("table#hearings-table");
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe(en.pageTitle);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        en.tableHeaders.time,
        en.tableHeaders.caseReferenceNumber,
        en.tableHeaders.caseName,
        en.tableHeaders.judges,
        en.tableHeaders.members,
        en.tableHeaders.hearingType,
        en.tableHeaders.venue,
        en.tableHeaders.additionalInformation
      ]);
    });

    it("should render no data rows when there are no hearings", () => {
      const { $ } = renderList({ hearings: [] });

      expect($("tbody.govuk-table__body")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList({
        hearings: [
          buildHearing({
            time: "10:00am",
            caseReferenceNumber: "TC/2026/12345",
            caseName: "Smith v HMRC",
            judges: "Judge John Doe",
            members: "Jane Smith",
            hearingType: "Final Hearing",
            venue: "Royal Courts of Justice",
            additionalInformation: "Remote hearing"
          })
        ]
      });

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.caseRef]).toBe("TC/2026/12345");
      expect(cells[COLUMN.caseName]).toBe("Smith v HMRC");
      expect(cells[COLUMN.judges]).toBe("Judge John Doe");
      expect(cells[COLUMN.members]).toBe("Jane Smith");
      expect(cells[COLUMN.hearingType]).toBe("Final Hearing");
      expect(cells[COLUMN.venue]).toBe("Royal Courts of Justice");
      expect(cells[COLUMN.additionalInformation]).toBe("Remote hearing");
    });

    it("should render one row per hearing", () => {
      const { $ } = renderList({
        hearings: [
          buildHearing({ time: "10:00am", caseReferenceNumber: "TC/2026/12345", caseName: "Smith v HMRC" }),
          buildHearing({ time: "2:00pm", caseReferenceNumber: "TC/2026/67890", caseName: "Jones v HMRC" })
        ]
      });

      expect($("tbody.govuk-table__body tr")).toHaveLength(2);
      const caseRefs = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseRef).text().trim())
        .get();
      expect(caseRefs).toEqual(["TC/2026/12345", "TC/2026/67890"]);
      const times = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.time).text().trim())
        .get();
      expect(times).toEqual(["10:00am", "2:00pm"]);
    });

    it("should render comma-separated judges and members in their columns", () => {
      const { $ } = renderList({
        hearings: [buildHearing({ judges: "Judge John Doe, Judge Jane Smith", members: "Robert Brown, Sarah Wilson" })]
      });

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.judges]).toBe("Judge John Doe, Judge Jane Smith");
      expect(cells[COLUMN.members]).toBe("Robert Brown, Sarah Wilson");
    });

    it("should render empty cells for empty optional fields while keeping populated ones", () => {
      const { $ } = renderList({
        hearings: [
          buildHearing({
            time: "10:00am",
            caseReferenceNumber: "TC/2026/12345",
            caseName: "Smith v HMRC",
            judges: "",
            members: "",
            hearingType: "",
            venue: "",
            additionalInformation: ""
          })
        ]
      });

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.caseRef]).toBe("TC/2026/12345");
      expect(cells[COLUMN.caseName]).toBe("Smith v HMRC");
      expect(cells[COLUMN.judges]).toBe("");
      expect(cells[COLUMN.members]).toBe("");
      expect(cells[COLUMN.hearingType]).toBe("");
      expect(cells[COLUMN.venue]).toBe("");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });
  });

  describe("Data source", () => {
    it("should render the data source label and value in small body text", () => {
      const { $ } = renderList({ dataSource: "Manual Upload" });

      const footer = $("p.govuk-body-s");
      expect(footer).toHaveLength(1);
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("Manual Upload");
    });

    it("should render a different data source value", () => {
      const { $ } = renderList({ dataSource: "XHIBIT" });

      expect($("p.govuk-body-s").text()).toContain("XHIBIT");
    });

    it("should render the label even when the data source value is empty", () => {
      const { $ } = renderList({ dataSource: "" });

      expect($("p.govuk-body-s").text()).toContain(`${en.dataSource}:`);
    });
  });

  describe("Back to top link", () => {
    it("should render a back-to-top link targeting the h1 id", () => {
      const { $ } = renderList();

      const backToTop = $(".back-to-top a.govuk-link[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(en.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, labels, table headers and data source", () => {
      const { $ } = renderList({ hearings: [buildHearing()] }, cy);

      expect($("h1#top").text()).toContain(cy.pageTitle);
      expect($("p.govuk-body.govuk-\\!-font-weight-bold").text()).toContain(cy.listForDate);
      expect($(".govuk-body").text()).toContain(cy.lastUpdated);
      expect($(".govuk-body").text()).toContain(cy.at);
      expect($(".govuk-details__summary-text").text()).toContain(cy.openingStatementTitle);
      expect($(".govuk-form-group h2").text()).toContain(cy.searchCasesTitle);

      const headers = $("thead th")
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
        cy.tableHeaders.additionalInformation
      ]);

      expect($("p.govuk-body-s").text()).toContain(cy.dataSource);
      expect($("p.govuk-body-s").text()).toContain("Llwytho â Llaw");
      expect($(".back-to-top a").text()).toContain(cy.backToTop);
      expect($(`a[href="${cy.factLinkUrl}"]`).text()).toContain(cy.factLinkText);
      expect($(`a[href="${cy.openingStatement.observeLinkUrl}"]`).text()).toContain(cy.openingStatement.observeLinkText);
    });
  });

  describe("Edge cases", () => {
    it("should render a very long case name in the case name column", () => {
      const longName = "A Very Long Case Name Involving Multiple Parties and Complex Tax Matters Including International Transactions and Transfer Pricing";
      const { $ } = renderList({ hearings: [buildHearing({ caseName: longName })] });

      expect(firstDataRowCells($)[COLUMN.caseName]).toBe(longName);
    });

    it("should escape and render special characters in case details", () => {
      const { $ } = renderList({
        hearings: [buildHearing({ caseName: "O'Brien & Smith v HMRC", judges: "Judge Mary O'Connor" })]
      });

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.caseName]).toBe("O'Brien & Smith v HMRC");
      expect(cells[COLUMN.judges]).toBe("Judge Mary O'Connor");
    });

    it("should render long additional information text in its column", () => {
      const longInfo =
        "This is a remote hearing. Parties should join using the video link provided. Technical support available 30 minutes before the hearing starts. Please test your connection in advance.";
      const { $ } = renderList({ hearings: [buildHearing({ additionalInformation: longInfo })] });

      expect(firstDataRowCells($)[COLUMN.additionalInformation]).toBe(longInfo);
    });
  });
});
