import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { interimApplicationsChdDailyCauseListCy as cy, interimApplicationsChdDailyCauseListEn as en } from "@hmcts/interim-applications-chd-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "interim-applications-chd-daily-cause-list.njk";

interface HearingOverrides {
  judge?: string;
  time?: string;
  venue?: string;
  type?: string;
  caseNumber?: string;
  caseName?: string;
  additionalInformation?: string;
}

function buildHearing(overrides: HearingOverrides = {}) {
  return {
    judge: "Judge A",
    time: "10.30am",
    venue: "Venue A",
    type: "Type A",
    caseNumber: "1234",
    caseName: "Case name A",
    additionalInformation: "This is additional information",
    ...overrides
  };
}

function buildHeader(locale: typeof en | typeof cy = en) {
  return {
    listTitle: locale.pageTitle,
    listDate: "10 July 2026",
    lastUpdatedDate: "10 July 2026",
    lastUpdatedTime: "10:30am"
  };
}

function buildImportantInfo(locale: typeof en | typeof cy = en) {
  return {
    editableParagraph: `${locale.openJusticeMessage1}Judge OpenJusticeTest${locale.openJusticeSeparator}judge@justice.gov.uk${locale.openJusticeMessage2}`,
    staticParagraph: locale.openJusticeMessage3
  };
}

function renderPage(overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, {
    t: locale,
    en,
    cy,
    header: buildHeader(locale),
    hearings: [],
    importantInfo: buildImportantInfo(locale),
    dataSource: "Test Source",
    ...overrides
  });
}

const COLUMN = { judge: 0, time: 1, venue: 2, type: 3, caseNumber: 4, caseName: 5, additionalInformation: 6 } as const;

function tableByLabel($: CheerioAPI, label: string) {
  return $(`table[aria-label="${label}"]`);
}

function headerTexts($: CheerioAPI, label: string) {
  return tableByLabel($, label)
    .find("thead th")
    .map((_, el) => $(el).text().trim())
    .get();
}

function rowCells($: CheerioAPI, label: string, rowIndex = 0) {
  return tableByLabel($, label)
    .find("tbody tr")
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

describe("interim-applications-chd-daily-cause-list template", () => {
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
  });

  describe("Page header", () => {
    it("should render the list title in the h1 with the back-to-top anchor id", () => {
      const { $ } = renderPage();

      const heading = $("h1#top");
      expect(heading).toHaveLength(1);
      expect(heading.text()).toContain(en.pageTitle);
    });

    it("should render the FaCT link and venue address", () => {
      const { $ } = renderPage();

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);

      const bodyText = $(".govuk-grid-column-full").text();
      expect(bodyText).toContain(en.venueName);
      expect(bodyText).toContain(en.addressLine1);
      expect(bodyText).toContain(en.addressLine2);
    });

    it("should render the list date and last updated information", () => {
      const { $ } = renderPage();

      const bodyText = $(".govuk-grid-column-full").text();
      expect(bodyText).toContain(`${en.listFor} 10 July 2026`);
      expect(bodyText).toContain(`${en.lastUpdated} 10 July 2026 ${en.at} 10:30am`);
    });
  });

  describe("Important information section", () => {
    it("should render the editable paragraph with the judge name and email, plus the static paragraph", () => {
      const { $ } = renderPage();

      const details = $(".govuk-details");
      expect(details).toHaveLength(1);
      expect(details.find(".govuk-details__summary-text").text().trim()).toBe(en.importantInformationHeading);

      const detailsText = details.text();
      expect(detailsText).toContain("Judge OpenJusticeTest");
      expect(detailsText).toContain("judge@justice.gov.uk");
      expect(detailsText).toContain(en.openJusticeMessage3);
    });

    it("should render the static fallback wording when no judge details are supplied", () => {
      const { $ } = renderPage({
        importantInfo: { editableParagraph: en.openJusticeFallback, staticParagraph: en.openJusticeMessage3 }
      });

      const detailsText = $(".govuk-details").text();
      expect(detailsText).toContain(en.openJusticeFallback);
      expect(detailsText).toContain(en.openJusticeMessage3);
    });
  });

  describe("Search section", () => {
    it("should render the search input with a visually hidden label", () => {
      const { $ } = renderPage();

      expect($("h2.govuk-heading-s").text()).toContain(en.searchCasesTitle);

      const input = $("input#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);

      const label = $("label.govuk-label.govuk-visually-hidden");
      expect(label.attr("for")).toBe("case-search-input");
    });
  });

  describe("Hearings section", () => {
    it("should render the hearings table headers in order", () => {
      const { $ } = renderPage({ hearings: [buildHearing()] });

      expect(headerTexts($, en.pageTitle)).toEqual([
        en.tableHeaders.judge,
        en.tableHeaders.time,
        en.tableHeaders.venue,
        en.tableHeaders.type,
        en.tableHeaders.caseNumber,
        en.tableHeaders.caseName,
        en.tableHeaders.additionalInformation
      ]);
    });

    it("should place each hearing field in its correct column", () => {
      const { $ } = renderPage({ hearings: [buildHearing()] });

      const cells = rowCells($, en.pageTitle);
      expect(cells[COLUMN.judge]).toBe("Judge A");
      expect(cells[COLUMN.time]).toBe("10.30am");
      expect(cells[COLUMN.venue]).toBe("Venue A");
      expect(cells[COLUMN.type]).toBe("Type A");
      expect(cells[COLUMN.caseNumber]).toBe("1234");
      expect(cells[COLUMN.caseName]).toBe("Case name A");
      expect(cells[COLUMN.additionalInformation]).toBe("This is additional information");
    });

    it("should render the empty-state message and no table when there are no hearings", () => {
      const { $ } = renderPage({ hearings: [] });

      expect(tableByLabel($, en.pageTitle)).toHaveLength(0);
      expect($("#hearings-section")).toHaveLength(0);
      expect($(".govuk-grid-column-full").text()).toContain(en.noHearingsMessage);
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderPage({ dataSource: "HMCTS Publishing Service" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("HMCTS Publishing Service");
    });

    it("should render a back-to-top link pointing at the heading anchor", () => {
      const { $ } = renderPage();

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(en.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, table headers and important-info wording", () => {
      const { $ } = renderPage({ hearings: [buildHearing({ judge: "Barnwr A" })] }, cy);

      expect($("h1#top").text()).toContain(cy.pageTitle);
      expect($(".govuk-grid-column-full").text()).toContain(cy.venueName);
      expect($("h2.govuk-heading-s").text()).toContain(cy.searchCasesTitle);

      const headers = headerTexts($, cy.pageTitle);
      expect(headers).toContain(cy.tableHeaders.judge);
      expect(headers).toContain(cy.tableHeaders.time);

      expect($(".govuk-details").text()).toContain(cy.openJusticeMessage3);
      expect(rowCells($, cy.pageTitle)[COLUMN.judge]).toBe("Barnwr A");
      expect($(".back-to-top a").text()).toContain(cy.backToTop);
    });
  });
});
