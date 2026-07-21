import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crownFirmListCy as cy, crownFirmListEn as en } from "@hmcts/crown-firm-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "crown-firm-list.njk";

interface CaseOverrides {
  timeMarkingNote?: string;
  caseNumber?: string;
  defendants?: string;
  representative?: string;
  prosecutingAuthority?: string;
  listingNotes?: string;
  formattedReportingRestriction?: string;
}

// Fixture builders — each layer defaults to a realistic minimal shape and only
// the varied leaf fields are passed per test, keeping the grouped view-model
// tree (groupedListData → dayGroup → courtHouseInfo / sittings → hearing → case)
// out of individual tests.
function buildCase(overrides: CaseOverrides = {}) {
  return {
    timeMarkingNote: "10:00am",
    caseNumber: "T123",
    defendants: "Defendant A",
    representative: "Rep A",
    prosecutingAuthority: "CPS",
    listingNotes: "",
    formattedReportingRestriction: "",
    ...overrides
  };
}

function buildSitting({
  courtRoomName = "Court 1",
  formattedJudiciaries = "",
  time = "10:00am",
  hearing
}: {
  courtRoomName?: string;
  formattedJudiciaries?: string;
  time?: string;
  hearing?: unknown[];
} = {}) {
  return {
    courtRoomName,
    formattedJudiciaries,
    time,
    hearing: hearing ?? [{ displayHearingType: "Trial", case: [buildCase()] }]
  };
}

function buildDayGroup({
  day = "Monday 14 July 2026",
  name = "Test Court House",
  addressLines = ["Test Address"],
  phone,
  sittings = [buildSitting()]
}: {
  day?: string;
  name?: string;
  addressLines?: string[];
  phone?: string;
  sittings?: unknown[];
} = {}) {
  return { day, courtHouseInfo: { name, addressLines, phone }, sittings };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    header: {
      locationName: "Test Crown Court",
      addressLines: ["123 Court Street", "Test City", "TC1 1AA"],
      contentDate: "13 July 2026",
      lastUpdated: "13 July 2026 at 9:00am"
    },
    dataSource: "Test Source"
  };
}

function renderList(groupedListData: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, groupedListData });
}

// The rendered hearings table columns, in order.
const COLUMN = { time: 0, caseRef: 1, defendant: 2, hearingType: 3, representative: 4, prosecutor: 5, listingNotes: 6 } as const;

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

describe("crown-firm-list template", () => {
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
      const { $ } = renderList([], { header: { ...baseData().header, addressLines: ["123 Court Street", "Test City", "TC1 1AA"] } });

      const bodyText = $(".govuk-body").text();
      for (const line of ["123 Court Street", "Test City", "TC1 1AA"]) {
        expect(bodyText).toContain(line);
      }
    });

    it("should render the reporting-restrictions guidance section", () => {
      const { $ } = renderList([]);

      const section = $(".restriction-list-section");
      expect(section).toHaveLength(1);
      expect(section.find("h3").text()).toContain(en.reportingRestrictionsTitle);
      expect(section.find(".govuk-warning-text__text").text()).toContain(en.reportingRestrictionsWarning);
      expect(section.text()).toContain(en.reportingRestrictionsBodyIntro);
      const bullets = section
        .find("ul.govuk-list--bullet li")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(bullets).toContain(en.reportingRestrictionsContactCourt);
      expect(bullets).toContain(en.reportingRestrictionsContactHmcts);
    });

    it("should render the case search input", () => {
      const { $ } = renderList([]);

      const searchInput = $("input#case-search-input");
      expect(searchInput).toHaveLength(1);
      expect(searchInput.attr("type")).toBe("text");
      expect($(".govuk-form-group h2").text()).toContain(en.searchCases);
    });
  });

  describe("Day group and court house details", () => {
    it("should render the day heading, court house name and address lines", () => {
      const { $ } = renderList([
        buildDayGroup({
          day: "Monday 14 July 2026",
          name: "Main Court House",
          addressLines: ["1 Court Street", "Building B", "London", "SW1A 1AA"],
          phone: "020 1234 5678",
          sittings: []
        })
      ]);

      const header = $(".site-header");
      expect(header.find("h2.govuk-heading-l").text()).toContain("Monday 14 July 2026");
      const headerText = header.text();
      expect(headerText).toContain("Main Court House");
      expect(headerText).toContain("1 Court Street");
      expect(headerText).toContain("Building B");
      expect(headerText).toContain("London");
      expect(headerText).toContain("SW1A 1AA");
      expect(headerText).toContain("020 1234 5678");
    });

    it("should omit the phone paragraph when no phone number is provided", () => {
      const { $ } = renderList([
        buildDayGroup({
          day: "Tuesday 15 July 2026",
          name: "Branch Court",
          addressLines: ["2 Branch Road"],
          phone: "",
          sittings: []
        })
      ]);

      expect($(".site-header").text()).toContain("Branch Court");
      // The phone paragraph carries a margin-top-3 class the address lines don't;
      // with no phone it must not be rendered.
      expect($(".site-header p.govuk-\\!-margin-top-3")).toHaveLength(0);
    });

    it("should render one accordion per day group with unique ids", () => {
      const { $ } = renderList([
        buildDayGroup({ day: "Monday 14 July 2026", name: "First Court House" }),
        buildDayGroup({ day: "Tuesday 15 July 2026", name: "Second Court House" })
      ]);

      expect($("#accordion-day-1")).toHaveLength(1);
      expect($("#accordion-day-2")).toHaveLength(1);
      expect(
        $(".site-header h2.govuk-heading-l")
          .map((_, el) => $(el).text().trim())
          .get()
      ).toEqual(["Monday 14 July 2026", "Tuesday 15 July 2026"]);
    });
  });

  describe("Sitting accordion headings", () => {
    it("should include the judiciary and sitting time in the section heading when present", () => {
      const { $ } = renderList([
        buildDayGroup({ sittings: [buildSitting({ courtRoomName: "Court 1", formattedJudiciaries: "Judge Smith", time: "10:00am" })] })
      ]);

      const heading = $(".govuk-accordion__section-button").text();
      expect(heading).toContain(en.courtroom);
      expect(heading).toContain("Court 1");
      expect(heading).toContain("Judge Smith");

      const sittingTime = $(".govuk-accordion__section-header p.govuk-\\!-font-weight-bold").text();
      expect(sittingTime).toContain(en.sittingAt);
      expect(sittingTime).toContain("10:00am");
    });

    it("should not render a judiciary segment when none is provided", () => {
      const { $ } = renderList([buildDayGroup({ sittings: [buildSitting({ courtRoomName: "Court 2", formattedJudiciaries: "" })] })]);

      const heading = $(".govuk-accordion__section-button").text().replace(/\s+/g, " ").trim();
      expect(heading).toBe(`${en.courtroom} Court 2`);
    });
  });

  describe("Hearings table", () => {
    it("should render the expected column headers", () => {
      const { $ } = renderList([buildDayGroup()]);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([en.hearingTime, en.caseNumber, en.defendant, en.hearingType, en.representative, en.prosecutingAuthority, en.listingNotes]);
    });

    it("should place each case field in its correct column", () => {
      const { $ } = renderList([
        buildDayGroup({
          sittings: [
            buildSitting({
              hearing: [
                {
                  displayHearingType: "Trial",
                  case: [
                    buildCase({
                      timeMarkingNote: "10:30am",
                      caseNumber: "T12345",
                      defendants: "John Smith, Jane Doe",
                      representative: "Smith & Co Solicitors",
                      prosecutingAuthority: "CPS",
                      listingNotes: "Remote hearing"
                    })
                  ]
                }
              ]
            })
          ]
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.time]).toBe("10:30am");
      expect(cells[COLUMN.caseRef]).toBe("T12345");
      expect(cells[COLUMN.defendant]).toBe("John Smith, Jane Doe");
      expect(cells[COLUMN.hearingType]).toBe("Trial");
      expect(cells[COLUMN.representative]).toBe("Smith & Co Solicitors");
      expect(cells[COLUMN.prosecutor]).toBe("CPS");
      expect(cells[COLUMN.listingNotes]).toBe("Remote hearing");
    });

    it("should render empty cells for empty optional case fields", () => {
      const { $ } = renderList([
        buildDayGroup({
          sittings: [
            buildSitting({
              hearing: [
                {
                  displayHearingType: "Mention",
                  case: [
                    buildCase({
                      timeMarkingNote: "",
                      caseNumber: "M67890",
                      defendants: "Test Defendant",
                      representative: "",
                      prosecutingAuthority: "",
                      listingNotes: ""
                    })
                  ]
                }
              ]
            })
          ]
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.caseRef]).toBe("M67890");
      expect(cells[COLUMN.defendant]).toBe("Test Defendant");
      expect(cells[COLUMN.hearingType]).toBe("Mention");
      expect(cells[COLUMN.time]).toBe("");
      expect(cells[COLUMN.representative]).toBe("");
      expect(cells[COLUMN.prosecutor]).toBe("");
      expect(cells[COLUMN.listingNotes]).toBe("");
    });

    it("should render a row per case across multiple hearings", () => {
      const { $ } = renderList([
        buildDayGroup({
          sittings: [
            buildSitting({
              hearing: [
                { displayHearingType: "Trial", case: [buildCase({ caseNumber: "T11111", defendants: "Trial Defendant One" })] },
                { displayHearingType: "Sentencing", case: [buildCase({ caseNumber: "S22222", defendants: "Sentence Defendant Two" })] }
              ]
            })
          ]
        })
      ]);

      const caseRefs = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseRef).text().trim())
        .get();
      expect(caseRefs).toEqual(["T11111", "S22222"]);
      const hearingTypes = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.hearingType).text().trim())
        .get();
      expect(hearingTypes).toEqual(["Trial", "Sentencing"]);
    });

    it("should render a row per case within a single hearing", () => {
      const { $ } = renderList([
        buildDayGroup({
          sittings: [
            buildSitting({
              hearing: [
                {
                  displayHearingType: "PTPH",
                  case: [
                    buildCase({ caseNumber: "C11111", defendants: "First Defendant" }),
                    buildCase({ caseNumber: "C22222", defendants: "Second Defendant" })
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
      expect(caseRefs).toEqual(["C11111", "C22222"]);
      const defendants = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.defendant).text().trim())
        .get();
      expect(defendants).toEqual(["First Defendant", "Second Defendant"]);
    });
  });

  describe("Reporting restriction row", () => {
    it("should render a restriction row spanning all columns when a restriction is present", () => {
      const { $ } = renderList([
        buildDayGroup({
          sittings: [
            buildSitting({
              hearing: [
                {
                  displayHearingType: "Trial",
                  case: [
                    buildCase({
                      caseNumber: "R99999",
                      formattedReportingRestriction: "Section 39 Children and Young Persons Act 1933, Section 11 Contempt of Court Act 1981"
                    })
                  ]
                }
              ]
            })
          ]
        })
      ]);

      const restrictionCell = $("tbody.govuk-table__body td[colspan]");
      expect(restrictionCell).toHaveLength(1);
      expect(restrictionCell.attr("colspan")).toBe("7");
      expect(restrictionCell.find("strong").text()).toContain(en.reportingRestrictions);
      expect(restrictionCell.text()).toContain("Section 39 Children and Young Persons Act 1933, Section 11 Contempt of Court Act 1981");
    });

    it("should not render a restriction row when the restriction is empty", () => {
      const { $ } = renderList([
        buildDayGroup({
          sittings: [
            buildSitting({
              hearing: [
                {
                  displayHearingType: "Sentencing",
                  case: [
                    buildCase({ caseNumber: "S11111", defendants: "Normal Defendant", listingNotes: "Interpreter required", formattedReportingRestriction: "" })
                  ]
                }
              ]
            })
          ]
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.caseRef]).toBe("S11111");
      expect(cells[COLUMN.defendant]).toBe("Normal Defendant");
      expect(cells[COLUMN.listingNotes]).toBe("Interpreter required");
      expect($("tbody.govuk-table__body td[colspan]")).toHaveLength(0);
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "CRIME" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("CRIME");
    });

    it("should render a back-to-top link", () => {
      const { $ } = renderList([]);

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop.text()).toContain(en.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, table headers and labels", () => {
      const { $ } = renderList([buildDayGroup({ sittings: [buildSitting({ courtRoomName: "Court 1", formattedJudiciaries: "Barnwr Jones" })] })], {}, cy);

      expect($("h1#page-heading").text()).toContain(cy.pageTitle);
      expect($(".govuk-accordion__section-button").text()).toContain(cy.courtroom);
      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(cy.hearingTime);
      expect(headers).toContain(cy.defendant);
      expect($(".back-to-top a").text()).toContain(cy.backToTop);
    });
  });

  describe("Empty data variations", () => {
    it("should render the guidance and header with no day groups", () => {
      const { $ } = renderList([]);

      expect($("h1#page-heading").text()).toContain(en.pageTitle);
      expect($(".restriction-list-section")).toHaveLength(1);
      expect($("#court-lists-container").children()).toHaveLength(0);
    });

    it("should render a day group with no sittings without a table", () => {
      const { $ } = renderList([buildDayGroup({ day: "Monday 14 July 2026", name: "Empty Court House", addressLines: ["Empty Street"], sittings: [] })]);

      expect($(".site-header").text()).toContain("Empty Court House");
      expect($(".govuk-accordion__section")).toHaveLength(0);
      expect($("table")).toHaveLength(0);
    });
  });
});
