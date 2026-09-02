import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crownDailyListCy as cy, crownDailyListEn as en } from "@hmcts/crown-daily-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "crown-daily-cause-list.njk";

interface CaseOverrides {
  caseNumber?: string;
  timeMarkingNote?: string;
  defendants?: string;
  prosecutingAuthority?: string;
  listingNotes?: string;
  formattedReportingRestriction?: string;
}

// Fixture builders — each layer defaults to a realistic minimal shape and only
// the varied leaf fields are passed per test, keeping the deep artefact tree
// (courtLists → courtHouse → courtRoom → session → sitting → hearing → case)
// out of individual tests.
function buildCase(overrides: CaseOverrides = {}) {
  return {
    caseNumber: "T123",
    timeMarkingNote: "10:00 AM",
    defendants: "Defendant A",
    prosecutingAuthority: "CPS",
    ...overrides
  };
}

function buildSession({
  courtRoomName = "Court 1",
  formattedJudiciaries = "",
  hasListingNotes = false,
  sittings
}: {
  courtRoomName?: string;
  formattedJudiciaries?: string;
  hasListingNotes?: boolean;
  sittings?: unknown[];
} = {}) {
  return {
    courtRoomName,
    session: [
      {
        formattedJudiciaries,
        hasListingNotes,
        sittings: sittings ?? [{ time: "10:00am", hearing: [{ displayHearingType: "Trial", case: [buildCase()] }] }]
      }
    ]
  };
}

function buildCourtHouse({
  courtHouseName = "Test Crown Court",
  courtHouseAddressLines = ["Test Address"],
  courtHousePhone,
  courtRoom = [buildSession()]
}: {
  courtHouseName?: string;
  courtHouseAddressLines?: string[];
  courtHousePhone?: string;
  courtRoom?: unknown[];
} = {}) {
  return { courtHouse: { courtHouseName, courtHouseAddressLines, courtHousePhone, courtRoom } };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    header: {
      locationName: "Test Crown Court",
      addressLines: ["123 Test Street", "Test City", "TC1 1AA"],
      contentDate: "10 July 2026",
      lastUpdated: "10 July 2026 at 9:00am"
    },
    dataSource: "Test Source"
  };
}

function renderList(courtLists: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, listData: { courtLists } });
}

// The rendered hearings table columns, in order (the listing-notes column is
// conditional on session.hasListingNotes).
const COLUMN = { time: 0, caseRef: 1, defendant: 2, hearingType: 3, prosecutor: 4, listingNotes: 5 } as const;

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

describe("crown-daily-cause-list template", () => {
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
    it("should render the heading with the page title and location name", () => {
      const { $ } = renderList([]);

      expect($("h1#page-heading").text()).toContain(en.pageTitle);
      expect($("h1#page-heading").text()).toContain("Test Crown Court");
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
    });

    it("should render the version paragraph only when a version is provided", () => {
      const withVersion = renderList([], { header: { ...baseData().header, version: "1.0" } }).$;
      const versionLine = withVersion(".govuk-body").filter((_, el) => withVersion(el).text().includes(en.version));
      expect(versionLine.text()).toContain("1.0");

      const withoutVersion = renderList([], { header: { ...baseData().header, version: "" } }).$;
      const emptyVersionLine = withoutVersion(".govuk-body").filter((_, el) => withoutVersion(el).text().trim().startsWith(en.version));
      expect(emptyVersionLine).toHaveLength(0);
    });

    it("should render each header address line as its own paragraph", () => {
      const { $ } = renderList([], { header: { ...baseData().header, addressLines: ["Line 1", "Line 2", "Line 3", "TC1 1AA"] } });

      const bodyText = $(".govuk-body").text();
      for (const line of ["Line 1", "Line 2", "Line 3", "TC1 1AA"]) {
        expect(bodyText).toContain(line);
      }
    });

    it("should render the reporting-restrictions guidance section", () => {
      const { $ } = renderList([]);

      const section = $(".restriction-list-section");
      expect(section).toHaveLength(1);
      expect(section.find("h3").text()).toContain(en.reportingRestrictionsTitle);
      expect(section.find(".govuk-warning-text__text").text()).toContain(en.reportingRestrictionsWarning);
    });
  });

  describe("Court house details", () => {
    it("should render the court house name and address lines", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtHouseName: "Main Crown Court House",
          courtHouseAddressLines: ["1 Crown Street", "Building B", "SW1A 1AA"],
          courtHousePhone: "020 1234 5678",
          courtRoom: []
        })
      ]);

      const header = $(".site-header");
      expect(header.find("h2.site-address").text()).toContain("Main Crown Court House");
      const headerText = header.text();
      expect(headerText).toContain("1 Crown Street");
      expect(headerText).toContain("Building B");
      expect(headerText).toContain("SW1A 1AA");
      expect(headerText).toContain("020 1234 5678");
    });

    it("should omit the phone paragraph when no phone number is provided", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtHouseName: "Branch Crown Court",
          courtHouseAddressLines: ["2 Branch Road"],
          courtHousePhone: "",
          courtRoom: []
        })
      ]);

      expect($(".site-header").text()).toContain("Branch Crown Court");
      // The phone paragraph carries a margin-top-3 class the address lines don't;
      // with no phone it must not be rendered.
      expect($(".site-header p.govuk-\\!-margin-top-3")).toHaveLength(0);
    });

    it("should render one accordion per court house with unique ids", () => {
      const { $ } = renderList([
        buildCourtHouse({ courtHouseName: "First Crown Court", courtHouseAddressLines: ["1 First Street"] }),
        buildCourtHouse({ courtHouseName: "Second Crown Court", courtHouseAddressLines: ["2 Second Street"] })
      ]);

      expect($("#accordion-1")).toHaveLength(1);
      expect($("#accordion-2")).toHaveLength(1);
      expect(
        $(".site-header h2.site-address")
          .map((_, el) => $(el).text().trim())
          .get()
      ).toEqual(["First Crown Court", "Second Crown Court"]);
    });
  });

  describe("Session accordion headings", () => {
    it("should include the judiciary in the section heading when present", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildSession({ courtRoomName: "Court 1", formattedJudiciaries: "Judge Smith" })] })]);

      const heading = $(".govuk-accordion__section-button").text();
      expect(heading).toContain(en.court);
      expect(heading).toContain("Court 1");
      expect(heading).toContain("Judge Smith");
    });

    it("should not render a judiciary segment when none is provided", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildSession({ courtRoomName: "Court 2", formattedJudiciaries: "" })] })]);

      const heading = $(".govuk-accordion__section-button").text().replace(/\s+/g, " ").trim();
      expect(heading).toBe(`${en.court} Court 2`);
    });
  });

  describe("Hearings table", () => {
    it("should render the listing-notes column only when the session flags it", () => {
      const withNotes = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              hasListingNotes: true,
              sittings: [{ time: "10:00am", hearing: [{ displayHearingType: "Trial", case: [buildCase({ listingNotes: "Test note" })] }] }]
            })
          ]
        })
      ]).$;
      const headers = withNotes("thead th")
        .map((_, el) => withNotes(el).text().trim())
        .get();
      expect(headers).toContain(en.listingNotes);
      expect(firstDataRowCells(withNotes)[COLUMN.listingNotes]).toBe("Test note");

      const withoutNotes = renderList([buildCourtHouse({ courtRoom: [buildSession({ hasListingNotes: false })] })]).$;
      const headersNoNotes = withoutNotes("thead th")
        .map((_, el) => withoutNotes(el).text().trim())
        .get();
      expect(headersNoNotes).not.toContain(en.listingNotes);
    });

    it("should place each case field in its correct column", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                {
                  time: "10:00am",
                  hearing: [
                    {
                      displayHearingType: "Trial",
                      case: [buildCase({ caseNumber: "T123", timeMarkingNote: "10:00 AM", defendants: "Defendant A", prosecutingAuthority: "CPS" })]
                    }
                  ]
                }
              ]
            })
          ]
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.time]).toBe("10:00 AM");
      expect(cells[COLUMN.caseRef]).toBe("T123");
      expect(cells[COLUMN.defendant]).toBe("Defendant A");
      expect(cells[COLUMN.hearingType]).toBe("Trial");
      expect(cells[COLUMN.prosecutor]).toBe("CPS");
    });

    it("should render the sitting time heading for each sitting", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                { time: "10:00am", hearing: [{ displayHearingType: "Trial", case: [buildCase({ caseNumber: "T123", defendants: "Defendant A" })] }] },
                { time: "2:00pm", hearing: [{ displayHearingType: "Sentencing", case: [buildCase({ caseNumber: "S456", defendants: "Defendant B" })] }] }
              ]
            })
          ]
        })
      ]);

      const sittingHeadings = $(".govuk-accordion__section-content > p.govuk-\\!-font-weight-bold")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(sittingHeadings).toEqual([`${en.sittingAt} 10:00am`, `${en.sittingAt} 2:00pm`]);
      expect($("table")).toHaveLength(2);
    });

    it("should render a row per case across multiple hearings", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                {
                  time: "10:00am",
                  hearing: [
                    { displayHearingType: "Trial", case: [buildCase({ caseNumber: "T123", defendants: "Defendant A", prosecutingAuthority: "CPS" })] },
                    { displayHearingType: "Mention", case: [buildCase({ caseNumber: "M456", defendants: "Defendant B", prosecutingAuthority: "HMRC" })] }
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
      expect(caseRefs).toEqual(["T123", "M456"]);
      const hearingTypes = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.hearingType).text().trim())
        .get();
      expect(hearingTypes).toEqual(["Trial", "Mention"]);
    });

    it("should render a row per case within a single hearing", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                {
                  time: "10:00am",
                  hearing: [
                    {
                      displayHearingType: "Trial",
                      case: [
                        buildCase({ caseNumber: "T123", timeMarkingNote: "10:00 AM", defendants: "Defendant A" }),
                        buildCase({ caseNumber: "T124", timeMarkingNote: "10:15 AM", defendants: "Defendant B" })
                      ]
                    }
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
      expect(caseRefs).toEqual(["T123", "T124"]);
    });
  });

  describe("Reporting restriction row", () => {
    it("should render a restriction row spanning the case columns when a restriction is present", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                {
                  time: "10:00am",
                  hearing: [
                    {
                      displayHearingType: "Trial",
                      case: [buildCase({ caseNumber: "R123", formattedReportingRestriction: "Section 39 applies, Youth anonymity" })]
                    }
                  ]
                }
              ]
            })
          ]
        })
      ]);

      const restrictionCell = $("tbody.govuk-table__body td[colspan]");
      expect(restrictionCell).toHaveLength(1);
      expect(restrictionCell.find("strong").text()).toContain(en.reportingRestrictions);
      expect(restrictionCell.text()).toContain("Section 39 applies, Youth anonymity");
    });

    it("should not render a restriction row when the restriction is empty", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                {
                  time: "10:00am",
                  hearing: [
                    {
                      displayHearingType: "Trial",
                      case: [buildCase({ caseNumber: "N123", defendants: "Normal Defendant", formattedReportingRestriction: "" })]
                    }
                  ]
                }
              ]
            })
          ]
        })
      ]);

      expect(firstDataRowCells($)[COLUMN.defendant]).toBe("Normal Defendant");
      expect($("tbody.govuk-table__body td[colspan]")).toHaveLength(0);
    });

    it("should span 6 columns when listing notes are present and 5 when absent", () => {
      const withNotes = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              hasListingNotes: true,
              sittings: [
                {
                  time: "10:00am",
                  hearing: [
                    { displayHearingType: "Trial", case: [buildCase({ listingNotes: "Test note", formattedReportingRestriction: "Section 39 applies" })] }
                  ]
                }
              ]
            })
          ]
        })
      ]).$;
      expect(withNotes("td[colspan]").attr("colspan")).toBe("6");

      const withoutNotes = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              hasListingNotes: false,
              sittings: [
                { time: "10:00am", hearing: [{ displayHearingType: "Trial", case: [buildCase({ formattedReportingRestriction: "Section 39 applies" })] }] }
              ]
            })
          ]
        })
      ]).$;
      expect(withoutNotes("td[colspan]").attr("colspan")).toBe("5");
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

  describe("Welsh rendering", () => {
    it("should render Welsh headings, table headers and labels", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildSession({ courtRoomName: "Court 1", formattedJudiciaries: "Barnwr Jones" })] })], {}, cy);

      expect($("h1#page-heading").text()).toContain(cy.pageTitle);
      expect($(".govuk-accordion__section-button").text()).toContain(cy.court);
      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(cy.hearingTime);
      expect(headers).toContain(cy.defendant);
      expect($(".back-to-top a").text()).toContain(cy.backToTop);
    });
  });

  describe("Empty data variations", () => {
    it("should render the guidance and header with no court lists", () => {
      const { $ } = renderList([]);

      expect($("h1#page-heading").text()).toContain(en.pageTitle);
      expect($(".restriction-list-section")).toHaveLength(1);
      expect($("#court-lists-container").children()).toHaveLength(0);
    });

    it("should render a court house with no court rooms without a table", () => {
      const { $ } = renderList([buildCourtHouse({ courtHouseName: "Empty Crown Court", courtHouseAddressLines: ["Empty Street"], courtRoom: [] })]);

      expect($(".site-header h2.site-address").text()).toContain("Empty Crown Court");
      expect($("table")).toHaveLength(0);
    });

    it("should render a court room with no sessions without an accordion section", () => {
      const { $ } = renderList([buildCourtHouse({ courtHouseName: "Test Crown Court", courtRoom: [{ courtRoomName: "Court 1", session: [] }] })]);

      expect($(".site-header h2.site-address").text()).toContain("Test Crown Court");
      expect($(".govuk-accordion__section")).toHaveLength(0);
      expect($("table")).toHaveLength(0);
    });

    it("should render a session with no sittings without a table", () => {
      const { $ } = renderList([
        buildCourtHouse({ courtRoom: [buildSession({ courtRoomName: "Court 1", formattedJudiciaries: "Judge Smith", sittings: [] })] })
      ]);

      expect($(".govuk-accordion__section-button").text()).toContain("Court 1");
      expect($(".govuk-accordion__section-button").text()).toContain("Judge Smith");
      expect($("table")).toHaveLength(0);
    });
  });
});
