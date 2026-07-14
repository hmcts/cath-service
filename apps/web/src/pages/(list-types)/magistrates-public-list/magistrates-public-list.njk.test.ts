import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { magistratesPublicListCy as cy, magistratesPublicListEn as en } from "@hmcts/magistrates-public-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "magistrates-public-list.njk";

interface CaseOverrides {
  caseUrn?: string;
  defendant?: string;
  prosecutingAuthority?: string;
  offences?: string[];
  reportingRestriction?: boolean;
}

interface ApplicationOverrides {
  applicationReference?: string;
  defendant?: string;
  prosecutingAuthority?: string;
  offences?: string[];
}

// Fixture builders — each layer defaults to a realistic minimal shape and only
// the varied leaf fields are passed per test, keeping the deep view-model tree
// (courtLists → courtHouse → courtRoom → session → sitting → hearing →
// case/application) out of individual tests.
function buildCase(overrides: CaseOverrides = {}) {
  return {
    caseUrn: "12AA3456789",
    defendant: "John Smith",
    prosecutingAuthority: "CPS",
    offences: [],
    reportingRestriction: false,
    ...overrides
  };
}

function buildApplication(overrides: ApplicationOverrides = {}) {
  return {
    applicationReference: "APP-2026-001",
    defendant: "David Brown",
    prosecutingAuthority: "Local Authority",
    offences: [],
    ...overrides
  };
}

function buildHearing({
  hearingType = "Trial",
  cases = [buildCase()],
  applications
}: {
  hearingType?: string;
  cases?: unknown[];
  applications?: unknown[];
} = {}) {
  return { hearingType, case: cases, ...(applications ? { application: applications } : {}) };
}

function buildSitting({ time = "10:00am", hearing }: { time?: string; hearing?: unknown[] } = {}) {
  return { time, hearing: hearing ?? [buildHearing()] };
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

function buildCourtHouse({ courtRoom = [buildSession()] }: { courtRoom?: unknown[] } = {}) {
  return { courtHouse: { courtRoom } };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    header: {
      locationName: "Westminster Magistrates Court",
      contentDate: "15 January 2026",
      publishedDate: "14 January 2026",
      publishedTime: "12:00pm",
      venueAddress: [] as string[]
    },
    dataSource: "Manual Upload"
  };
}

function renderList(courtLists: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, listData: { courtLists } });
}

// The rendered cases table columns, in order.
const COLUMN = { sittingAt: 0, urn: 1, name: 2, hearingType: 3, prosecutor: 4 } as const;

function firstDataRowCells($: CheerioAPI) {
  return $("tbody.govuk-table__body tr")
    .first()
    .find("td")
    .map((_, el) => $(el).text().trim())
    .get();
}

// Data rows carry the full five columns; the conditional offence-details and
// reporting-restriction rows use colspans, so filtering on five cells isolates
// the case/application rows.
function dataRowsColumn($: CheerioAPI, col: number) {
  return $("tbody.govuk-table__body tr")
    .filter((_, row) => $(row).find("td").length === 5)
    .map((_, row) => $(row).find("td").eq(col).text().trim())
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("magistrates-public-list template", () => {
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
    it("should render the heading with the page header text and location name", () => {
      const { $ } = renderList([]);

      const heading = $("h2.govuk-heading-l").first().text();
      expect(heading).toContain(en.header);
      expect(heading).toContain("Westminster Magistrates Court");
    });

    it("should render the content date", () => {
      const { $ } = renderList([]);

      const listDate = $("p.govuk-body.govuk-\\!-font-weight-bold").text();
      expect(listDate).toContain(en.listDate);
      expect(listDate).toContain("15 January 2026");
    });

    it("should render the published date and time", () => {
      const { $ } = renderList([]);

      const publishedLine = $("p.govuk-body").filter((_, el) => $(el).text().includes("14 January 2026"));
      expect(publishedLine.text()).toContain("14 January 2026");
      expect(publishedLine.text()).toContain("12:00pm");
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
    });

    it("should render the venue address lines only when present", () => {
      const withAddress = renderList([], {
        header: { ...baseData().header, venueAddress: ["181 Marylebone Road", "London", "NW1 5BR"] }
      }).$;
      const addressPara = withAddress("p.govuk-body").filter((_, el) => withAddress(el).text().includes("181 Marylebone Road"));
      expect(addressPara).toHaveLength(1);
      for (const line of ["181 Marylebone Road", "London", "NW1 5BR"]) {
        expect(addressPara.text()).toContain(line);
      }

      const withoutAddress = renderList([]).$;
      expect(withoutAddress("p.govuk-body").filter((_, el) => withoutAddress(el).text().includes("Marylebone"))).toHaveLength(0);
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

  describe("Search section", () => {
    it("should render the search input and heading", () => {
      const { $ } = renderList([]);

      expect($("h2.govuk-heading-m").text()).toContain(en.searchCases);
      const input = $("#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("type")).toBe("text");
    });
  });

  describe("Empty court lists", () => {
    it("should render an empty court-lists container when there are no court lists", () => {
      const { $ } = renderList([]);

      expect($("#court-lists-container")).toHaveLength(1);
      expect($("#court-lists-container").children()).toHaveLength(0);
    });
  });

  describe("Court rooms and sessions", () => {
    it("should render the court room with the judiciary in the section heading", () => {
      const { $ } = renderList([
        buildCourtHouse({ courtRoom: [buildSession({ courtRoomName: "Court 1", formattedJudiciaries: "District Judge Smith", sittings: [] })] })
      ]);

      const heading = $(".govuk-accordion__section-button").text();
      expect(heading).toContain("Court 1");
      expect(heading).toContain("District Judge Smith");
      expect($(".govuk-accordion").length).toBeGreaterThanOrEqual(1);
    });

    it("should render the court room without a judiciary segment when none is provided", () => {
      const { $ } = renderList([buildCourtHouse({ courtRoom: [buildSession({ courtRoomName: "Court 2", formattedJudiciaries: "", sittings: [] })] })]);

      const heading = $(".govuk-accordion__section-button").text().replace(/\s+/g, " ").trim();
      expect(heading).toBe("Court 2");
    });
  });

  describe("Cases table", () => {
    it("should render the table headers in order", () => {
      const { $ } = renderList([buildCourtHouse()]);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([en.sittingAt, en.urn, en.name, en.hearingType, en.prosecutingAuthority]);
    });

    it("should place a fully populated case in its correct columns with offence and restriction rows", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({
                  hearing: [
                    buildHearing({
                      hearingType: "Trial",
                      cases: [
                        buildCase({
                          caseUrn: "12AA3456789",
                          defendant: "John Smith",
                          prosecutingAuthority: "Crown Prosecution Service",
                          offences: ["Theft", "Assault"],
                          reportingRestriction: true
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.sittingAt]).toBe("10:00am");
      expect(cells[COLUMN.urn]).toBe("12AA3456789");
      expect(cells[COLUMN.name]).toBe("John Smith");
      expect(cells[COLUMN.hearingType]).toBe("Trial");
      expect(cells[COLUMN.prosecutor]).toBe("Crown Prosecution Service");

      const offenceRow = $("tbody.govuk-table__body tr").filter((_, r) => $(r).text().includes(en.offenceDetails));
      expect(offenceRow).toHaveLength(1);
      expect(offenceRow.text()).toContain("Theft");
      expect(offenceRow.text()).toContain("Assault");

      const restrictionRow = $("tbody.govuk-table__body tr").filter((_, r) => $(r).text().includes(en.reportingRestrictions));
      expect(restrictionRow).toHaveLength(1);
      expect(restrictionRow.text()).toContain(en.reportingRestrictionText);
    });

    it("should not render an offence-details row when the case has no offences", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({ hearing: [buildHearing({ hearingType: "Plea Hearing", cases: [buildCase({ defendant: "Jane Doe", offences: [] })] })] })
              ]
            })
          ]
        })
      ]);

      expect(firstDataRowCells($)[COLUMN.name]).toBe("Jane Doe");
      expect($("tbody.govuk-table__body tr").filter((_, r) => $(r).text().includes(en.offenceDetails))).toHaveLength(0);
    });

    it("should not render a restriction row when the case has no reporting restriction", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [buildSitting({ hearing: [buildHearing({ cases: [buildCase({ offences: ["Theft"], reportingRestriction: false })] })] })]
            })
          ]
        })
      ]);

      expect($("tbody.govuk-table__body tr").filter((_, r) => $(r).text().includes(en.reportingRestrictionText))).toHaveLength(0);
    });

    it("should add the no-border class to the case row when it has following detail rows", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [buildSitting({ hearing: [buildHearing({ cases: [buildCase({ offences: ["Theft"] })] })] })]
            })
          ]
        })
      ]);

      const firstRowCells = $("tbody.govuk-table__body tr").first().find("td");
      expect(firstRowCells.first().hasClass("no-border-bottom")).toBe(true);
    });
  });

  describe("Applications", () => {
    it("should place a fully populated application in its correct columns with an offence row", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({
                  time: "2:00pm",
                  hearing: [
                    buildHearing({
                      hearingType: "Application",
                      cases: [],
                      applications: [
                        buildApplication({
                          applicationReference: "APP-2026-001",
                          defendant: "David Brown",
                          prosecutingAuthority: "Local Authority",
                          offences: ["Public Order Offence"]
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.sittingAt]).toBe("2:00pm");
      expect(cells[COLUMN.urn]).toBe("APP-2026-001");
      expect(cells[COLUMN.name]).toBe("David Brown");
      expect(cells[COLUMN.prosecutor]).toBe("Local Authority");

      const offenceRow = $("tbody.govuk-table__body tr").filter((_, r) => $(r).text().includes(en.offenceDetails));
      expect(offenceRow).toHaveLength(1);
      expect(offenceRow.text()).toContain("Public Order Offence");
    });

    it("should not render an offence-details row when the application has no offences", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({
                  time: "2:00pm",
                  hearing: [
                    buildHearing({
                      hearingType: "Application",
                      cases: [],
                      applications: [buildApplication({ applicationReference: "APP-2026-002", defendant: "Sarah Green", offences: [] })]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]);

      expect(firstDataRowCells($)[COLUMN.urn]).toBe("APP-2026-002");
      expect($("tbody.govuk-table__body tr").filter((_, r) => $(r).text().includes(en.offenceDetails))).toHaveLength(0);
    });

    it("should render an empty hearing-type cell for applications", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({
                  time: "2:00pm",
                  hearing: [
                    buildHearing({
                      hearingType: "",
                      cases: [],
                      applications: [buildApplication({ applicationReference: "APP-2026-001", defendant: "Test Name" })]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.urn]).toBe("APP-2026-001");
      expect(cells[COLUMN.hearingType]).toBe("");
    });
  });

  describe("Multiple items", () => {
    it("should render a row per case within a single sitting", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({
                  hearing: [
                    buildHearing({
                      cases: [
                        buildCase({ caseUrn: "12AA3456789", defendant: "John Smith" }),
                        buildCase({ caseUrn: "12BB9876543", defendant: "Jane Doe", prosecutingAuthority: "Local Authority" })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]);

      expect(dataRowsColumn($, COLUMN.urn)).toEqual(["12AA3456789", "12BB9876543"]);
      expect(dataRowsColumn($, COLUMN.name)).toEqual(["John Smith", "Jane Doe"]);
    });

    it("should render a row per sitting", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({ time: "10:00am", hearing: [buildHearing({ cases: [buildCase({ caseUrn: "12AA3456789", defendant: "Morning Case" })] })] }),
                buildSitting({
                  time: "2:00pm",
                  hearing: [buildHearing({ hearingType: "Sentencing", cases: [buildCase({ caseUrn: "12BB9876543", defendant: "Afternoon Case" })] })]
                })
              ]
            })
          ]
        })
      ]);

      expect(dataRowsColumn($, COLUMN.sittingAt)).toEqual(["10:00am", "2:00pm"]);
      expect(dataRowsColumn($, COLUMN.name)).toEqual(["Morning Case", "Afternoon Case"]);
    });

    it("should render one accordion section and table per court room", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              courtRoomName: "Court 1",
              formattedJudiciaries: "District Judge A",
              sittings: [buildSitting({ hearing: [buildHearing({ cases: [buildCase({ caseUrn: "12AA3456789", defendant: "Court One Case" })] })] })]
            }),
            buildSession({
              courtRoomName: "Court 2",
              formattedJudiciaries: "District Judge B",
              sittings: [
                buildSitting({
                  hearing: [buildHearing({ hearingType: "Sentencing", cases: [buildCase({ caseUrn: "12BB9876543", defendant: "Court Two Case" })] })]
                })
              ]
            })
          ]
        })
      ]);

      expect($(".govuk-accordion__section")).toHaveLength(2);
      expect($("table")).toHaveLength(2);
      const headings = $(".govuk-accordion__section-button")
        .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
        .get();
      expect(headings).toEqual(["Court 1: District Judge A", "Court 2: District Judge B"]);
      expect(dataRowsColumn($, COLUMN.name)).toEqual(["Court One Case", "Court Two Case"]);
    });

    it("should render both case and application rows within one hearing", () => {
      const { $ } = renderList([
        buildCourtHouse({
          courtRoom: [
            buildSession({
              sittings: [
                buildSitting({
                  hearing: [
                    buildHearing({
                      hearingType: "Mixed",
                      cases: [buildCase({ caseUrn: "12AA3456789", defendant: "Case Defendant" })],
                      applications: [buildApplication({ applicationReference: "APP-2026-001", defendant: "Application Defendant" })]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]);

      expect(dataRowsColumn($, COLUMN.urn)).toEqual(["12AA3456789", "APP-2026-001"]);
      expect(dataRowsColumn($, COLUMN.name)).toEqual(["Case Defendant", "Application Defendant"]);
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Manual Upload" });

      const footer = $("p.govuk-body").filter((_, el) => $(el).text().includes(en.dataSource));
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("Manual Upload");
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, labels and restriction information", () => {
      const { $ } = renderList([], {}, cy);

      expect($("h2.govuk-heading-l").first().text()).toContain(cy.header);
      expect($("p.govuk-body.govuk-\\!-font-weight-bold").text()).toContain(cy.listDate);
      expect($("h2.govuk-heading-m").text()).toContain(cy.searchCases);
      const sectionText = $(".restriction-list-section").text();
      expect(sectionText).toContain(cy.restrictionInformationHeading);
      expect(sectionText).toContain(cy.restrictionInformationP1);
      expect(sectionText).toContain(cy.restrictionInformationBoldText);
    });

    it("should render Welsh table headers in order", () => {
      const { $ } = renderList([buildCourtHouse()], {}, cy);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([cy.sittingAt, cy.urn, cy.name, cy.hearingType, cy.prosecutingAuthority]);
    });
  });
});
