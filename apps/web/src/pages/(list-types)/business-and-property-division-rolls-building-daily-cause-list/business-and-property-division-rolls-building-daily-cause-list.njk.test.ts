import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  businessAndPropertyDivisionRollsBuildingDailyCauseListCy as cy,
  businessAndPropertyDivisionRollsBuildingDailyCauseListEn as en,
  SECTIONS
} from "@hmcts/business-and-property-division-rolls-building-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "business-and-property-division-rolls-building-daily-cause-list.njk";

function buildHearing(overrides: Record<string, unknown> = {}) {
  return {
    judge: "Mr Justice Smith",
    time: "10:00am",
    venue: "Court 1",
    type: "Trial",
    caseNumber: "CR-2026-000123",
    caseName: "Acme v Widgets",
    additionalInformation: "Remote hearing",
    ...overrides
  };
}

function buildSections(locale: typeof en | typeof cy, populatedKeys: Record<string, unknown[]> = {}) {
  return SECTIONS.map((section) => ({
    key: section.key,
    title: locale === cy ? section.cy : section.en,
    hearings: populatedKeys[section.key] ?? []
  }));
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    header: {
      listTitle: locale === cy ? cy.pageTitle : en.pageTitle,
      listDate: "15 January 2026",
      lastUpdatedDate: "14 January 2026",
      lastUpdatedTime: "12:00pm"
    },
    dataSource: "Manual Upload"
  };
}

function renderList({ populated = {}, locale = en }: { populated?: Record<string, unknown[]>; locale?: typeof en | typeof cy } = {}) {
  return render(env, TEMPLATE, { ...baseData(locale), sections: buildSections(locale, populated) });
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("Business and Property Division Rolls Building template", () => {
  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have the same table header keys in English and Welsh", () => {
      expect(Object.keys(en.tableHeaders).sort()).toEqual(Object.keys(cy.tableHeaders).sort());
    });

    it("should use an https FACT link URL", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Page header and open justice", () => {
    it("should render the title as an h1 with the top anchor", () => {
      const { $ } = renderList();
      expect($("h1#top").text()).toContain(en.pageTitle);
    });

    it("should render the FACT link", () => {
      const { $ } = renderList();
      const link = $(`a[href="${en.factLinkUrl}"]`);
      expect(link).toHaveLength(1);
      expect(link.text()).toContain(en.factLinkText);
    });

    it("should render the important information block with the remote hearings and judgments content", () => {
      const { $ } = renderList();
      const importantInfo = $("#open-justice");
      expect(importantInfo.is("details.govuk-details")).toBe(true);
      expect(importantInfo.find(".govuk-details__summary-text").text()).toContain(en.importantInformationTitle);
      expect(importantInfo.text()).toContain(en.remoteHearingsTitle);
      expect(importantInfo.text()).toContain(en.remoteJudgmentsTitle);
    });

    it("should render each contact with a bold role and the email below it", () => {
      const { $ } = renderList();
      const importantInfo = $("#open-justice");
      for (const contact of en.contacts) {
        const role = importantInfo.find("strong").filter((_, el) => $(el).text().trim() === `${contact.role}:`);
        expect(role).toHaveLength(1);
        expect($(`a[href="mailto:${contact.email}"]`)).toHaveLength(1);
      }
    });
  });

  describe("Sections", () => {
    it("should render all 16 section headings in order", () => {
      const { $ } = renderList();
      const headings = $(".hearings-section h2")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headings).toEqual(SECTIONS.map((s) => s.en));
    });

    it("should render a table for a populated section and place fields in the correct columns", () => {
      const { $ } = renderList({ populated: { appealList: [buildHearing()] } });
      const cells = $("#section-appealList tbody tr")
        .first()
        .find("td")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(cells).toEqual(["Mr Justice Smith", "10:00am", "Court 1", "Trial", "CR-2026-000123", "Acme v Widgets", "Remote hearing"]);
    });

    it("should show the no hearings message for empty sections", () => {
      const { $ } = renderList({ populated: { appealList: [buildHearing()] } });
      expect($("#section-appealList table")).toHaveLength(1);
      expect($("#section-businessList table")).toHaveLength(0);
      expect($("#section-businessList p.govuk-body").text()).toContain(en.noHearingsMessage);
    });

    it("should render a visible divider after an empty section but not a populated one", () => {
      const { $ } = renderList({ populated: { appealList: [buildHearing()] } });
      expect($("#section-businessList hr.govuk-section-break--visible")).toHaveLength(1);
      expect($("#section-appealList hr.govuk-section-break--visible")).toHaveLength(0);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh section headings and open justice titles", () => {
      const { $ } = renderList({ locale: cy });
      const headings = $(".hearings-section h2")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headings).toEqual(SECTIONS.map((s) => s.cy));
      expect($("#open-justice").text()).toContain(cy.remoteHearingsTitle);
    });
  });

  describe("Accessibility", () => {
    it("should render the GOV.UK grid and a single h1", () => {
      const { $ } = renderList();
      expect($(".govuk-grid-row")).toHaveLength(1);
      expect($("h1")).toHaveLength(1);
    });

    it("should render a labelled search input", () => {
      const { $ } = renderList();
      const label = $("label.govuk-visually-hidden");
      expect(label.attr("for")).toBe("case-search-input");
      expect($("#case-search-input")).toHaveLength(1);
    });

    it("should render tables with role and aria-label when populated", () => {
      const { $ } = renderList({ populated: { appealList: [buildHearing()] } });
      const table = $("#section-appealList table[role='table']");
      expect(table.attr("aria-label")).toBe("Appeal List");
    });
  });
});
