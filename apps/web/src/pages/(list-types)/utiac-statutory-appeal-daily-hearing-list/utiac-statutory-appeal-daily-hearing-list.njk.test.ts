import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import { utiacStatutoryAppealDailyHearingListCy as cy, utiacStatutoryAppealDailyHearingListEn as en } from "@hmcts/utiac-statutory-appeal-daily-hearing-list";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "utiac-statutory-appeal-daily-hearing-list.njk";

interface HearingOverrides {
  hearingTime?: string;
  appellant?: string;
  representative?: string;
  appealReferenceNumber?: string;
  judges?: string;
  hearingType?: string;
  location?: string;
  additionalInformation?: string;
}

// Fixture builders — each test passes only the varied leaf fields; the flat
// hearing row and header shape are defaulted to a realistic minimal value.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    hearingTime: "10:00am",
    appellant: "John Smith",
    representative: "ABC Solicitors",
    appealReferenceNumber: "IA/12345/2026",
    judges: "Judge A. Johnson",
    hearingType: "Remote - Video",
    location: "Field House",
    additionalInformation: "Interpreter required",
    ...overrides
  };
}

function buildHeader(overrides: Record<string, unknown> = {}) {
  return {
    listTitle: en.pageTitle,
    listForDate: "15 January 2026",
    lastUpdatedDate: "14 January 2026",
    lastUpdatedTime: "12:00pm",
    ...overrides
  };
}

function renderList(hearings: unknown[] = [], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, {
    en,
    cy,
    t: locale,
    header: buildHeader(overrides.header as Record<string, unknown>),
    hearings,
    dataSource: (overrides.dataSource as string) ?? "Manual Upload"
  });
}

// The rendered hearings table columns, in order.
const COLUMN = {
  hearingTime: 0,
  appellant: 1,
  representative: 2,
  appealReferenceNumber: 3,
  judges: 4,
  hearingType: 5,
  location: 6,
  additionalInformation: 7
} as const;

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

describe("utiac-statutory-appeal-daily-hearing-list template", () => {
  describe("Locale consistency", () => {
    it("should have the same top-level keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have the same table header keys in English and Welsh", () => {
      expect(Object.keys(en.tableHeaders).sort()).toEqual(Object.keys(cy.tableHeaders).sort());
    });

    it("should use https link URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.importantInformationLinkUrl).toMatch(/^https:\/\//);
      expect(cy.importantInformationLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Header section", () => {
    it("should render the list title as the h1 anchor target", () => {
      const { $ } = renderList([], { header: { listTitle: en.pageTitle } });

      const heading = $("h1#top");
      expect(heading).toHaveLength(1);
      expect(heading.text()).toContain(en.pageTitle);
    });

    it("should render the FACT link with the configured text, url and additional text", () => {
      const { $ } = renderList();

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
      expect(factLink.parent().text()).toContain(en.factAdditionalText);
    });

    it("should render the list date and last updated information", () => {
      const { $ } = renderList([], { header: { listForDate: "15 January 2026", lastUpdatedDate: "14 January 2026", lastUpdatedTime: "12:00pm" } });

      const bodyText = $(".govuk-grid-column-full").text();
      expect(bodyText).toContain(en.listForDate);
      expect(bodyText).toContain("15 January 2026");
      expect(bodyText).toContain(en.lastUpdated);
      expect(bodyText).toContain("14 January 2026");
      expect(bodyText).toContain(en.at);
      expect(bodyText).toContain("12:00pm");
    });
  });

  describe("Important information section", () => {
    it("should render an open details component with title, text, email and guidance link", () => {
      const { $ } = renderList();

      const details = $("details.govuk-details[data-module='govuk-details']");
      expect(details).toHaveLength(1);
      expect(details.is("[open]")).toBe(true);
      expect(details.find(".govuk-details__summary-text").text()).toContain(en.importantInformationTitle);

      const detailsText = details.find(".govuk-details__text").text();
      expect(detailsText).toContain(en.importantInformationText);
      expect(detailsText).toContain(en.importantInformationEmailText);

      const guidanceLink = details.find(`a[href="${en.importantInformationLinkUrl}"]`);
      expect(guidanceLink).toHaveLength(1);
      expect(guidanceLink.text()).toContain(en.importantInformationLinkText);
      expect(guidanceLink.attr("target")).toBe("_blank");
      expect(guidanceLink.attr("rel")).toBe("noopener noreferrer");
    });
  });

  describe("Search section", () => {
    it("should render a labelled search input", () => {
      const { $ } = renderList();

      expect($("h2.govuk-heading-s").text()).toContain(en.searchCasesTitle);

      const input = $("input#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("name")).toBe("search");
      expect(input.attr("type")).toBe("text");
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);

      const label = $("label.govuk-visually-hidden[for='case-search-input']");
      expect(label).toHaveLength(1);
      expect(label.text()).toContain(en.searchCasesLabel);
    });
  });

  describe("Table structure", () => {
    it("should render the table with the correct id, role and aria-label", () => {
      const { $ } = renderList();

      const table = $("table#hearings-table");
      expect(table).toHaveLength(1);
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe(en.pageTitle);
    });

    it("should render all eight column headers with scope=col in order", () => {
      const { $ } = renderList();

      const headerCells = $("thead th[scope='col']");
      expect(headerCells).toHaveLength(8);

      const headers = headerCells.map((_, el) => $(el).text().trim()).get();
      expect(headers).toEqual([
        en.tableHeaders.hearingTime,
        en.tableHeaders.appellant,
        en.tableHeaders.representative,
        en.tableHeaders.appealReferenceNumber,
        en.tableHeaders.judges,
        en.tableHeaders.hearingType,
        en.tableHeaders.location,
        en.tableHeaders.additionalInformation
      ]);
    });
  });

  describe("Hearings rows", () => {
    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          hearingTime: "10:00am",
          appellant: "John Smith",
          representative: "ABC Solicitors",
          appealReferenceNumber: "IA/12345/2026",
          judges: "Judge A. Johnson",
          hearingType: "Remote - Video",
          location: "Field House",
          additionalInformation: "Interpreter required"
        })
      ]);

      const cells = rowCells($);
      expect(cells[COLUMN.hearingTime]).toBe("10:00am");
      expect(cells[COLUMN.appellant]).toBe("John Smith");
      expect(cells[COLUMN.representative]).toBe("ABC Solicitors");
      expect(cells[COLUMN.appealReferenceNumber]).toBe("IA/12345/2026");
      expect(cells[COLUMN.judges]).toBe("Judge A. Johnson");
      expect(cells[COLUMN.hearingType]).toBe("Remote - Video");
      expect(cells[COLUMN.location]).toBe("Field House");
      expect(cells[COLUMN.additionalInformation]).toBe("Interpreter required");
    });

    it("should render one row per hearing preserving order", () => {
      const { $ } = renderList([
        buildHearing({ appellant: "John Smith", appealReferenceNumber: "IA/12345/2026" }),
        buildHearing({ appellant: "Jane Doe", appealReferenceNumber: "IA/67890/2026" })
      ]);

      expect($("tbody.govuk-table__body tr")).toHaveLength(2);
      const appellants = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.appellant).text().trim())
        .get();
      expect(appellants).toEqual(["John Smith", "Jane Doe"]);
      const refs = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.appealReferenceNumber).text().trim())
        .get();
      expect(refs).toEqual(["IA/12345/2026", "IA/67890/2026"]);
    });

    it("should render empty representative and additional information cells when absent", () => {
      const { $ } = renderList([buildHearing({ appellant: "Jane Doe", representative: "", additionalInformation: "" })]);

      const cells = rowCells($);
      expect(cells[COLUMN.appellant]).toBe("Jane Doe");
      expect(cells[COLUMN.representative]).toBe("");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });

    it("should render multiple judges in the judges column", () => {
      const { $ } = renderList([buildHearing({ judges: "Judge B. Williams, Judge C. Brown" })]);

      expect(rowCells($)[COLUMN.judges]).toBe("Judge B. Williams, Judge C. Brown");
    });

    it("should render the different hearing types in the hearing type column", () => {
      const { $ } = renderList([
        buildHearing({ hearingType: "Remote - Video" }),
        buildHearing({ hearingType: "In person" }),
        buildHearing({ hearingType: "Remote - Telephone" })
      ]);

      const hearingTypes = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.hearingType).text().trim())
        .get();
      expect(hearingTypes).toEqual(["Remote - Video", "In person", "Remote - Telephone"]);
    });

    it("should render the different locations in the location column", () => {
      const { $ } = renderList([buildHearing({ location: "Field House" }), buildHearing({ location: "Taylor House" })]);

      const locations = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.location).text().trim())
        .get();
      expect(locations).toEqual(["Field House", "Taylor House"]);
    });

    it("should render the table with headers but no body rows when there are no hearings", () => {
      const { $ } = renderList([]);

      expect($("table.govuk-table")).toHaveLength(1);
      expect($("thead th[scope='col']")).toHaveLength(8);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });

    it("should render long appellant names and long additional information intact", () => {
      const { $ } = renderList([
        buildHearing({
          appellant: "Mr John Alexander Smith-Jones-Williams",
          additionalInformation: "Interpreter required for Spanish, requires wheelchair access, documents to be provided in large print format"
        })
      ]);

      const cells = rowCells($);
      expect(cells[COLUMN.appellant]).toBe("Mr John Alexander Smith-Jones-Williams");
      expect(cells[COLUMN.additionalInformation]).toContain("Interpreter required for Spanish");
      expect(cells[COLUMN.additionalInformation]).toContain("wheelchair access");
    });

    it("should render special characters in names using their decoded text", () => {
      const { $ } = renderList([buildHearing({ appellant: "O'Brien & Associates", representative: "Müller & Schmidt", judges: "Judge Nuñez" })]);

      const cells = rowCells($);
      expect(cells[COLUMN.appellant]).toBe("O'Brien & Associates");
      expect(cells[COLUMN.representative]).toBe("Müller & Schmidt");
      expect(cells[COLUMN.judges]).toBe("Judge Nuñez");
    });

    it("should render different time formats in the hearing time column", () => {
      const { $ } = renderList([buildHearing({ hearingTime: "9:30am" }), buildHearing({ hearingTime: "1:45pm" })]);

      const times = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.hearingTime).text().trim())
        .get();
      expect(times).toEqual(["9:30am", "1:45pm"]);
    });
  });

  describe("Footer section", () => {
    it("should render the data source and decode special characters in its value", () => {
      for (const source of ["Manual Upload", "P&I - Publication and Information", "SOAP API"]) {
        const footer = renderList([], { dataSource: source }).$("p.govuk-body-s");
        expect(footer.text()).toContain(en.dataSource);
        expect(footer.text()).toContain(source);
      }
    });

    it("should render a back-to-top link pointing to the heading anchor", () => {
      const { $ } = renderList();

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(en.backToTop);
    });
  });

  describe("Layout and accessibility", () => {
    it("should render the GOV.UK grid structure and heading hierarchy", () => {
      const { $ } = renderList();

      expect($(".govuk-grid-row .govuk-grid-column-full")).toHaveLength(1);
      expect($("h1")).toHaveLength(1);
      expect($("h2").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, table headers, labels and footer", () => {
      const { $ } = renderList([buildHearing()], { header: { listTitle: cy.pageTitle }, dataSource: "Lanlwytho â Llaw" }, cy);

      expect($("h1#top").text()).toContain(cy.pageTitle);
      expect($("details .govuk-details__summary-text").text()).toContain(cy.importantInformationTitle);
      expect($("h2.govuk-heading-s").text()).toContain(cy.searchCasesTitle);

      const headers = $("thead th[scope='col']")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(cy.tableHeaders.hearingTime);
      expect(headers).toContain(cy.tableHeaders.appellant);
      expect(headers).toContain(cy.tableHeaders.additionalInformation);

      expect($("input#case-search-input").attr("aria-label")).toBe(cy.searchCasesLabel);
      expect($("p.govuk-body-s").text()).toContain(cy.dataSource);
      expect($(".back-to-top a").text()).toContain(cy.backToTop);
    });
  });
});
