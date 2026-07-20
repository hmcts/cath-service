import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { magistratesStandardListCy as cy, magistratesStandardListEn as en } from "@hmcts/magistrates-standard-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "magistrates-standard-list.njk";

interface PartyOverrides {
  name?: string;
  dob?: string;
  age?: string;
  address?: string;
  asn?: string;
  pncId?: string;
}

interface HearingOverrides {
  reference?: string;
  applicationType?: string;
  applicationParticulars?: string;
  hearingType?: string;
  prosecutingAuthority?: string;
  panel?: string;
  attendanceMethod?: string;
  reportingRestriction?: boolean;
  reportingRestrictionDetails?: string;
  partyInfo?: PartyOverrides;
  offences?: unknown[];
}

// Fixture builders — each layer defaults to a realistic minimal shape and only
// the varied leaf fields are passed per test, keeping the nested list tree
// (room → sitting → hearing → partyInfo/offence) out of individual tests.
function buildHearing(overrides: HearingOverrides = {}) {
  const { partyInfo, ...rest } = overrides;
  return {
    reference: "12345678",
    hearingType: "Trial",
    prosecutingAuthority: "CPS",
    panel: "Panel",
    attendanceMethod: "In Person",
    offences: [],
    ...rest,
    partyInfo: {
      name: "John Smith",
      address: "123 Test Street",
      asn: "ASN123",
      pncId: "PNC123",
      ...partyInfo
    }
  };
}

function buildSitting({ sittingHeading = "10:00am", hearings }: { sittingHeading?: string; hearings?: unknown[] } = {}) {
  return { sittingHeading, hearings: hearings ?? [buildHearing()] };
}

function buildRoom({
  courtHouseName,
  lja,
  courtRoomName = "Court 1",
  sittings
}: {
  courtHouseName?: string;
  lja?: string;
  courtRoomName?: string;
  sittings?: unknown[];
} = {}) {
  return { courtHouseName, lja, courtRoomName, sittings: sittings ?? [buildSitting()] };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    en,
    cy,
    header: {
      locationName: "Test Magistrates Court",
      contentDate: "13 July 2026",
      publishedDate: "13 July 2026",
      publishedTime: "9:00am",
      venueAddress: ["1 Court Street", "Test City", "TC1 1AA"]
    },
    dataSource: "Test Source"
  };
}

function renderList(listData: unknown[], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, listData });
}

// The hearing details are laid out as label/value paragraphs (a
// `.linked-cases-heading` span carrying the label, followed by the value in the
// same paragraph). Returning the whole paragraph text lets a value under the
// wrong label fail.
function fieldText($: CheerioAPI, label: string) {
  const heading = $("span.linked-cases-heading").filter((_, el) => $(el).text().trim() === label.trim());
  return heading.first().parent().text().replace(/\s+/g, " ").trim();
}

// Offence details render as a two-column table: a label cell then its value
// cell. Reads the value cell adjacent to the given label.
function offenceRowValue($: CheerioAPI, label: string) {
  const heading = $("details.govuk-details span.linked-cases-heading").filter((_, el) => $(el).text().trim() === label.trim());
  return heading.first().closest("td").next("td").text().replace(/\s+/g, " ").trim();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("magistrates-standard-list template", () => {
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

      const heading = $("h2.govuk-heading-l").first().text();
      expect(heading).toContain(en.pageTitle);
      expect(heading).toContain("Test Magistrates Court");
    });

    it("should render the FACT link with the configured text and URL", () => {
      const { $ } = renderList([]);

      const factLink = $(`a[href="${en.factLinkUrl}"]`);
      expect(factLink).toHaveLength(1);
      expect(factLink.text()).toContain(en.factLinkText);
    });

    it("should render the reporting-restrictions guidance section", () => {
      const { $ } = renderList([]);

      const section = $(".restriction-list-section");
      expect(section).toHaveLength(1);
      expect(section.find("h2").text()).toContain(en.restrictionInformationHeading);
      expect(section.find(".govuk-warning-text__text").text()).toContain(en.restrictionInformationBoldText);
    });

    it("should render the case search input", () => {
      const { $ } = renderList([]);

      expect($("#case-search-input")).toHaveLength(1);
      const searchHeading = $("h2.govuk-heading-m").filter((_, el) => $(el).text().includes(en.searchCases));
      expect(searchHeading).toHaveLength(1);
    });
  });

  describe("Venue address", () => {
    it("should render each venue address line when present", () => {
      const { $ } = renderList([], { header: { ...baseData().header, venueAddress: ["123 Main Street", "Test Town", "TT1 1AA"] } });

      for (const line of ["123 Main Street", "Test Town", "TT1 1AA"]) {
        expect($("p.govuk-body").filter((_, el) => $(el).text().includes(line))).not.toHaveLength(0);
      }
    });

    it("should render the header and no-hearings message with an empty venue address", () => {
      const { $ } = renderList([], { header: { ...baseData().header, venueAddress: [] } });

      expect($("h2.govuk-heading-l").first().text()).toContain("Test Magistrates Court");
      expect($("p.govuk-body").filter((_, el) => $(el).text().trim() === en.noHearings)).toHaveLength(1);
    });
  });

  describe("No hearings", () => {
    it("should render the no-hearings message when there is no list data", () => {
      const { $ } = renderList([]);

      expect($("p.govuk-body").filter((_, el) => $(el).text().trim() === en.noHearings)).toHaveLength(1);
    });
  });

  describe("Court room headings", () => {
    it("should render the court house name and court room name", () => {
      const { $ } = renderList([buildRoom({ courtHouseName: "Test Magistrates Court Building", courtRoomName: "Court 1", sittings: [] })]);

      const siteAddresses = $(".site-header h1.site-address")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(siteAddresses).toContain("Test Magistrates Court Building");
      expect(siteAddresses).toContain("Court 1");
    });

    it("should render the LJA heading when present", () => {
      const { $ } = renderList([buildRoom({ courtRoomName: "Court 2", lja: "Greater London", sittings: [] })]);

      const ljaHeading = $(".site-header h1.site-address").filter((_, el) => $(el).text().includes(en.lja));
      expect(ljaHeading).toHaveLength(1);
      expect(ljaHeading.text()).toContain("Greater London");
    });

    it("should not render an LJA heading when absent", () => {
      const { $ } = renderList([buildRoom({ courtRoomName: "Court 3", sittings: [] })]);

      const siteAddresses = $(".site-header h1.site-address")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(siteAddresses).toEqual(["Court 3"]);
    });
  });

  describe("Sittings", () => {
    it("should render the sitting heading", () => {
      const { $ } = renderList([buildRoom({ sittings: [buildSitting({ sittingHeading: "10:00am", hearings: [] })] })]);

      const heading = $(".govuk-accordion__section-button").text();
      expect(heading).toContain(en.sittingAt);
      expect(heading).toContain("10:00am");
    });

    it("should render each sitting as its own accordion section", () => {
      const { $ } = renderList([
        buildRoom({
          sittings: [buildSitting({ sittingHeading: "9:30am", hearings: [] }), buildSitting({ sittingHeading: "2:00pm", hearings: [] })]
        })
      ]);

      expect($(".govuk-accordion__section")).toHaveLength(2);
      const headings = $(".govuk-accordion__section-button")
        .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
        .get();
      expect(headings).toEqual([`${en.sittingAt}9:30am`, `${en.sittingAt}2:00pm`]);
    });
  });

  describe("Hearing details", () => {
    it("should place each hearing field under its correct label", () => {
      const { $ } = renderList([
        buildRoom({
          sittings: [
            buildSitting({
              hearings: [
                buildHearing({
                  reference: "12345678",
                  applicationType: "First Appearance",
                  applicationParticulars: "Breach of bail conditions",
                  hearingType: "Trial",
                  prosecutingAuthority: "Crown Prosecution Service",
                  panel: "Lay Panel",
                  attendanceMethod: "In Person",
                  reportingRestriction: true,
                  reportingRestrictionDetails: "Section 39 applies",
                  partyInfo: {
                    name: "John Smith",
                    dob: "01/01/1980",
                    age: "44",
                    address: "123 Test Street, Test City, TC1 1AA",
                    asn: "ASN12345",
                    pncId: "PNC54321"
                  }
                })
              ]
            })
          ]
        })
      ]);

      expect(fieldText($, en.name)).toContain("John Smith");
      expect(fieldText($, en.applicationParticulars)).toContain("Breach of bail conditions");
      expect(fieldText($, en.dobAndAge)).toContain("01/01/1980");
      expect(fieldText($, en.dobAndAge)).toContain("44");
      expect(fieldText($, en.address)).toContain("123 Test Street, Test City, TC1 1AA");
      expect(fieldText($, en.prosecutingAuthority)).toContain("Crown Prosecution Service");
      expect(fieldText($, en.attendanceMethod)).toContain("In Person");
      expect(fieldText($, en.reportingRestrictions)).toContain("Section 39 applies");
      expect(fieldText($, en.reference)).toContain("12345678");
      expect(fieldText($, en.applicationType)).toContain("First Appearance");
      expect(fieldText($, en.asn)).toContain("ASN12345");
      expect(fieldText($, en.pncId)).toContain("PNC54321");
      expect(fieldText($, en.hearingType)).toContain("Trial");
      expect(fieldText($, en.panel)).toContain("Lay Panel");
    });

    it("should omit optional fields when they are not provided", () => {
      const { $ } = renderList([
        buildRoom({
          sittings: [
            buildSitting({
              hearings: [
                buildHearing({
                  reference: "87654321",
                  hearingType: "Hearing",
                  prosecutingAuthority: "Local Authority",
                  panel: "District Judge",
                  attendanceMethod: "Video",
                  partyInfo: { name: "Jane Doe", address: "456 Another Street", asn: "ASN67890", pncId: "PNC09876" }
                })
              ]
            })
          ]
        })
      ]);

      expect(fieldText($, en.name)).toContain("Jane Doe");
      expect(fieldText($, en.reference)).toContain("87654321");
      expect($("span.linked-cases-heading").filter((_, el) => $(el).text().trim() === en.applicationType.trim())).toHaveLength(0);
      expect($("span.linked-cases-heading").filter((_, el) => $(el).text().trim() === en.applicationParticulars.trim())).toHaveLength(0);
      expect($("span.linked-cases-heading").filter((_, el) => $(el).text().trim() === en.reportingRestrictions.trim())).toHaveLength(0);
    });

    it("should render the DOB-and-age field with only a date of birth", () => {
      const { $ } = renderList([
        buildRoom({
          sittings: [buildSitting({ hearings: [buildHearing({ partyInfo: { name: "Test Person", dob: "15/03/1990" } })] })]
        })
      ]);

      const dobField = fieldText($, en.dobAndAge);
      expect(dobField).toContain("15/03/1990");
      expect(fieldText($, en.name)).toContain("Test Person");
    });

    it("should render the DOB-and-age field with only an age", () => {
      const { $ } = renderList([
        buildRoom({
          sittings: [buildSitting({ hearings: [buildHearing({ partyInfo: { name: "Another Person", age: "35" } })] })]
        })
      ]);

      expect(fieldText($, en.dobAndAge)).toContain("35");
    });

    it("should render each hearing in its own box with a border between multiple hearings", () => {
      const { $ } = renderList([
        buildRoom({
          sittings: [
            buildSitting({
              hearings: [buildHearing({ partyInfo: { name: "First Defendant" } }), buildHearing({ partyInfo: { name: "Second Defendant" } })]
            })
          ]
        })
      ]);

      expect($(".parent-box")).toHaveLength(2);
      expect($(".parent-box.add-border-bottom")).toHaveLength(1);
      const names = $(".parent-box")
        .map((_, el) => fieldTextIn($, el, en.name))
        .get();
      expect(names).toEqual(["First Defendant", "Second Defendant"]);
    });
  });

  describe("Offences", () => {
    it("should render an offence with all its details", () => {
      const { $ } = renderList([
        buildRoom({
          sittings: [
            buildSitting({
              hearings: [
                buildHearing({
                  offences: [
                    {
                      offenceTitle: "Theft",
                      offenceCode: "TH001",
                      offenceWording: "Theft from a shop",
                      offenceLegislation: "Theft Act 1968, s.1",
                      offenceMaxPenalty: "7 years imprisonment",
                      plea: "Not Guilty",
                      pleaDate: "01/01/2026",
                      convictionDate: "15/01/2026",
                      adjournedDate: "10/01/2026",
                      reportingRestriction: true,
                      reportingRestrictionDetails: "Section 4(2) applies"
                    }
                  ]
                })
              ]
            })
          ]
        })
      ]);

      const summary = $("details.govuk-details .govuk-details__summary-text").text().replace(/\s+/g, " ").trim();
      expect(summary).toContain("TH001");
      expect(summary).toContain("Theft");
      expect($("details.govuk-details .govuk-details__text td")).not.toHaveLength(0);
      expect($("details.govuk-details .govuk-details__text").text()).toContain("Theft from a shop");
      expect(offenceRowValue($, en.legislation)).toBe("Theft Act 1968, s.1");
      expect(offenceRowValue($, en.maxPenalty)).toBe("7 years imprisonment");
      expect(offenceRowValue($, en.plea)).toBe("Not Guilty");
      expect(offenceRowValue($, en.dateOfPlea)).toBe("01/01/2026");
      expect(offenceRowValue($, en.convictedOn)).toBe("15/01/2026");
      expect(offenceRowValue($, en.adjournedFrom)).toBe(`10/01/2026 - ${en.adjournedText}`);
      expect(offenceRowValue($, en.reportingRestrictions)).toBe("Section 4(2) applies");
    });

    it("should render an offence with a title only", () => {
      const { $ } = renderList([buildRoom({ sittings: [buildSitting({ hearings: [buildHearing({ offences: [{ offenceTitle: "Simple Offence" }] })] })] })]);

      expect($("details.govuk-details")).toHaveLength(1);
      expect($("details.govuk-details .govuk-details__summary-text").text()).toContain("Simple Offence");
      expect(offenceRowValue($, en.legislation)).toBe("");
      expect(offenceRowValue($, en.maxPenalty)).toBe("");
    });

    it("should render the offence code and title separated by a dash", () => {
      const { $ } = renderList([
        buildRoom({
          sittings: [buildSitting({ hearings: [buildHearing({ offences: [{ offenceCode: "ABC123", offenceTitle: "Test Offence" }] })] })]
        })
      ]);

      const summary = $("details.govuk-details .govuk-details__summary-text").text().replace(/\s+/g, " ").trim();
      expect(summary).toContain("ABC123");
      expect(summary).toContain("-");
      expect(summary).toContain("Test Offence");
    });

    it("should number multiple offences", () => {
      const { $ } = renderList([
        buildRoom({
          sittings: [
            buildSitting({
              hearings: [buildHearing({ offences: [{ offenceTitle: "First Offence" }, { offenceTitle: "Second Offence" }, { offenceTitle: "Third Offence" }] })]
            })
          ]
        })
      ]);

      expect($("details.govuk-details")).toHaveLength(3);
      const summaries = $("details.govuk-details .govuk-details__summary-text")
        .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
        .get();
      expect(summaries[0]).toContain("1.");
      expect(summaries[0]).toContain("First Offence");
      expect(summaries[1]).toContain("2.");
      expect(summaries[1]).toContain("Second Offence");
      expect(summaries[2]).toContain("3.");
      expect(summaries[2]).toContain("Third Offence");
    });

    it("should not render an offence without a title", () => {
      const { $ } = renderList([buildRoom({ sittings: [buildSitting({ hearings: [buildHearing({ offences: [{ offenceCode: "CODE123" }] })] })] })]);

      expect($("details.govuk-details")).toHaveLength(0);
      expect($(".govuk-details__summary-text").filter((_, el) => $(el).text().includes("CODE123"))).toHaveLength(0);
    });
  });

  describe("Footer", () => {
    it("should render the data source", () => {
      const { $ } = renderList([], { dataSource: "Magistrates Data Platform" });

      const footer = $("p.govuk-body-s");
      expect(footer.text()).toContain(en.dataSource);
      expect(footer.text()).toContain("Magistrates Data Platform");
    });

    it("should render a back-to-top link", () => {
      const { $ } = renderList([]);

      const backToTop = $("a[href='#main-content']");
      expect(backToTop.text()).toContain(en.linkToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, labels and offence rows", () => {
      const { $ } = renderList(
        [buildRoom({ sittings: [buildSitting({ hearings: [buildHearing({ offences: [{ offenceTitle: "Trosedd", offenceLegislation: "Deddf" }] })] })] })],
        {},
        cy
      );

      expect($("h2.govuk-heading-l").first().text()).toContain(cy.pageTitle);
      expect($(".govuk-accordion__section-button").text()).toContain(cy.sittingAt);
      expect(fieldText($, cy.name)).toContain("John Smith");
      expect(offenceRowValue($, cy.legislation)).toBe("Deddf");
      expect($("a[href='#main-content']").text()).toContain(cy.linkToTop);
    });
  });
});

// Reads a labelled field paragraph scoped to a single hearing box, so per-box
// values can be asserted when multiple hearings are rendered.
function fieldTextIn($: CheerioAPI, box: import("domhandler").Element, label: string) {
  const heading = $(box)
    .find("span.linked-cases-heading")
    .filter((_, el) => $(el).text().trim() === label.trim());
  return heading.first().parent().text().replace(label, "").replace(/\s+/g, " ").trim();
}
