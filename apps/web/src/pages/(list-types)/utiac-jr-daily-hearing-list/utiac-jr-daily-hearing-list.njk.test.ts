import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import { utiacJrDailyHearingListCy as cy, utiacJrDailyHearingListEn as en } from "@hmcts/utiac-jr-daily-hearing-list";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "utiac-jr-daily-hearing-list.njk";

interface HearingOverrides {
  venue?: string;
  judges?: string;
  hearingTime?: string;
  caseReferenceNumber?: string;
  caseTitle?: string;
  hearingType?: string;
  additionalInformation?: string;
}

// Fixture builders — each test passes only the varied leaf fields; the flat
// hearing/header shape is defaulted to a realistic minimal record here.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    venue: "Leeds Combined Court Centre",
    judges: "Upper Tribunal Judge Smith",
    hearingTime: "10:00",
    caseReferenceNumber: "JR/12345/2026",
    caseTitle: "Appellant v Respondent",
    hearingType: "Case Management Review Hearing",
    additionalInformation: "Video hearing",
    ...overrides
  };
}

function buildHeader(overrides: Record<string, unknown> = {}) {
  return {
    listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List",
    listForDate: "15 January 2026",
    lastUpdatedDate: "15 January 2026",
    lastUpdatedTime: "09:30am",
    ...overrides
  };
}

function renderList(hearings: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, {
    t: locale,
    header: buildHeader(),
    hearings,
    dataSource: "Manual Upload",
    ...overrides
  });
}

// The rendered hearings table columns, in order.
const COLUMN = { venue: 0, judges: 1, hearingTime: 2, caseReferenceNumber: 3, caseTitle: 4, hearingType: 5, additionalInformation: 6 } as const;

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

describe("utiac-jr-daily-hearing-list template", () => {
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

    it("should use https link URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.importantInformationLinkUrl).toMatch(/^https:\/\//);
      expect(cy.importantInformationLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the list title as the top heading and table aria-label", () => {
      const { $ } = renderList([buildHearing()]);

      expect($("h1#top").text()).toContain(buildHeader().listTitle);
      const table = $("table#hearings-table");
      expect(table.attr("role")).toBe("table");
      expect(table.attr("aria-label")).toBe(buildHeader().listTitle);
    });

    it("should render the FACT link with the configured text, URL and additional text", () => {
      const { $ } = renderList([buildHearing()]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
      expect(factLink.parent().text()).toContain(en.factAdditionalText);
    });

    it("should render the list-for date and last-updated date and time", () => {
      const { $ } = renderList([buildHearing()], {
        header: buildHeader({ listForDate: "20 March 2026", lastUpdatedDate: "20 March 2026", lastUpdatedTime: "08:15am" })
      });

      const listForLine = $("p.govuk-\\!-font-weight-bold").filter((_, el) => $(el).text().includes(en.listForDate));
      expect(listForLine.text()).toContain("20 March 2026");

      const lastUpdatedLine = $(".govuk-body").filter((_, el) => $(el).text().includes(en.lastUpdated));
      expect(lastUpdatedLine.text()).toContain("20 March 2026");
      expect(lastUpdatedLine.text()).toContain("08:15am");
      expect(lastUpdatedLine.text()).toContain(en.at);
    });
  });

  describe("Important information section", () => {
    it("should render an open details component with the title, text and guidance link", () => {
      const { $ } = renderList([buildHearing()]);

      const details = $("details.govuk-details");
      expect(details.is("[open]")).toBe(true);
      expect(details.find(".govuk-details__summary-text").text()).toContain(en.importantInformationTitle);
      expect(details.find(".govuk-details__text").text()).toContain(en.importantInformationText);

      const link = details.find(`a[href="${en.importantInformationLinkUrl}"]`);
      expect(link).toHaveLength(1);
      expect(link.text()).toContain(en.importantInformationLinkText);
    });
  });

  describe("Search functionality", () => {
    it("should render a search input with a visually hidden label and aria-label", () => {
      const { $ } = renderList([buildHearing()]);

      const input = $("input#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("name")).toBe("search");
      expect(input.attr("type")).toBe("text");
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);

      const label = $("label[for='case-search-input']");
      expect(label.hasClass("govuk-visually-hidden")).toBe(true);
      expect(label.text().trim()).toBe(en.searchCasesLabel);
    });
  });

  describe("Hearings table", () => {
    it("should render every table header in column order", () => {
      const { $ } = renderList([buildHearing()]);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        en.tableHeaders.venue,
        en.tableHeaders.judges,
        en.tableHeaders.hearingTime,
        en.tableHeaders.caseReferenceNumber,
        en.tableHeaders.caseTitle,
        en.tableHeaders.hearingType,
        en.tableHeaders.additionalInformation
      ]);
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderList([
        buildHearing({
          venue: "Leeds Combined Court Centre",
          judges: "Upper Tribunal Judge Smith",
          hearingTime: "10:00",
          caseReferenceNumber: "JR/12345/2026",
          caseTitle: "Appellant v Respondent",
          hearingType: "Case Management Review Hearing",
          additionalInformation: "Video hearing"
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.venue]).toBe("Leeds Combined Court Centre");
      expect(cells[COLUMN.judges]).toBe("Upper Tribunal Judge Smith");
      expect(cells[COLUMN.hearingTime]).toBe("10:00");
      expect(cells[COLUMN.caseReferenceNumber]).toBe("JR/12345/2026");
      expect(cells[COLUMN.caseTitle]).toBe("Appellant v Respondent");
      expect(cells[COLUMN.hearingType]).toBe("Case Management Review Hearing");
      expect(cells[COLUMN.additionalInformation]).toBe("Video hearing");
    });

    it("should render empty cells for empty judges and additional information fields", () => {
      const { $ } = renderList([buildHearing({ caseReferenceNumber: "JR/67890/2026", caseTitle: "Case Title", judges: "", additionalInformation: "" })]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.caseReferenceNumber]).toBe("JR/67890/2026");
      expect(cells[COLUMN.caseTitle]).toBe("Case Title");
      expect(cells[COLUMN.judges]).toBe("");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });

    it("should render one body row per hearing", () => {
      const { $ } = renderList([buildHearing({ caseReferenceNumber: "JR/12345/2026" }), buildHearing({ caseReferenceNumber: "JR/67890/2026" })]);

      const caseRefs = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseReferenceNumber).text().trim())
        .get();
      expect(caseRefs).toEqual(["JR/12345/2026", "JR/67890/2026"]);
    });

    it("should render no body rows when the hearings array is empty", () => {
      const { $ } = renderList([]);

      expect($("h1#top").text()).toContain(buildHeader().listTitle);
      expect($("table#hearings-table")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([buildHearing()], { dataSource: "Court and Tribunal Hearings Service (CTHS)" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("Court and Tribunal Hearings Service (CTHS)");
    });

    it("should render each supplied data source value", () => {
      for (const source of ["Manual Upload", "Automated Import"]) {
        const { $ } = renderList([buildHearing()], { dataSource: source });
        expect($("p.govuk-body-s").text()).toContain(source);
      }
    });

    it("should render a back-to-top link", () => {
      const { $ } = renderList([buildHearing()]);

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(en.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, table headers and labels", () => {
      const { $ } = renderList([buildHearing()], {}, cy);

      expect($("thead th").first().text().trim()).toBe(cy.tableHeaders.venue);
      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(cy.tableHeaders.additionalInformation);
      expect($("details.govuk-details .govuk-details__summary-text").text()).toContain(cy.importantInformationTitle);
      expect($(".back-to-top a").text()).toContain(cy.backToTop);
      expect($("p.govuk-body-s").text()).toContain(cy.dataSource);
    });
  });
});
