import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { civilDailyCauseListCy as cy, civilDailyCauseListEn as en } from "@hmcts/civil-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "civil-daily-cause-list.njk";

interface CaseOverrides {
  caseNumber?: string;
  caseName?: string;
  caseType?: string;
  caseSequenceIndicator?: string;
  formattedReportingRestriction?: string;
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
    ...overrides
  };
}

function buildSitting({
  time = "10:00am",
  durationAsHours = 1,
  durationAsMinutes = 0,
  caseHearingChannel = "In person",
  hearing
}: {
  time?: string;
  durationAsHours?: number;
  durationAsMinutes?: number;
  caseHearingChannel?: string;
  hearing?: unknown[];
} = {}) {
  return {
    time,
    durationAsHours,
    durationAsMinutes,
    caseHearingChannel,
    hearing: hearing ?? [{ hearingType: "Trial", case: [buildCase()] }]
  };
}

function buildCourtRoom({
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
  courtHouseAddress = { line: ["Test Address"], postCode: "TC1 1AA" } as Record<string, unknown> | undefined,
  courtRoom = [buildCourtRoom()]
}: {
  courtHouseName?: string;
  courtHouseAddress?: Record<string, unknown>;
  courtRoom?: unknown[];
} = {}) {
  return { courtHouse: { courtHouseName, courtHouseAddress, courtRoom } };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    header: {
      locationName: "Test Court",
      addressLines: ["123 Test Street", "Test City", "TC1 1AA"],
      contentDate: "13 July 2026",
      lastUpdated: "13 July 2026 at 9:00am"
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
const COLUMN = { time: 0, caseId: 1, caseName: 2, caseType: 3, hearingType: 4, location: 5, duration: 6 } as const;

function firstDataRowCells($: CheerioAPI) {
  return $("tbody.govuk-table__body tr")
    .first()
    .find("td")
    .map((_, el) => $(el).text().trim())
    .get();
}

function columnValues($: CheerioAPI, column: number) {
  return $("tbody.govuk-table__body tr")
    .filter((_, row) => $(row).find("td").length > 1)
    .map((_, row) => $(row).find("td").eq(column).text().trim())
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("civil-daily-cause-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should use https link URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.openJusticeLink).toMatch(/^https:\/\//);
      expect(cy.openJusticeLink).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the page title with the location name", () => {
      const { $ } = renderList([]);

      expect($("h2.govuk-heading-l").first().text()).toContain(en.pageTitle);
      expect($("h2.govuk-heading-l").first().text()).toContain("Test Court");
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
    });
  });

  describe("Court house details", () => {
    it("should render the court house name and full address lines", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtHouseName: "Main Court House",
          courtHouseAddress: { line: ["1 Court Street", "Building B"], town: "London", county: "Greater London", postCode: "SW1A 1AA" },
          courtRoom: []
        })
      ]);

      const block = $("#court-lists-container .govuk-\\!-margin-bottom-6");
      expect(block.find("h2.govuk-heading-l").text()).toContain("Main Court House");
      expect(
        block
          .find("p.govuk-body")
          .map((_, el) => $(el).text().trim())
          .get()
      ).toEqual(["1 Court Street", "Building B", "London", "Greater London", "SW1A 1AA"]);
    });

    it("should omit the county paragraph when a partial address is provided", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtHouseName: "Branch Court",
          courtHouseAddress: { line: ["2 Branch Road"], town: "Manchester", postCode: "M1 1AA" },
          courtRoom: []
        })
      ]);

      expect(
        $("#court-lists-container .govuk-\\!-margin-bottom-6 p.govuk-body")
          .map((_, el) => $(el).text().trim())
          .get()
      ).toEqual(["2 Branch Road", "Manchester", "M1 1AA"]);
    });

    it("should skip empty address lines", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtHouseName: "Simple Court",
          courtHouseAddress: { line: ["", "Valid Line", ""], postCode: "AB1 2CD" },
          courtRoom: []
        })
      ]);

      expect(
        $("#court-lists-container .govuk-\\!-margin-bottom-6 p.govuk-body")
          .map((_, el) => $(el).text().trim())
          .get()
      ).toEqual(["Valid Line", "AB1 2CD"]);
    });

    it("should not render a court house block when the address is missing", () => {
      const { $ } = renderList([{ courtHouse: { courtHouseName: "Address-less Court", courtRoom: [] } }]);

      expect($("#court-lists-container h2.govuk-heading-l")).toHaveLength(0);
      expect($("#court-lists-container").text()).not.toContain("Address-less Court");
    });

    it("should render one court house block per court house", () => {
      const { $ } = renderList([
        buildCourtHouse({ courtHouseName: "First Court House", courtHouseAddress: { line: ["1 First Street"], postCode: "F1 1AA" }, courtRoom: [] }),
        buildCourtHouse({ courtHouseName: "Second Court House", courtHouseAddress: { line: ["2 Second Street"], postCode: "S2 2BB" }, courtRoom: [] })
      ]);

      expect(
        $("#court-lists-container .govuk-\\!-margin-bottom-6 h2.govuk-heading-l")
          .map((_, el) => $(el).text().trim())
          .get()
      ).toEqual(["First Court House", "Second Court House"]);
      const addresses = $("#court-lists-container .govuk-\\!-margin-bottom-6").text();
      expect(addresses).toContain("1 First Street");
      expect(addresses).toContain("2 Second Street");
    });
  });

  describe("Session accordion headings", () => {
    it("should include the judiciary in the section heading when present", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildCourtRoom({ courtRoomName: "Court 1", formattedJudiciaries: "Judge Smith" })] })]);

      const heading = $(".govuk-accordion__section-button").text();
      expect(heading).toContain("Court 1");
      expect(heading).toContain("Judge Smith");
    });

    it("should not render a judiciary segment when none is provided", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildCourtRoom({ courtRoomName: "Court 2", formattedJudiciaries: "" })] })]);

      expect($(".govuk-accordion__section-button").text().replace(/\s+/g, " ").trim()).toBe("Court 2");
    });

    it("should render a section heading per court room", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [buildCourtRoom({ courtRoomName: "Court 1", sittings: [] }), buildCourtRoom({ courtRoomName: "Court 2", sittings: [] })]
        })
      ]);

      expect(
        $(".govuk-accordion__section-button")
          .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
          .get()
      ).toEqual(["Court 1", "Court 2"]);
    });

    it("should render a section heading per session within a court room", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            {
              courtRoomName: "Court 1",
              session: [
                { formattedJudiciaries: "Judge Smith", sittings: [] },
                { formattedJudiciaries: "Judge Jones", sittings: [] }
              ]
            }
          ]
        })
      ]);

      expect(
        $(".govuk-accordion__section-button")
          .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
          .get()
      ).toEqual(["Court 1: Judge Smith", "Court 1: Judge Jones"]);
    });
  });

  describe("No hearings message", () => {
    it("should show the no-hearings message when the session has no sittings", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildCourtRoom({ courtRoomName: "Court 1", sittings: [] })] })]);

      expect($(".govuk-accordion__section-content > p.govuk-body").text()).toContain(en.noHearings);
      expect($("table")).toHaveLength(0);
    });

    it("should show the no-hearings message when a sitting has no hearings", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildCourtRoom({ sittings: [buildSitting({ hearing: [] })] })] })]);

      expect($(".govuk-accordion__section-content > p.govuk-body").text()).toContain(en.noHearings);
      expect($("table")).toHaveLength(0);
    });

    it("should render the hearings table and no message when hearings exist", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [buildCourtRoom({ sittings: [buildSitting({ hearing: [{ hearingType: "Trial", case: [buildCase({ caseName: "Test v Test" })] }] })] })]
        })
      ]);

      expect($("table")).toHaveLength(1);
      expect($(".govuk-accordion__section-content > p.govuk-body").filter((_, el) => $(el).text().trim() === en.noHearings)).toHaveLength(0);
      expect(firstDataRowCells($)[COLUMN.caseName]).toBe("Test v Test");
    });
  });

  describe("Hearings table", () => {
    it("should render the column headers in order", () => {
      const { $ } = renderList([buildCourtHouse()]);

      expect(
        $("thead th")
          .map((_, el) => $(el).text().trim())
          .get()
      ).toEqual([en.time, en.caseId, en.caseName, en.caseType, en.hearingType, en.location, en.duration]);
    });

    it("should place each case field in its correct column", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildCourtRoom({
              sittings: [
                buildSitting({
                  time: "10:00am",
                  caseHearingChannel: "In person",
                  hearing: [{ hearingType: "Trial", case: [buildCase({ caseNumber: "T123", caseName: "Smith v Jones", caseType: "Civil" })] }]
                })
              ]
            })
          ]
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.caseId]).toBe("T123");
      expect(cells[COLUMN.caseName]).toBe("Smith v Jones");
      expect(cells[COLUMN.caseType]).toBe("Civil");
      expect(cells[COLUMN.hearingType]).toBe("Trial");
      expect(cells[COLUMN.location]).toBe("In person");
    });

    it("should append the sequence indicator to the case name when present", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildCourtRoom({
              sittings: [
                buildSitting({ hearing: [{ hearingType: "Trial", case: [buildCase({ caseName: "Smith v Jones", caseSequenceIndicator: "2 of 3" })] }] })
              ]
            })
          ]
        })
      ]);

      expect(firstDataRowCells($)[COLUMN.caseName]).toBe("Smith v Jones [2 of 3]");
    });

    it("should render the case name without brackets when no sequence indicator is present", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [buildCourtRoom({ sittings: [buildSitting({ hearing: [{ hearingType: "Trial", case: [buildCase({ caseName: "Brown v White" })] }] })] })]
        })
      ]);

      expect(firstDataRowCells($)[COLUMN.caseName]).toBe("Brown v White");
    });

    it("should render a row per case within a single hearing", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildCourtRoom({
              sittings: [
                buildSitting({
                  hearing: [
                    {
                      hearingType: "Trial",
                      case: [buildCase({ caseNumber: "T123", caseName: "First Case" }), buildCase({ caseNumber: "T124", caseName: "Second Case" })]
                    }
                  ]
                })
              ]
            })
          ]
        })
      ]);

      expect(columnValues($, COLUMN.caseName)).toEqual(["First Case", "Second Case"]);
      expect(columnValues($, COLUMN.caseId)).toEqual(["T123", "T124"]);
    });

    it("should render a row per case across multiple hearings in a sitting", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildCourtRoom({
              sittings: [
                buildSitting({
                  hearing: [
                    { hearingType: "Trial", case: [buildCase({ caseName: "First Hearing Case" })] },
                    { hearingType: "Directions", case: [buildCase({ caseName: "Second Hearing Case" })] }
                  ]
                })
              ]
            })
          ]
        })
      ]);

      expect(columnValues($, COLUMN.caseName)).toEqual(["First Hearing Case", "Second Hearing Case"]);
      expect(columnValues($, COLUMN.hearingType)).toEqual(["Trial", "Directions"]);
    });
  });

  describe("Duration column", () => {
    it.each([
      { hours: 2, minutes: 0, expected: "2 hours" },
      { hours: 1, minutes: 0, expected: "1 hour" },
      { hours: 0, minutes: 30, expected: "30 mins" },
      { hours: 0, minutes: 1, expected: "1 min" },
      { hours: 2, minutes: 45, expected: "2 hours 45 mins" },
      { hours: 0, minutes: 0, expected: "" }
    ])("should render '$expected' for $hours hours and $minutes minutes", ({ hours, minutes, expected }) => {
      const { $ } = renderList([
        buildCourtHouse({ courtRoom: [buildCourtRoom({ sittings: [buildSitting({ durationAsHours: hours, durationAsMinutes: minutes })] })] })
      ]);

      expect(firstDataRowCells($)[COLUMN.duration]).toBe(expected);
    });
  });

  describe("Reporting restriction row", () => {
    it("should render a restriction row spanning all columns when a restriction is present", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildCourtRoom({
              sittings: [
                buildSitting({
                  hearing: [
                    {
                      hearingType: "Trial",
                      case: [buildCase({ caseName: "Restricted Case", formattedReportingRestriction: "Section 39 applies, Section 11 applies" })]
                    }
                  ]
                })
              ]
            })
          ]
        })
      ]);

      const restrictionCell = $("tbody.govuk-table__body td[colspan]");
      expect(restrictionCell).toHaveLength(1);
      expect(restrictionCell.attr("colspan")).toBe("7");
      expect(restrictionCell.find("strong").text()).toContain(en.reportingRestrictions);
      expect(restrictionCell.text()).toContain("Section 39 applies, Section 11 applies");
    });

    it("should not render a restriction row when the restriction is empty", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildCourtRoom({
              sittings: [
                buildSitting({ hearing: [{ hearingType: "Trial", case: [buildCase({ caseName: "Normal Case", formattedReportingRestriction: "" })] }] })
              ]
            })
          ]
        })
      ]);

      expect(firstDataRowCells($)[COLUMN.caseName]).toBe("Normal Case");
      expect($("tbody.govuk-table__body td[colspan]")).toHaveLength(0);
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Civil Data Platform" });

      const footer = $("p.govuk-body").filter((_, el) => $(el).text().includes(en.dataSource));
      expect(footer.text()).toContain("Civil Data Platform");
    });

    it("should render a back-to-top link", () => {
      const { $ } = renderList([]);

      const backToTop = $("a[href='#top']");
      expect(backToTop.text()).toContain(en.linkToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, table headers and labels", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildCourtRoom({ courtRoomName: "Court 1", formattedJudiciaries: "Barnwr Jones" })] })], {}, cy);

      expect($("h2.govuk-heading-l").first().text()).toContain(cy.pageTitle);
      expect($(".govuk-accordion__section-button").text()).toContain("Barnwr Jones");
      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(cy.time);
      expect(headers).toContain(cy.caseName);
      expect($("a[href='#top']").text()).toContain(cy.linkToTop);
    });
  });

  describe("Empty data variations", () => {
    it("should render the header with no court lists", () => {
      const { $ } = renderList([]);

      expect($("h2.govuk-heading-l").first().text()).toContain(en.pageTitle);
      expect($(`a[href="${en.factLinkUrl}"]`)).toHaveLength(1);
      expect($("#court-lists-container").children()).toHaveLength(0);
    });
  });
});
