import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { magistratesPublicAdultCourtListCy as cy, magistratesPublicAdultCourtListEn as en } from "@hmcts/magistrates-public-adult-court-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "magistrates-public-adult-court-list.njk";

interface CaseOverrides {
  blockStartTime?: string;
  defendantName?: string;
  caseNumber?: string;
}

interface SessionOverrides {
  courtName?: string;
  courtRoom?: number | string;
  lja?: string;
  sessionStartTime?: string;
  cases?: unknown[];
}

// Layered fixture builders — each defaults to a realistic minimal shape so the
// session → case tree stays out of individual tests. `listData` is the flat
// ProcessedSession[] the renderer produces (sessions each holding their cases).
function buildCase(overrides: CaseOverrides = {}) {
  return {
    blockStartTime: "10:00",
    defendantName: "John Smith",
    caseNumber: "CASE123",
    ...overrides
  };
}

function buildSession(overrides: SessionOverrides = {}) {
  return {
    courtName: "Court 1",
    courtRoom: 2,
    lja: "Westminster",
    sessionStartTime: "09:30",
    cases: overrides.cases ?? [buildCase()],
    ...overrides
  };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    title: `${locale.heading} Westminster Magistrates Court`,
    header: {
      locationName: "Westminster Magistrates Court",
      contentDate: "15 January 2026",
      publishedDate: "14 January 2026",
      publishedTime: "12:00pm"
    },
    dataSource: "Manual Upload"
  };
}

function renderList(listData: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, listData });
}

// The rendered cases table columns, in order.
const COLUMN = { listingTime: 0, defendantName: 1, caseNumber: 2 } as const;

function firstDataRowCells($: CheerioAPI) {
  return $("tbody.govuk-table__body tr")
    .first()
    .find("td")
    .map((_, el) => $(el).text().trim())
    .get();
}

function dataRowsColumn($: CheerioAPI, col: number) {
  return $("tbody.govuk-table__body tr")
    .map((_, row) => $(row).find("td").eq(col).text().trim())
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("magistrates-public-adult-court-list template", () => {
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
    it("should render the heading with the supplied title", () => {
      const { $ } = renderList([]);

      expect($("h1.govuk-heading-l").text()).toContain(en.heading);
      expect($("h1.govuk-heading-l").text()).toContain("Westminster Magistrates Court");
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
    });

    it("should render the content date", () => {
      const { $ } = renderList([]);

      const listDate = $("p.govuk-body.govuk-\\!-font-weight-bold").first().text();
      expect(listDate).toContain(en.listDate);
      expect(listDate).toContain("15 January 2026");
    });

    it("should render the published date and time", () => {
      const { $ } = renderList([]);

      const publishedLine = $("p.govuk-body").filter((_, el) => $(el).text().includes(en.listUpdated));
      expect(publishedLine.text()).toContain("14 January 2026");
      expect(publishedLine.text()).toContain(en.at);
      expect(publishedLine.text()).toContain("12:00pm");
    });
  });

  describe("Restriction information section", () => {
    it("should render the restriction heading", () => {
      const { $ } = renderList([]);

      expect($(".restriction-list-section h3").text()).toContain(en.restrictionInformationHeading);
    });

    it("should render the warning text", () => {
      const { $ } = renderList([]);

      const warning = $(".restriction-list-section .govuk-warning-text__text");
      expect(warning).toHaveLength(1);
      expect(warning.text()).toContain(en.restrictionInformationBoldText);
    });

    it("should render the restriction information paragraphs", () => {
      const { $ } = renderList([]);

      const sectionText = $(".restriction-list-section").text();
      expect(sectionText).toContain(en.restrictionInformationP1);
      expect(sectionText).toContain(en.restrictionInformationP2);
      expect(sectionText).toContain(en.restrictionInformationP3);
      expect(sectionText).toContain(en.restrictionInformationP4);
    });

    it("should render the restriction bullet points", () => {
      const { $ } = renderList([]);

      const bullets = $(".restriction-list-section ul.govuk-list--bullet li")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(bullets).toEqual([en.restrictionBulletPoint1, en.restrictionBulletPoint2]);
    });
  });

  describe("Empty list data", () => {
    it("should render an accordion with no sections when there are no sessions", () => {
      const { $ } = renderList([]);

      expect($("#accordion-default")).toHaveLength(1);
      expect($(".govuk-accordion__section")).toHaveLength(0);
      expect($("table")).toHaveLength(0);
    });
  });

  describe("Session accordion", () => {
    it("should render the court name, court room, LJA and session start time", () => {
      const { $ } = renderList([buildSession({ courtName: "Court 5", courtRoom: 3, lja: "Central London", sessionStartTime: "09:00" })]);

      expect($(".govuk-accordion__section-button").text()).toContain("Court 5");
      const headerText = $(".govuk-accordion__section-header").text();
      expect(headerText).toContain(en.sittingAt);
      expect(headerText).toContain(en.courtRoom);
      expect(headerText).toContain("3");
      expect(headerText).toContain(en.lja);
      expect(headerText).toContain("Central London");
      expect(headerText).toContain(en.sessionStart);
      expect(headerText).toContain("09:00");
    });

    it("should render one accordion section and table per session", () => {
      const { $ } = renderList([
        buildSession({ courtName: "Court 1", cases: [buildCase({ defendantName: "Court One Case" })] }),
        buildSession({ courtName: "Court 2", cases: [buildCase({ defendantName: "Court Two Case" })] })
      ]);

      expect($(".govuk-accordion__section")).toHaveLength(2);
      expect($("table")).toHaveLength(2);
      const courtNames = $(".govuk-accordion__section-button")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(courtNames).toEqual(["Court 1", "Court 2"]);
    });
  });

  describe("Cases table", () => {
    it("should render the table headers in order", () => {
      const { $ } = renderList([buildSession()]);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([en.listingTime, en.defendantName, en.caseNumber]);
    });

    it("should place each case field in its correct column", () => {
      const { $ } = renderList([buildSession({ cases: [buildCase({ blockStartTime: "11:15", defendantName: "Jane Doe", caseNumber: "URN987" })] })]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.listingTime]).toBe("11:15");
      expect(cells[COLUMN.defendantName]).toBe("Jane Doe");
      expect(cells[COLUMN.caseNumber]).toBe("URN987");
    });

    it("should render a row per case within a session", () => {
      const { $ } = renderList([
        buildSession({
          cases: [
            buildCase({ defendantName: "First Defendant", caseNumber: "CASE001" }),
            buildCase({ defendantName: "Second Defendant", caseNumber: "CASE002" })
          ]
        })
      ]);

      expect(dataRowsColumn($, COLUMN.defendantName)).toEqual(["First Defendant", "Second Defendant"]);
      expect(dataRowsColumn($, COLUMN.caseNumber)).toEqual(["CASE001", "CASE002"]);
    });

    it("should render a session with no cases as a table with no data rows", () => {
      const { $ } = renderList([buildSession({ courtName: "Empty Court", cases: [] })]);

      expect($(".govuk-accordion__section-button").text()).toContain("Empty Court");
      expect($("table")).toHaveLength(1);
      expect($("tbody.govuk-table__body tr")).toHaveLength(0);
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Manual Upload" });

      const footer = $("p.govuk-body").filter((_, el) => $(el).text().includes(en.dataSource));
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("Manual Upload");
    });

    it("should render a back-to-top link", () => {
      const { $ } = renderList([]);

      const backToTop = $("a.back-to-top-link");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(en.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, labels and restriction information", () => {
      const { $ } = renderList([buildSession()], {}, cy);

      expect($("h1.govuk-heading-l").text()).toContain(cy.heading);
      expect($("p.govuk-body.govuk-\\!-font-weight-bold").first().text()).toContain(cy.listDate);
      const sectionText = $(".restriction-list-section").text();
      expect(sectionText).toContain(cy.restrictionInformationHeading);
      expect(sectionText).toContain(cy.restrictionInformationBoldText);
      expect($("a.back-to-top-link").text()).toContain(cy.backToTop);
    });

    it("should render Welsh table headers in order", () => {
      const { $ } = renderList([buildSession()], {}, cy);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([cy.listingTime, cy.defendantName, cy.caseNumber]);
    });
  });
});
