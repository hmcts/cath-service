import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  londonAdministrativeCourtDailyCauseListCy as cy,
  londonAdministrativeCourtDailyCauseListEn as en
} from "@hmcts/london-administrative-court-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "london-administrative-court-daily-cause-list.njk";

interface HearingOverrides {
  venue?: string;
  judge?: string;
  time?: string;
  caseNumber?: string;
  caseDetails?: string;
  hearingType?: string;
  additionalInformation?: string;
}

// Fixture builders — each test passes only the varied leaf fields; the rest of
// the flat view-model (header, both hearings arrays, dataSource) defaults here.
function buildHearing(overrides: HearingOverrides = {}) {
  return {
    venue: "Court 1",
    judge: "Mr Justice Smith",
    time: "10:00am",
    caseNumber: "CO/123/2026",
    caseDetails: "R (on the application of Jones) v Secretary of State",
    hearingType: "Judicial Review",
    additionalInformation: "Remote hearing",
    ...overrides
  };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    header: {
      listTitle: "London Administrative Court Daily Cause List",
      listDate: "15 January 2026",
      lastUpdatedDate: "14 January 2026",
      lastUpdatedTime: "12:00pm"
    },
    dataSource: "Manual Upload"
  };
}

function renderList({
  mainHearings = [],
  planningCourt = [],
  overrides = {},
  locale = en
}: {
  mainHearings?: unknown[];
  planningCourt?: unknown[];
  overrides?: Record<string, unknown>;
  locale?: typeof en | typeof cy;
} = {}) {
  return render(env, TEMPLATE, { ...baseData(locale), mainHearings, planningCourt, ...overrides });
}

// The rendered hearings-table columns, in order.
const COLUMN = { venue: 0, judge: 1, time: 2, caseNumber: 3, caseDetails: 4, hearingType: 5, additionalInformation: 6 } as const;

function firstRowCells($: CheerioAPI, container: string) {
  return $(`${container} tbody.govuk-table__body tr`)
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

describe("London Administrative Court Daily Cause List template", () => {
  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have the same table header keys in English and Welsh", () => {
      expect(Object.keys(en.tableHeaders).sort()).toEqual(Object.keys(cy.tableHeaders).sort());
    });

    it("should use an https FACT link URL", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the title as an h1 with the top anchor", () => {
      const { $ } = renderList();

      const heading = $("h1#top");
      expect(heading).toHaveLength(1);
      expect(heading.text()).toContain(baseData().header.listTitle);
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList();

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
      expect($(".govuk-body").text()).toContain(en.factAdditionalText);
    });

    it("should render the venue location lines", () => {
      const { $ } = renderList();

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(en.locationLine1);
      expect(bodyText).toContain(en.locationLine2);
      expect(bodyText).toContain(en.locationLine3);
    });

    it("should render the list date", () => {
      const { $ } = renderList();

      const listForLine = $(".govuk-body").filter((_, el) => $(el).text().includes(en.listFor));
      expect(listForLine.text()).toContain(baseData().header.listDate);
    });

    it("should render the last updated information", () => {
      const { $ } = renderList();

      const lastUpdatedLine = $(".govuk-body").filter((_, el) => $(el).text().includes(en.lastUpdated));
      const text = lastUpdatedLine.text();
      expect(text).toContain(baseData().header.lastUpdatedDate);
      expect(text).toContain(en.at);
      expect(text).toContain(baseData().header.lastUpdatedTime);
    });
  });

  describe("Important information section", () => {
    it("should render the details component open by default", () => {
      const { $ } = renderList();

      const details = $(".govuk-details");
      expect(details).toHaveLength(1);
      expect(details.attr("open")).toBeDefined();
    });

    it("should render the important information title and text", () => {
      const { $ } = renderList();

      const details = $(".govuk-details");
      expect(details.find(".govuk-details__summary-text").text()).toContain(en.importantInfoTitle);
      expect(details.text()).toContain(en.importantInfoText);
    });

    it("should render the judgments heading and text", () => {
      const { $ } = renderList();

      const details = $(".govuk-details");
      expect(details.find("h3").text()).toContain(en.judgmentsTitle);
      expect(details.text()).toContain(en.judgmentsText);
    });
  });

  describe("Search section", () => {
    it("should render the search title", () => {
      const { $ } = renderList();

      expect($(".search-container h2").text()).toContain(en.searchCasesTitle);
    });

    it("should render the search input with the expected attributes", () => {
      const { $ } = renderList();

      const input = $("#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("name")).toBe("search");
      expect(input.attr("type")).toBe("text");
      expect(input.attr("aria-label")).toBe(en.searchCasesLabel);
    });

    it("should render a visually hidden label bound to the search input", () => {
      const { $ } = renderList();

      const label = $("label.govuk-label.govuk-visually-hidden");
      expect(label).toHaveLength(1);
      expect(label.attr("for")).toBe("case-search-input");
      expect(label.text().trim()).toBe(en.searchCasesLabel);
    });
  });

  describe("Main hearings section", () => {
    it("should render the table with the correct role and aria-label when hearings exist", () => {
      const { $ } = renderList({ mainHearings: [buildHearing()] });

      const table = $("#main-hearings-section table[role='table']");
      expect(table).toHaveLength(1);
      expect(table.attr("aria-label")).toBe(en.mainHearingsTitle);
      expect($("#main-hearings-table-container")).toHaveLength(1);
    });

    it("should render all table headers with scope=col", () => {
      const { $ } = renderList({ mainHearings: [buildHearing()] });

      const headers = $("#main-hearings-section thead th[scope='col']")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        en.tableHeaders.venue,
        en.tableHeaders.judge,
        en.tableHeaders.time,
        en.tableHeaders.caseNumber,
        en.tableHeaders.caseDetails,
        en.tableHeaders.hearingType,
        en.tableHeaders.additionalInformation
      ]);
    });

    it("should place each hearing field in its correct column", () => {
      const hearing = buildHearing({
        venue: "Court 1",
        judge: "Mr Justice Smith",
        time: "10:00am",
        caseNumber: "CO/123/2026",
        caseDetails: "R (on the application of Jones) v Secretary of State",
        hearingType: "Judicial Review",
        additionalInformation: "Remote hearing"
      });
      const { $ } = renderList({ mainHearings: [hearing] });

      const cells = firstRowCells($, "#main-hearings-section");
      expect(cells[COLUMN.venue]).toBe("Court 1");
      expect(cells[COLUMN.judge]).toBe("Mr Justice Smith");
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.caseNumber]).toBe("CO/123/2026");
      expect(cells[COLUMN.caseDetails]).toBe("R (on the application of Jones) v Secretary of State");
      expect(cells[COLUMN.hearingType]).toBe("Judicial Review");
      expect(cells[COLUMN.additionalInformation]).toBe("Remote hearing");
    });

    it("should render a row per hearing across multiple hearings", () => {
      const { $ } = renderList({
        mainHearings: [buildHearing({ caseNumber: "CO/123/2026" }), buildHearing({ caseNumber: "CO/456/2026" })]
      });

      const caseNumbers = $("#main-hearings-section tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseNumber).text().trim())
        .get();
      expect(caseNumbers).toEqual(["CO/123/2026", "CO/456/2026"]);
    });

    it("should render an empty additional information cell without dropping other columns", () => {
      const { $ } = renderList({
        mainHearings: [buildHearing({ caseNumber: "CO/456/2026", additionalInformation: "" })]
      });

      const cells = firstRowCells($, "#main-hearings-section");
      expect(cells).toHaveLength(7);
      expect(cells[COLUMN.caseNumber]).toBe("CO/456/2026");
      expect(cells[COLUMN.additionalInformation]).toBe("");
    });

    it("should show the no hearings message and no table when main hearings are empty", () => {
      const { $ } = renderList({ mainHearings: [] });

      expect($("#main-hearings-table-container")).toHaveLength(0);
      expect($("#main-hearings-section")).toHaveLength(0);
      const messages = $(".hearings-section p.govuk-body").filter((_, el) => $(el).text().trim() === en.noHearingsMessage);
      expect(messages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Planning Court section", () => {
    it("should render the heading, section-divider class and id when hearings exist", () => {
      const { $ } = renderList({ planningCourt: [buildHearing()] });

      const section = $("#planning-court-section");
      expect(section).toHaveLength(1);
      expect(section.hasClass("section-divider")).toBe(true);
      expect(section.find("h2").text()).toContain(en.planningCourtTitle);
    });

    it("should render the table with the correct aria-label", () => {
      const { $ } = renderList({ planningCourt: [buildHearing()] });

      const table = $("#planning-court-section table[role='table']");
      expect(table).toHaveLength(1);
      expect(table.attr("aria-label")).toBe(en.planningCourtTitle);
      expect($("#planning-court-table-container")).toHaveLength(1);
    });

    it("should place a single planning hearing in its correct columns", () => {
      const hearing = buildHearing({
        venue: "Planning Court 1",
        judge: "Mr Justice Green",
        caseNumber: "PC/789/2026",
        caseDetails: "Developer Ltd v Planning Authority"
      });
      const { $ } = renderList({ planningCourt: [hearing] });

      const cells = firstRowCells($, "#planning-court-section");
      expect(cells[COLUMN.venue]).toBe("Planning Court 1");
      expect(cells[COLUMN.judge]).toBe("Mr Justice Green");
      expect(cells[COLUMN.caseNumber]).toBe("PC/789/2026");
      expect(cells[COLUMN.caseDetails]).toBe("Developer Ltd v Planning Authority");
    });

    it("should render a row per planning hearing across multiple hearings", () => {
      const { $ } = renderList({
        planningCourt: [buildHearing({ caseNumber: "PC/789/2026" }), buildHearing({ caseNumber: "PC/101/2026" })]
      });

      const caseNumbers = $("#planning-court-section tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseNumber).text().trim())
        .get();
      expect(caseNumbers).toEqual(["PC/789/2026", "PC/101/2026"]);
    });

    it("should render the heading and no hearings message with no table when empty", () => {
      const { $ } = renderList({ planningCourt: [] });

      expect($("#planning-court-section")).toHaveLength(0);
      const section = $(".hearings-section.section-divider");
      expect(section.find("h2").text()).toContain(en.planningCourtTitle);
      expect(section.find("table")).toHaveLength(0);
      expect(section.find("p.govuk-body").text()).toContain(en.noHearingsMessage);
    });
  });

  describe("Mixed sections", () => {
    it("should render both tables when both sections have hearings", () => {
      const { $ } = renderList({
        mainHearings: [buildHearing({ caseNumber: "CO/123/2026" })],
        planningCourt: [buildHearing({ caseNumber: "PC/789/2026" })]
      });

      expect($("#main-hearings-section table")).toHaveLength(1);
      expect($("#planning-court-section table")).toHaveLength(1);
      expect(firstRowCells($, "#main-hearings-section")[COLUMN.caseNumber]).toBe("CO/123/2026");
      expect(firstRowCells($, "#planning-court-section")[COLUMN.caseNumber]).toBe("PC/789/2026");
    });

    it("should render the main table and the planning no hearings message", () => {
      const { $ } = renderList({
        mainHearings: [buildHearing({ caseNumber: "CO/123/2026" })],
        planningCourt: []
      });

      expect($("#main-hearings-section table")).toHaveLength(1);
      expect(firstRowCells($, "#main-hearings-section")[COLUMN.caseNumber]).toBe("CO/123/2026");
      expect($("#planning-court-section")).toHaveLength(0);
      const planningSection = $(".hearings-section.section-divider");
      expect(planningSection.find("h2").text()).toContain(en.planningCourtTitle);
      expect(planningSection.find("p.govuk-body").text()).toContain(en.noHearingsMessage);
    });

    it("should render the main no hearings message and the planning table", () => {
      const { $ } = renderList({
        mainHearings: [],
        planningCourt: [buildHearing({ caseNumber: "PC/789/2026" })]
      });

      expect($("#main-hearings-section")).toHaveLength(0);
      const mainMessage = $(".hearings-section:not(.section-divider) p.govuk-body");
      expect(mainMessage.text()).toContain(en.noHearingsMessage);
      expect($("#planning-court-section table")).toHaveLength(1);
      expect(firstRowCells($, "#planning-court-section")[COLUMN.caseNumber]).toBe("PC/789/2026");
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList({ overrides: { dataSource: "Manual Upload" } });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("Manual Upload");
    });

    it("should render a back-to-top link", () => {
      const { $ } = renderList();

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(en.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, location, section titles and no hearings message", () => {
      const { $ } = renderList({
        overrides: {
          header: {
            listTitle: cy.pageTitle,
            listDate: "15 Ionawr 2026",
            lastUpdatedDate: "14 Ionawr 2026",
            lastUpdatedTime: "12:00pm"
          },
          dataSource: "Lanlwytho â Llaw"
        },
        locale: cy
      });

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(cy.listFor);
      expect(bodyText).toContain(cy.lastUpdated);
      expect(bodyText).toContain(cy.locationLine1);
      expect($(".search-container h2").text()).toContain(cy.searchCasesTitle);
      expect($(".hearings-section.section-divider h2").text()).toContain(cy.planningCourtTitle);
      expect($(".hearings-section p.govuk-body").text()).toContain(cy.noHearingsMessage);
      expect($("p.govuk-body-s").text()).toContain(cy.dataSource);
      expect($(".back-to-top a").text()).toContain(cy.backToTop);
    });

    it("should render Welsh table headers", () => {
      const { $ } = renderList({
        mainHearings: [buildHearing({ venue: "Llys 1", judge: "Mr Ustus Smith", caseDetails: "Achos prawf", hearingType: "Adolygiad Barnwrol" })],
        overrides: {
          header: { listTitle: cy.pageTitle, listDate: "15 Ionawr 2026", lastUpdatedDate: "14 Ionawr 2026", lastUpdatedTime: "12:00pm" },
          dataSource: "Lanlwytho â Llaw"
        },
        locale: cy
      });

      const headers = $("#main-hearings-section thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        cy.tableHeaders.venue,
        cy.tableHeaders.judge,
        cy.tableHeaders.time,
        cy.tableHeaders.caseNumber,
        cy.tableHeaders.caseDetails,
        cy.tableHeaders.hearingType,
        cy.tableHeaders.additionalInformation
      ]);
    });
  });

  describe("Accessibility", () => {
    it("should render the GOV.UK grid structure", () => {
      const { $ } = renderList();

      expect($(".govuk-grid-row")).toHaveLength(1);
      expect($(".govuk-grid-column-full")).toHaveLength(1);
    });

    it("should render a logical heading hierarchy", () => {
      const { $ } = renderList({ mainHearings: [buildHearing()] });

      expect($("h1")).toHaveLength(1);
      expect($("h2").length).toBeGreaterThanOrEqual(1);
      expect($("h3").length).toBeGreaterThanOrEqual(1);
    });

    it("should render semantic table structure with aria labels when hearings exist", () => {
      const { $ } = renderList({ mainHearings: [buildHearing()], planningCourt: [buildHearing()] });

      const tables = $("table[role='table'][aria-label]");
      expect(tables).toHaveLength(2);
      expect($("thead").length).toBeGreaterThanOrEqual(1);
      expect($("tbody").length).toBeGreaterThanOrEqual(1);
      expect($("th").length).toBeGreaterThanOrEqual(7);
      expect($("td").length).toBeGreaterThanOrEqual(7);
    });

    it("should render semantic form elements", () => {
      const { $ } = renderList();

      expect($("label")).toHaveLength(1);
      expect($("input#case-search-input")).toHaveLength(1);
      expect($("details")).toHaveLength(1);
    });
  });
});
