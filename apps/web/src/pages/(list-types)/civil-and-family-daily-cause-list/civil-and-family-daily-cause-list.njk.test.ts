import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { civilAndFamilyDailyCauseListCy as cy, civilAndFamilyDailyCauseListEn as en } from "@hmcts/civil-and-family-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "civil-and-family-daily-cause-list.njk";

interface CaseOverrides {
  caseNumber?: string;
  caseName?: string;
  caseSequenceIndicator?: string;
  caseType?: string;
  applicant?: string;
  applicantRepresentative?: string;
  respondent?: string;
  respondentRepresentative?: string;
  formattedReportingRestriction?: string;
}

interface SittingOverrides {
  time?: string;
  durationAsHours?: number;
  durationAsMinutes?: number;
  caseHearingChannel?: string;
  hearingType?: string;
  cases?: ReturnType<typeof buildCase>[];
}

// Fixture builders — each layer defaults to a realistic minimal shape and only
// the varied leaf fields are passed per test, keeping the deep artefact tree
// (courtLists → courtHouse → courtRoom → session → sitting → hearing → case)
// out of individual tests.
function buildCase(overrides: CaseOverrides = {}) {
  return {
    caseNumber: "T123",
    caseName: "Test v Test",
    caseType: "Civil",
    applicant: "",
    respondent: "",
    ...overrides
  };
}

function buildSitting({
  time = "10:00am",
  durationAsHours = 1,
  durationAsMinutes = 0,
  caseHearingChannel = "In person",
  hearingType = "Trial",
  cases
}: SittingOverrides = {}) {
  return {
    time,
    durationAsHours,
    durationAsMinutes,
    caseHearingChannel,
    hearing: [{ hearingType, case: cases ?? [buildCase()] }]
  };
}

function buildSession({
  courtRoomName = "Court 1",
  formattedJudiciaries = "",
  sittings
}: {
  courtRoomName?: string;
  formattedJudiciaries?: string;
  sittings?: unknown[];
} = {}) {
  return {
    courtRoomName,
    session: [{ formattedJudiciaries, sittings: sittings ?? [buildSitting()] }]
  };
}

function buildCourtHouse({
  courtHouseName = "Test Court",
  courtHouseAddress = { line: ["Test Address"], postCode: "TC1 1AA" },
  courtRoom = [buildSession()]
}: {
  courtHouseName?: string;
  courtHouseAddress?: Record<string, unknown> | null;
  courtRoom?: unknown[];
} = {}) {
  const courtHouse: Record<string, unknown> = { courtHouseName, courtRoom };
  if (courtHouseAddress) {
    courtHouse.courtHouseAddress = courtHouseAddress;
  }
  return { courtHouse };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    header: {
      locationName: "Test Court",
      addressLines: ["123 Test Street", "Test City", "TC1 1AA"],
      contentDate: "10 July 2026",
      lastUpdated: "10 July 2026 at 9:00am"
    },
    openJustice: {
      venueName: "Test Venue",
      email: "test@example.com",
      phone: "01234 567890"
    },
    dataSource: "Test Source"
  };
}

function renderList(courtLists: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, listData: { courtLists } });
}

// The rendered hearings table columns, in order.
const COLUMN = { time: 0, caseRef: 1, caseName: 2, caseType: 3, hearingType: 4, location: 5, duration: 6, applicant: 7, respondent: 8 } as const;

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

describe("civil-and-family-daily-cause-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should use https URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.openJusticeLink).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.openJusticeLink).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the heading with the page title and location name", () => {
      const { $ } = renderList([]);

      const heading = $("h2.govuk-heading-l").first().text();
      expect(heading).toContain(en.pageTitle);
      expect(heading).toContain("Test Court");
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
    });

    it("should render the open justice link and search cases input", () => {
      const { $ } = renderList([]);

      expect($(`a[href="${en.openJusticeLink}"]`)).toHaveLength(1);
      expect($("h2.govuk-heading-m").text()).toContain(en.searchCases);
      expect($("#case-search-input")).toHaveLength(1);
    });

    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Civil Data Platform" });

      const footer = $("p.govuk-body").last().text();
      expect(footer).toContain(en.dataSource);
      expect(footer).toContain("Civil Data Platform");
    });
  });

  describe("Court house address variations", () => {
    it("should render court house name and full address", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtHouseName: "Main Court House",
          courtHouseAddress: { line: ["1 Court Street", "Building B"], town: "London", county: "Greater London", postCode: "SW1A 1AA" },
          courtRoom: []
        })
      ]);

      const container = $("#court-lists-container").text();
      expect($("#court-lists-container h2.govuk-heading-l").text()).toContain("Main Court House");
      for (const value of ["1 Court Street", "Building B", "London", "Greater London", "SW1A 1AA"]) {
        expect(container).toContain(value);
      }
    });

    it("should render partial address without the omitted county", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtHouseName: "Branch Court",
          courtHouseAddress: { line: ["2 Branch Road"], town: "Manchester", postCode: "M1 1AA" },
          courtRoom: []
        })
      ]);

      const container = $("#court-lists-container").text();
      expect(container).toContain("Branch Court");
      expect(container).toContain("2 Branch Road");
      expect(container).toContain("Manchester");
      expect(container).toContain("M1 1AA");
      expect(container).not.toContain("Greater London");
    });

    it("should skip empty address lines", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtHouseName: "Simple Court",
          courtHouseAddress: { line: ["", "Valid Line", ""], postCode: "AB1 2CD" },
          courtRoom: []
        })
      ]);

      const addressParagraphs = $("#court-lists-container > div p.govuk-body")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(addressParagraphs).toContain("Valid Line");
      expect(addressParagraphs).toContain("AB1 2CD");
      expect(addressParagraphs).not.toContain("");
    });

    it("should not render the court house block when the address is missing", () => {
      const { $ } = renderList([buildCourtHouse({ courtHouseName: "Address-less Court", courtHouseAddress: null, courtRoom: [] })]);

      expect($("#court-lists-container h2.govuk-heading-l")).toHaveLength(0);
      expect($("#court-lists-container").text()).not.toContain("Address-less Court");
    });
  });

  describe("Session judiciary variations", () => {
    it("should include the judiciary in the section heading when present", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildSession({ courtRoomName: "Court 1", formattedJudiciaries: "Judge Smith" })] })]);

      const heading = $(".govuk-accordion__section-button").text().replace(/\s+/g, " ").trim();
      expect(heading).toBe(`Court 1, ${en.beforeJudge}: Judge Smith`);
    });

    it("should render only the court room name when no judiciary is provided", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildSession({ courtRoomName: "Court 2", formattedJudiciaries: "" })] })]);

      const heading = $(".govuk-accordion__section-button").text().replace(/\s+/g, " ").trim();
      expect(heading).toBe("Court 2");
      expect(heading).not.toContain(en.beforeJudge);
    });
  });

  describe("Hearings table", () => {
    it("should render the table headers in order", () => {
      const { $ } = renderList([buildCourtHouse()]);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([en.time, en.caseRef, en.caseName, en.caseType, en.hearingType, en.location, en.duration, en.applicant, en.respondent]);
    });

    it("should place each case field in its correct column", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({
                  time: "10:00am",
                  caseHearingChannel: "In person",
                  hearingType: "Trial",
                  cases: [buildCase({ caseNumber: "T123", caseName: "Smith v Jones", caseType: "Civil" })]
                })
              ]
            })
          ]
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.caseRef]).toBe("T123");
      expect(cells[COLUMN.caseName]).toBe("Smith v Jones");
      expect(cells[COLUMN.caseType]).toBe("Civil");
      expect(cells[COLUMN.hearingType]).toBe("Trial");
      expect(cells[COLUMN.location]).toBe("In person");
    });

    it("should render a row per case across multiple hearings and cases", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                {
                  time: "10:00am",
                  durationAsHours: 1,
                  durationAsMinutes: 0,
                  caseHearingChannel: "In person",
                  hearing: [
                    {
                      hearingType: "Trial",
                      case: [buildCase({ caseNumber: "T123", caseName: "Case One" }), buildCase({ caseNumber: "T124", caseName: "Case Two" })]
                    },
                    { hearingType: "Mention", case: [buildCase({ caseNumber: "M456", caseName: "Case Three" })] }
                  ]
                }
              ]
            })
          ]
        })
      ]);

      const caseRefs = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseRef).text().trim())
        .get();
      expect(caseRefs).toEqual(["T123", "T124", "M456"]);
    });
  });

  describe("Duration variations", () => {
    function durationCell(durationAsHours: number, durationAsMinutes: number) {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildSession({ sittings: [buildSitting({ durationAsHours, durationAsMinutes })] })] })]);
      return firstDataRowCells($)[COLUMN.duration];
    }

    it("should render hours only (plural)", () => {
      expect(durationCell(2, 0)).toBe("2 hours");
    });

    it("should render hour only (singular)", () => {
      expect(durationCell(1, 0)).toBe("1 hour");
    });

    it("should render minutes only (plural)", () => {
      expect(durationCell(0, 30)).toBe("30 mins");
    });

    it("should render minute only (singular)", () => {
      expect(durationCell(0, 1)).toBe("1 min");
    });

    it("should render hours and minutes", () => {
      expect(durationCell(2, 45)).toBe("2 hours 45 mins");
    });
  });

  describe("Case variations", () => {
    it("should append the sequence indicator to the case name when present", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [buildSession({ sittings: [buildSitting({ cases: [buildCase({ caseName: "Smith v Jones", caseSequenceIndicator: "2 of 3" })] })] })]
        })
      ]);

      expect(firstDataRowCells($)[COLUMN.caseName]).toBe("Smith v Jones [2 of 3]");
    });

    it("should render the case name without brackets when no sequence indicator", () => {
      const { $ } = renderList([
        buildCourtHouse({ courtRoom: [buildSession({ sittings: [buildSitting({ cases: [buildCase({ caseName: "Brown v White" })] })] })] })
      ]);

      expect(firstDataRowCells($)[COLUMN.caseName]).toBe("Brown v White");
    });

    it("should render applicant with legal advisor", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({ sittings: [buildSitting({ cases: [buildCase({ applicant: "John Green", applicantRepresentative: "Smith & Co Solicitors" })] })] })
          ]
        })
      ]);

      const applicantCell = firstDataRowCells($)[COLUMN.applicant].replace(/\s+/g, " ");
      expect(applicantCell).toBe(`John Green, ${en.legalAdvisor}: Smith & Co Solicitors`);
    });

    it("should render respondent with legal advisor", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({ sittings: [buildSitting({ cases: [buildCase({ respondent: "Mary Blue", respondentRepresentative: "Jones Legal LLP" })] })] })
          ]
        })
      ]);

      const respondentCell = firstDataRowCells($)[COLUMN.respondent].replace(/\s+/g, " ");
      expect(respondentCell).toBe(`Mary Blue, ${en.legalAdvisor}: Jones Legal LLP`);
    });

    it("should leave the party cells empty when there are no parties", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [buildSession({ sittings: [buildSitting({ cases: [buildCase({ caseName: "Orange v Purple", applicant: "", respondent: "" })] })] })]
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.caseName]).toBe("Orange v Purple");
      expect(cells[COLUMN.applicant]).toBe("");
      expect(cells[COLUMN.respondent]).toBe("");
    });
  });

  describe("Reporting restriction row", () => {
    it("should render a restriction row spanning the table when a restriction is present", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({ cases: [buildCase({ caseName: "Restricted Case", formattedReportingRestriction: "Section 39 applies, Section 11 applies" })] })
              ]
            })
          ]
        })
      ]);

      const restrictionCell = $("tbody.govuk-table__body td[colspan]");
      expect(restrictionCell).toHaveLength(1);
      expect(restrictionCell.attr("colspan")).toBe("9");
      expect(restrictionCell.find("strong").text()).toContain(en.reportingRestrictions);
      expect(restrictionCell.text()).toContain("Section 39 applies, Section 11 applies");
    });

    it("should not render a restriction row when the restriction is empty", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [buildSession({ sittings: [buildSitting({ cases: [buildCase({ caseName: "Normal Case", formattedReportingRestriction: "" })] })] })]
        })
      ]);

      expect(firstDataRowCells($)[COLUMN.caseName]).toBe("Normal Case");
      expect($("tbody.govuk-table__body td[colspan]")).toHaveLength(0);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, table headers and labels", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildSession({ courtRoomName: "Court 1", formattedJudiciaries: "Barnwr Jones" })] })], {}, cy);

      expect($("h2.govuk-heading-l").first().text()).toContain(cy.pageTitle);
      expect($(".govuk-accordion__section-button").text()).toContain(cy.beforeJudge);
      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(cy.time);
      expect(headers).toContain(cy.applicant);
      expect(headers).toContain(cy.respondent);
    });
  });
});
