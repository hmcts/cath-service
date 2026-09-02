import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { familyDailyCauseListCy as cy, familyDailyCauseListEn as en } from "@hmcts/family-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "family-daily-cause-list.njk";

interface CaseOverrides {
  caseNumber?: string;
  caseName?: string;
  caseType?: string;
  caseSequenceIndicator?: string;
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
  hearing?: unknown[];
}

interface CourtHouseAddress {
  line?: string[];
  town?: string;
  county?: string;
  postCode?: string;
}

// Fixture builders — each layer defaults to a realistic minimal shape and only
// the varied leaf fields are passed per test, keeping the deep artefact tree
// (courtLists → courtHouse → courtRoom → session → sitting → hearing → case)
// out of individual tests.
function buildCase(overrides: CaseOverrides = {}) {
  return {
    caseNumber: "F123",
    caseName: "Test v Test",
    caseType: "Family",
    applicant: "",
    respondent: "",
    ...overrides
  };
}

function buildSitting({ time = "10:00am", durationAsHours = 1, durationAsMinutes = 0, caseHearingChannel = "In person", hearing }: SittingOverrides = {}) {
  return {
    time,
    durationAsHours,
    durationAsMinutes,
    caseHearingChannel,
    hearing: hearing ?? [{ hearingType: "Hearing", case: [buildCase()] }]
  };
}

function buildSession({
  courtRoomName = "Family Court 1",
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
  courtHouseName = "Test Family Court House",
  courtHouseAddress,
  omitAddress = false,
  courtRoom = [buildSession()]
}: {
  courtHouseName?: string;
  courtHouseAddress?: CourtHouseAddress;
  omitAddress?: boolean;
  courtRoom?: unknown[];
} = {}) {
  const address = courtHouseAddress ?? { line: ["Test Address"], town: "", county: "", postCode: "" };
  return {
    courtHouse: {
      courtHouseName,
      ...(omitAddress ? {} : { courtHouseAddress: address }),
      courtRoom
    }
  };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    header: {
      locationName: "Test Family Court",
      addressLines: ["123 Family Court Street", "Test City", "TC1 1AA"],
      contentDate: "10 July 2026",
      lastUpdated: "10 July 2026 at 9:00am"
    },
    openJustice: {
      venueName: "Test Family Venue",
      email: "family@example.com",
      phone: "01234 567890"
    },
    dataSource: "Test Family Source"
  };
}

function renderList(courtLists: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, listData: { courtLists } });
}

// The rendered hearings table columns, in order.
const COLUMN = {
  time: 0,
  caseRef: 1,
  caseName: 2,
  caseType: 3,
  hearingType: 4,
  location: 5,
  duration: 6,
  applicant: 7,
  respondent: 8
} as const;

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

// Case rows carry 9 cells; reporting-restriction rows carry a single colspan cell.
function caseRows($: CheerioAPI) {
  return $("tbody.govuk-table__body tr").filter((_, row) => $(row).find("td[colspan]").length === 0);
}

function firstDataRowCells($: CheerioAPI) {
  return caseRows($)
    .first()
    .find("td")
    .map((_, el) => normalize($(el).text()))
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("family-daily-cause-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should use https URLs for FACT and open justice links", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.openJusticeLink).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.openJusticeLink).toMatch(/^https:\/\//);
    });
  });

  describe("Page header", () => {
    it("should render the heading with the page title and location name", () => {
      const { $ } = renderList([]);

      const heading = $(".govuk-heading-l").first().text();
      expect(heading).toContain(en.pageTitle);
      expect(heading).toContain("Test Family Court");
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
    });

    it("should render the list-for date and last-updated line", () => {
      const { $ } = renderList([]);

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(`${en.listFor} 10 July 2026`);
      expect(bodyText).toContain(`${en.lastUpdated} 10 July 2026 at 9:00am`);
    });

    it("should render the header address lines", () => {
      const { $ } = renderList([], { header: { ...baseData().header, addressLines: ["Line 1", "Line 2", "TC1 1AA"] } });

      const bodyText = $(".govuk-body").text();
      for (const line of ["Line 1", "Line 2", "TC1 1AA"]) {
        expect(bodyText).toContain(line);
      }
    });

    it("should render the important-information open-justice section", () => {
      const { $ } = renderList([]);

      const details = $("details.govuk-details");
      expect(details).toHaveLength(1);
      expect(details.find(".govuk-details__summary-text").text()).toContain(en.importantInformation);
      const openJusticeLink = details.find(`a[href="${en.openJusticeLink}"]`);
      expect(openJusticeLink).toHaveLength(1);
      expect(details.text()).toContain("Test Family Venue");
      expect(details.text()).toContain("family@example.com");
    });

    it("should render the search-cases input", () => {
      const { $ } = renderList([]);

      expect($("#case-search-input")).toHaveLength(1);
      expect($(".govuk-form-group h2.govuk-heading-m").text()).toContain(en.searchCases);
    });
  });

  describe("Court house address", () => {
    it("should render the court house name and full address", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtHouseName: "Main Family Court House",
          courtHouseAddress: { line: ["1 Family Court Street", "Building B"], town: "London", county: "Greater London", postCode: "SW1A 1AA" },
          courtRoom: []
        })
      ]);

      const block = $("#court-lists-container > div.govuk-\\!-margin-bottom-6");
      expect(block.find("h2.govuk-heading-l").text()).toContain("Main Family Court House");
      const paragraphs = block
        .find("p.govuk-body")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(paragraphs).toEqual(["1 Family Court Street", "Building B", "London", "Greater London", "SW1A 1AA"]);
    });

    it("should omit empty address fields such as county", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtHouseName: "Branch Family Court",
          courtHouseAddress: { line: ["2 Branch Family Road"], town: "Manchester", postCode: "M1 1AA" },
          courtRoom: []
        })
      ]);

      const block = $("#court-lists-container > div.govuk-\\!-margin-bottom-6");
      const paragraphs = block
        .find("p.govuk-body")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(paragraphs).toEqual(["2 Branch Family Road", "Manchester", "M1 1AA"]);
      expect(paragraphs).not.toContain("Greater London");
    });

    it("should skip empty address lines", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtHouseName: "Simple Family Court",
          courtHouseAddress: { line: ["", "Valid Family Line", ""], postCode: "AB1 2CD" },
          courtRoom: []
        })
      ]);

      const block = $("#court-lists-container > div.govuk-\\!-margin-bottom-6");
      const paragraphs = block
        .find("p.govuk-body")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(paragraphs).toEqual(["Valid Family Line", "AB1 2CD"]);
    });

    it("should not render the name/address block when the address is missing", () => {
      const { $ } = renderList([buildCourtHouse({ courtHouseName: "Address-less Family Court", omitAddress: true, courtRoom: [] })]);

      expect($("#court-lists-container > div.govuk-\\!-margin-bottom-6")).toHaveLength(0);
      const headings = $(".govuk-heading-l")
        .map((_, el) => $(el).text())
        .get();
      expect(headings.some((h) => h.includes("Address-less Family Court"))).toBe(false);
    });

    it("should render one court house block per court list", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtHouseName: "First Family Court",
          courtHouseAddress: { line: ["1 First Street"], postCode: "F1 1AA" },
          courtRoom: [buildSession({ courtRoomName: "Court 1A", formattedJudiciaries: "Judge A", sittings: [] })]
        }),
        buildCourtHouse({
          courtHouseName: "Second Family Court",
          courtHouseAddress: { line: ["2 Second Street"], postCode: "F2 2BB" },
          courtRoom: [buildSession({ courtRoomName: "Court 2A", formattedJudiciaries: "Judge B", sittings: [] })]
        })
      ]);

      const courtHouseNames = $("#court-lists-container > div.govuk-\\!-margin-bottom-6 h2.govuk-heading-l")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(courtHouseNames).toEqual(["First Family Court", "Second Family Court"]);

      const sectionButtons = $(".govuk-accordion__section-button")
        .map((_, el) => normalize($(el).text()))
        .get();
      expect(sectionButtons).toEqual([`Court 1A, ${en.before}: Judge A`, `Court 2A, ${en.before}: Judge B`]);
    });
  });

  describe("Session accordion headings", () => {
    it("should include the judiciary in the section heading when present", () => {
      const { $ } = renderList([
        buildCourtHouse({ courtRoom: [buildSession({ courtRoomName: "Family Court 1", formattedJudiciaries: "Judge Family Smith", sittings: [] })] })
      ]);

      const heading = normalize($(".govuk-accordion__section-button").text());
      expect(heading).toBe(`Family Court 1, ${en.before}: Judge Family Smith`);
    });

    it("should not render a judiciary segment when none is provided", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildSession({ courtRoomName: "Family Court 2", formattedJudiciaries: "", sittings: [] })] })]);

      const heading = normalize($(".govuk-accordion__section-button").text());
      expect(heading).toBe("Family Court 2");
      expect(heading).not.toContain(en.before);
    });
  });

  describe("No hearings message", () => {
    it("should render the no-hearings message and no table when the session has no hearings", () => {
      const { $ } = renderList([
        buildCourtHouse({ courtRoom: [buildSession({ formattedJudiciaries: "Judge Smith", sittings: [buildSitting({ hearing: [] })] })] })
      ]);

      expect($(".govuk-accordion__section-content").text()).toContain(en.noHearings);
      expect($("table")).toHaveLength(0);
    });
  });

  describe("Hearings table", () => {
    it("should render all table headers in order", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildSession()] })]);

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
                  hearing: [
                    {
                      hearingType: "Final Hearing",
                      case: [
                        buildCase({ caseNumber: "FH123", caseName: "Smith v Jones", caseType: "Family", applicant: "John Green", respondent: "Mary Blue" })
                      ]
                    }
                  ]
                })
              ]
            })
          ]
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.time]).toBe("10:00am");
      expect(cells[COLUMN.caseRef]).toBe("FH123");
      expect(cells[COLUMN.caseName]).toBe("Smith v Jones");
      expect(cells[COLUMN.caseType]).toBe("Family");
      expect(cells[COLUMN.hearingType]).toBe("Final Hearing");
      expect(cells[COLUMN.location]).toBe("In person");
      expect(cells[COLUMN.applicant]).toBe("John Green");
      expect(cells[COLUMN.respondent]).toBe("Mary Blue");
    });

    it("should render a row per case within a hearing", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({
                  hearing: [
                    {
                      hearingType: "Hearing",
                      case: [buildCase({ caseNumber: "F1", caseName: "A v B" }), buildCase({ caseNumber: "F2", caseName: "C v D" })]
                    }
                  ]
                })
              ]
            })
          ]
        })
      ]);

      const caseRefs = caseRows($)
        .map((_, row) => $(row).find("td").eq(COLUMN.caseRef).text().trim())
        .get();
      expect(caseRefs).toEqual(["F1", "F2"]);
    });
  });

  describe("Duration formatting", () => {
    function renderWithDuration(durationAsHours: number, durationAsMinutes: number) {
      return renderList([buildCourtHouse({ courtRoom: [buildSession({ sittings: [buildSitting({ durationAsHours, durationAsMinutes })] })] })]).$;
    }

    it("should render hours only in the plural", () => {
      expect(firstDataRowCells(renderWithDuration(2, 0))[COLUMN.duration]).toBe("2 hours");
    });

    it("should render an hour in the singular", () => {
      expect(firstDataRowCells(renderWithDuration(1, 0))[COLUMN.duration]).toBe("1 hour");
    });

    it("should render minutes only in the plural", () => {
      expect(firstDataRowCells(renderWithDuration(0, 30))[COLUMN.duration]).toBe("30 mins");
    });

    it("should render a minute in the singular", () => {
      expect(firstDataRowCells(renderWithDuration(0, 1))[COLUMN.duration]).toBe("1 min");
    });

    it("should render hours and minutes together", () => {
      expect(firstDataRowCells(renderWithDuration(2, 45))[COLUMN.duration]).toBe("2 hours 45 mins");
    });
  });

  describe("Case name and parties", () => {
    it("should append the sequence indicator to the case name when present", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({ hearing: [{ hearingType: "Final Hearing", case: [buildCase({ caseName: "Smith v Jones", caseSequenceIndicator: "2 of 3" })] }] })
              ]
            })
          ]
        })
      ]);

      expect(firstDataRowCells($)[COLUMN.caseName]).toBe("Smith v Jones [2 of 3]");
    });

    it("should render the case name without brackets when there is no sequence indicator", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [buildSession({ sittings: [buildSitting({ hearing: [{ hearingType: "Hearing", case: [buildCase({ caseName: "Brown v White" })] }] })] })]
        })
      ]);

      expect(firstDataRowCells($)[COLUMN.caseName]).toBe("Brown v White");
    });

    it("should render the applicant with their representative", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({
                  hearing: [
                    {
                      hearingType: "Hearing",
                      case: [buildCase({ caseName: "Green v Black", applicant: "John Green", applicantRepresentative: "Family Solicitors Ltd" })]
                    }
                  ]
                })
              ]
            })
          ]
        })
      ]);

      expect(firstDataRowCells($)[COLUMN.applicant]).toBe(`John Green, ${en.legalAdvisor}: Family Solicitors Ltd`);
    });

    it("should render the respondent with their representative", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({
                  hearing: [
                    {
                      hearingType: "Directions",
                      case: [buildCase({ caseName: "Red v Blue", respondent: "Mary Blue", respondentRepresentative: "Blue Family Law LLP" })]
                    }
                  ]
                })
              ]
            })
          ]
        })
      ]);

      expect(firstDataRowCells($)[COLUMN.respondent]).toBe(`Mary Blue, ${en.legalAdvisor}: Blue Family Law LLP`);
    });

    it("should render empty applicant and respondent cells when no parties are present", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({ hearing: [{ hearingType: "Mention", case: [buildCase({ caseName: "Orange v Purple", applicant: "", respondent: "" })] }] })
              ]
            })
          ]
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.caseName]).toBe("Orange v Purple");
      expect(cells[COLUMN.applicant]).toBe("");
      expect(cells[COLUMN.respondent]).toBe("");
    });
  });

  describe("Reporting restriction row", () => {
    it("should render a restriction row spanning all columns when a restriction is present", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({
                  hearing: [
                    {
                      hearingType: "Final Hearing",
                      case: [buildCase({ caseName: "Restricted Family Case", formattedReportingRestriction: "Section 39 applies, Section 11 applies" })]
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
      expect(restrictionCell.attr("colspan")).toBe("9");
      expect(restrictionCell.find("strong").text()).toContain(en.reportingRestrictions);
      expect(restrictionCell.text()).toContain("Section 39 applies, Section 11 applies");
      expect(caseRows($).first().hasClass("no-border-bottom")).toBe(true);
    });

    it("should not render a restriction row when the restriction is empty", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({
                  hearing: [{ hearingType: "Hearing", case: [buildCase({ caseName: "Normal Family Case", formattedReportingRestriction: "" })] }]
                })
              ]
            })
          ]
        })
      ]);

      expect(firstDataRowCells($)[COLUMN.caseName]).toBe("Normal Family Case");
      expect($("tbody.govuk-table__body td[colspan]")).toHaveLength(0);
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Family Data Platform" });

      const footer = $("p.govuk-body").filter((_, el) => $(el).text().includes(en.dataSource));
      expect(footer.text()).toContain("Family Data Platform");
    });

    it("should render a back-to-top link", () => {
      const { $ } = renderList([]);

      const backToTop = $("a[href='#top']");
      expect(backToTop.text()).toContain(en.linkToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, table headers and labels", () => {
      const { $ } = renderList(
        [buildCourtHouse({ courtRoom: [buildSession({ courtRoomName: "Family Court 1", formattedJudiciaries: "Barnwr Jones" })] })],
        {},
        cy
      );

      expect($(".govuk-heading-l").first().text()).toContain(cy.pageTitle);
      expect($(".govuk-accordion__section-button").text()).toContain(cy.before);
      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(cy.time);
      expect(headers).toContain(cy.caseName);
      expect(headers).toContain(cy.respondent);
      expect($("a[href='#top']").text()).toContain(cy.linkToTop);
    });
  });

  describe("Empty data variations", () => {
    it("should render the header and guidance with no court lists", () => {
      const { $ } = renderList([]);

      expect($(".govuk-heading-l").first().text()).toContain(en.pageTitle);
      expect($("details.govuk-details")).toHaveLength(1);
      expect($("#court-lists-container").children()).toHaveLength(0);
    });

    it("should render a court house with no court rooms without a table", () => {
      const { $ } = renderList([
        buildCourtHouse({ courtHouseName: "Empty Family Court", courtHouseAddress: { line: ["Empty Street"], postCode: "E1 1AA" }, courtRoom: [] })
      ]);

      expect($("#court-lists-container > div.govuk-\\!-margin-bottom-6 h2.govuk-heading-l").text()).toContain("Empty Family Court");
      expect($("table")).toHaveLength(0);
    });

    it("should render a court room with no sessions without an accordion section", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [{ courtRoomName: "Family Court 1", session: [] }] })]);

      expect($(".govuk-accordion__section")).toHaveLength(0);
      expect($("table")).toHaveLength(0);
    });
  });
});
