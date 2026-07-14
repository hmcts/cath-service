import path from "node:path";
import { fileURLToPath } from "node:url";
import { crownWarnedListCy as cy, crownWarnedListEn as en } from "@hmcts/crown-warned-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import { moduleRoot as webCoreModuleRoot } from "@hmcts/web-core/config";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "crown-warned-list.njk";
const webCoreViews = path.join(webCoreModuleRoot, "views");

interface CaseOverrides {
  fixedFor?: string;
  caseNumber?: string;
  defendants?: string;
  prosecutingAuthority?: string;
  linkedCases?: string;
  listingNotes?: string;
  isInCustody?: boolean;
}

// Fixture builders — each test passes only the varied leaf fields; the full
// case / category / header tree stays out of the individual tests.
function buildCase(overrides: CaseOverrides = {}) {
  return {
    fixedFor: "15/01/2026",
    caseNumber: "T20267890",
    defendants: "John Smith",
    prosecutingAuthority: "Crown Prosecution Service",
    linkedCases: "",
    listingNotes: "",
    isInCustody: false,
    ...overrides
  };
}

function buildCategory({ category = "For Trial", cases = [buildCase()] }: { category?: string; cases?: unknown[] } = {}) {
  return { category, cases };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    header: {
      locationName: "Birmingham Crown Court",
      addressLines: ["The Priory Courts", "33 Bull Street", "Birmingham", "B4 6DS"],
      dateRange: "15 January 2026 to 19 January 2026",
      lastUpdated: "14 January 2026 at 12:00pm",
      weekCommencing: "13 January 2026",
      version: "1.0"
    },
    openJustice: { venueName: "Birmingham Crown Court", email: "", phone: "0121 681 3400" },
    dataSource: "CPP",
    groupedCategories: [] as unknown[]
  };
}

function renderList(groupedCategories: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, groupedCategories });
}

// Rendered case-table columns, in order.
const COLUMN = { fixedFor: 0, caseRef: 1, defendant: 2, prosecutor: 3, linkedCases: 4, listingNotes: 5 } as const;

function firstDataRowCells($: CheerioAPI) {
  return $("tbody.govuk-table__body tr")
    .first()
    .find("td")
    .map((_, el) => $(el).text().trim())
    .get();
}

function tableHeaders($: CheerioAPI) {
  return $("thead th")
    .map((_, el) => $(el).text().trim())
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("crown-warned-list template", () => {
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

      const heading = $("h1#page-heading").text();
      expect(heading).toContain(en.pageTitle);
      expect(heading).toContain("Birmingham Crown Court");
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
    });

    it("should render the date range and last-updated line", () => {
      const { $ } = renderList([]);

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain("15 January 2026 to 19 January 2026");
      expect(bodyText).toContain(en.lastUpdated);
      expect(bodyText).toContain("14 January 2026 at 12:00pm");
    });

    it("should render each header address line as its own paragraph", () => {
      const { $ } = renderList([], { header: { ...baseData().header, addressLines: ["Line 1", "Line 2", "Line 3", "B4 6DS"] } });

      const paragraphs = $("p.govuk-body")
        .map((_, el) => $(el).text().trim())
        .get();
      for (const line of ["Line 1", "Line 2", "Line 3", "B4 6DS"]) {
        expect(paragraphs).toContain(line);
      }
    });

    it("should render the version paragraph only when a version is provided", () => {
      const withVersion = renderList([], { header: { ...baseData().header, version: "1.0" } }).$;
      const versionLine = withVersion("p.govuk-body").filter((_, el) => withVersion(el).text().includes(en.version));
      expect(versionLine.text()).toContain("1.0");

      const withoutVersion = renderList([], { header: { ...baseData().header, version: "" } }).$;
      const emptyVersionLine = withoutVersion("p.govuk-body").filter((_, el) => withoutVersion(el).text().trim().startsWith(en.version));
      expect(emptyVersionLine).toHaveLength(0);
    });
  });

  describe("Pre-statement", () => {
    it("should render the week-commencing pre-statement when a week is provided", () => {
      const { $ } = renderList([], { header: { ...baseData().header, weekCommencing: "13 January 2026" } });

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(en.preStatementPrefix);
      expect(bodyText).toContain("13 January 2026");
      expect(bodyText).toContain(en.preStatementSuffix2);
      expect(bodyText).toContain(en.preStatementSuffix3);
      expect(bodyText).toContain(en.preStatementSuffix4);
    });

    it("should not render the pre-statement when weekCommencing is empty", () => {
      const { $ } = renderList([], { header: { ...baseData().header, weekCommencing: "" } });

      const preStatement = $("p.govuk-body").filter((_, el) => $(el).text().includes(en.preStatementPrefix));
      expect(preStatement).toHaveLength(0);
    });
  });

  describe("Reporting restrictions guidance", () => {
    it("should render the guidance section with title, warning, contacts and bullet list", () => {
      const { $ } = renderList([]);

      const section = $(".restriction-list-section");
      expect(section).toHaveLength(1);
      expect(section.find("h3").text()).toContain(en.reportingRestrictionsTitle);
      expect(section.find(".govuk-warning-text__text").text()).toContain(en.reportingRestrictionsWarning);

      const bullets = section
        .find("ul.govuk-list.govuk-list--bullet li")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(bullets).toContain(en.reportingRestrictionsContactCourt);
      expect(bullets).toContain(en.reportingRestrictionsContactHmcts);
    });
  });

  describe("Search", () => {
    it("should render the case search heading and text input", () => {
      const { $ } = renderList([]);

      expect($("h2").filter((_, el) => $(el).text().includes(en.searchCases))).toHaveLength(1);
      const input = $("input#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("type")).toBe("text");
    });
  });

  describe("Accordion and categories", () => {
    it("should render the accordion container with no sections when there are no categories", () => {
      const { $ } = renderList([]);

      const accordion = $("#accordion-warned-list.govuk-accordion");
      expect(accordion).toHaveLength(1);
      expect(accordion.attr("data-module")).toBe("govuk-accordion");
      expect($(".govuk-accordion__section")).toHaveLength(0);
    });

    it("should render an expanded section per category using the category name as heading", () => {
      const { $ } = renderList([buildCategory({ category: "For Trial", cases: [] }), buildCategory({ category: "For Sentence", cases: [] })]);

      const sectionHeadings = $(".govuk-accordion__section-button")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(sectionHeadings).toEqual(["For Trial", "For Sentence"]);
      expect($(".govuk-accordion__section--expanded")).toHaveLength(2);
    });

    it("should render the TO_BE_ALLOCATED category using the localised label", () => {
      const { $ } = renderList([buildCategory({ category: "TO_BE_ALLOCATED", cases: [] })]);

      const heading = $(".govuk-accordion__section-button").text().trim();
      expect(heading).toBe(en.toBeAllocated);
      expect(heading).not.toContain("TO_BE_ALLOCATED");
    });
  });

  describe("Case table", () => {
    it("should render the sortable table with all column headers", () => {
      const { $ } = renderList([buildCategory({ cases: [] })]);

      const table = $("table[data-module='moj-sortable-table']");
      expect(table).toHaveLength(1);
      expect($("th[aria-sort='none']")).toHaveLength(6);

      const headers = tableHeaders($);
      expect(headers).toContain(en.fixedFor);
      expect(headers).toContain(en.caseRef);
      expect(headers).toContain(en.defendant);
      expect(headers).toContain(en.prosecutingAuthority);
      expect(headers).toContain(en.linkedCases);
      expect(headers).toContain(en.listingNotes);
    });

    it("should place each case field in its correct column", () => {
      const { $ } = renderList([
        buildCategory({
          cases: [
            buildCase({
              fixedFor: "15/01/2026",
              caseNumber: "T20267890",
              defendants: "John Smith, Jane Doe",
              prosecutingAuthority: "Crown Prosecution Service",
              linkedCases: "T20267891, T20267892",
              listingNotes: "Trial estimate 3 days"
            })
          ]
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.fixedFor]).toBe("15/01/2026");
      expect(cells[COLUMN.caseRef]).toBe("T20267890");
      expect(cells[COLUMN.defendant]).toBe("John Smith, Jane Doe");
      expect(cells[COLUMN.prosecutor]).toBe("Crown Prosecution Service");
      expect(cells[COLUMN.linkedCases]).toBe("T20267891, T20267892");
      expect(cells[COLUMN.listingNotes]).toBe("Trial estimate 3 days");
    });

    it("should render the custody indicator in the defendant column only when in custody", () => {
      const inCustody = renderList([buildCategory({ cases: [buildCase({ defendants: "John Smith", isInCustody: true })] })]).$;
      const custodyCell = inCustody("tbody.govuk-table__body tr").first().find("td").eq(COLUMN.defendant);
      expect(custodyCell.find("span[aria-hidden='true']")).toHaveLength(1);
      expect(custodyCell.text().trim()).toBe("*John Smith");

      const notInCustody = renderList([buildCategory({ cases: [buildCase({ defendants: "John Smith", isInCustody: false })] })]).$;
      const plainCell = notInCustody("tbody.govuk-table__body tr").first().find("td").eq(COLUMN.defendant);
      expect(plainCell.find("span[aria-hidden='true']")).toHaveLength(0);
      expect(plainCell.text().trim()).toBe("John Smith");
    });

    it("should render a case row when optional fields are empty", () => {
      const { $ } = renderList([
        buildCategory({
          cases: [buildCase({ fixedFor: "", caseNumber: "T20267890", defendants: "", prosecutingAuthority: "", linkedCases: "", listingNotes: "" })]
        })
      ]);

      const cells = firstDataRowCells($);
      expect($("tbody.govuk-table__body tr")).toHaveLength(1);
      expect(cells[COLUMN.caseRef]).toBe("T20267890");
      expect(cells[COLUMN.defendant]).toBe("");
    });

    it("should render one row per case within a category", () => {
      const { $ } = renderList([
        buildCategory({
          cases: [
            buildCase({ caseNumber: "T20267890", defendants: "John Smith", isInCustody: false }),
            buildCase({ caseNumber: "T20267891", defendants: "Jane Doe", isInCustody: true }),
            buildCase({ caseNumber: "T20267892", defendants: "Bob Brown", listingNotes: "Linked to Smith trial" })
          ]
        })
      ]);

      const caseRefs = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseRef).text().trim())
        .get();
      expect(caseRefs).toEqual(["T20267890", "T20267891", "T20267892"]);

      const defendants = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.defendant).text().trim())
        .get();
      expect(defendants).toEqual(["John Smith", "*Jane Doe", "Bob Brown"]);
    });

    it("should render a table per category across multiple categories", () => {
      const { $ } = renderList([
        buildCategory({ category: "For Trial", cases: [buildCase({ caseNumber: "T20267890" })] }),
        buildCategory({ category: "For Sentence", cases: [buildCase({ caseNumber: "T20267891" })] })
      ]);

      expect($("table")).toHaveLength(2);
      const allRefs = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseRef).text().trim())
        .get();
      expect(allRefs).toEqual(["T20267890", "T20267891"]);
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Crown Data Platform" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("Crown Data Platform");
    });

    it("should render a back-to-top link", () => {
      const { $ } = renderList([]);

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop.text()).toContain(en.backToTop);
    });
  });

  describe("Custom styles", () => {
    it("should render the head style block with the custom selectors", () => {
      const { $ } = renderList([]);

      const styles = $("style").text();
      expect(styles).toContain("restriction-list-section");
      expect(styles).toContain("overflow-table");
      expect(styles).toContain("no-wrap");
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, table headers, labels and pre-statement", () => {
      const { $ } = renderList(
        [buildCategory({ category: "TO_BE_ALLOCATED", cases: [buildCase({ prosecutingAuthority: "Gwasanaeth Erlyn y Goron" })] })],
        {},
        cy
      );

      expect($("h1#page-heading").text()).toContain(cy.pageTitle);
      expect($(".govuk-body").text()).toContain(cy.lastUpdated);
      expect($(".govuk-body").text()).toContain(cy.preStatementPrefix);
      expect($("h2").filter((_, el) => $(el).text().includes(cy.searchCases))).toHaveLength(1);

      const headers = tableHeaders($);
      expect(headers).toContain(cy.fixedFor);
      expect(headers).toContain(cy.caseRef);
      expect(headers).toContain(cy.defendant);
      expect(headers).toContain(cy.prosecutingAuthority);
      expect(headers).toContain(cy.linkedCases);
      expect(headers).toContain(cy.listingNotes);

      expect($(".govuk-accordion__section-button").text().trim()).toBe(cy.toBeAllocated);
      expect($(".back-to-top a").text()).toContain(cy.backToTop);
    });
  });
});
