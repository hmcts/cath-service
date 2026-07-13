import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rcjStandardDailyCauseListCy, rcjStandardDailyCauseListEn } from "@hmcts/rcj-standard-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");

const env = createTestEnvironment([__dirname, webCoreViews]);

describe("county-court-central-london-civil-daily-cause-list.njk", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "county-court-central-london-civil-daily-cause-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Locale content", () => {
    describe("English locale - COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST", () => {
      const content = rcjStandardDailyCauseListEn.COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST;

      it("should have all required keys", () => {
        const requiredKeys = ["pageTitle", "locationLine1", "locationLine2", "locationLine3", "locationLine4", "hearingsInfoText", "mediaAndObserversText"];

        requiredKeys.forEach((key) => {
          expect(content).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(content.pageTitle).toBe("County Court at Central London Civil Daily Cause List");
        expect(content.locationLine1).toBe("Royal Courts of Justice");
        expect(content.locationLine2).toBe("Thomas More Building");
        expect(content.locationLine3).toBe("Strand, London");
        expect(content.locationLine4).toBe("WC2A 2LL");
      });

      it("should have hearingsInfoText as string", () => {
        expect(typeof content.hearingsInfoText).toBe("string");
        expect(content.hearingsInfoText).toContain("Central London County Court");
        expect(content.hearingsInfoText).toContain("Thomas More Building");
      });

      it("should have mediaAndObserversText as string", () => {
        expect(typeof content.mediaAndObserversText).toBe("string");
        expect(content.mediaAndObserversText).toContain("enquiries.centrallondon.countycourt@justice.gov.uk");
      });
    });

    describe("Welsh locale - COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST", () => {
      const content = rcjStandardDailyCauseListCy.COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST;

      it("should have all required keys", () => {
        const requiredKeys = ["pageTitle", "locationLine1", "locationLine2", "locationLine3", "locationLine4", "hearingsInfoText", "mediaAndObserversText"];

        requiredKeys.forEach((key) => {
          expect(content).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(content.pageTitle).toBe("Rhestr Achosion Dyddiol Sifil yn y Llys Sirol yng Nghanol Llundain");
        expect(content.locationLine1).toBe("Llysoedd Barn Brenhinol");
        expect(content.locationLine2).toBe("Thomas More Building");
        expect(content.locationLine3).toBe("Strand, London");
        expect(content.locationLine4).toBe("WC2A 2LL");
      });

      it("should have hearingsInfoText as string", () => {
        expect(typeof content.hearingsInfoText).toBe("string");
        expect(content.hearingsInfoText).toContain("Llys Sirol Canol Llundain");
        expect(content.hearingsInfoText).toContain("Adeilad Thomas More");
      });

      it("should have mediaAndObserversText as string", () => {
        expect(typeof content.mediaAndObserversText).toBe("string");
        expect(content.mediaAndObserversText).toContain("enquiries.centrallondon.countycourt@justice.gov.uk");
      });
    });

    describe("English common locale", () => {
      const common = rcjStandardDailyCauseListEn.common;

      it("should have all required common keys", () => {
        const requiredKeys = [
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText",
          "importantInfoTitle",
          "searchCasesTitle",
          "searchCasesLabel",
          "tableHeaders",
          "dataSource",
          "backToTop",
          "listFor",
          "lastUpdated",
          "at"
        ];

        requiredKeys.forEach((key) => {
          expect(common).toHaveProperty(key);
        });
      });

      it("should have correct table header labels", () => {
        expect(common.tableHeaders.venue).toBe("Venue");
        expect(common.tableHeaders.judge).toBe("Judge");
        expect(common.tableHeaders.time).toBe("Time");
        expect(common.tableHeaders.caseNumber).toBe("Case number");
        expect(common.tableHeaders.caseDetails).toBe("Case details");
        expect(common.tableHeaders.hearingType).toBe("Hearing type");
        expect(common.tableHeaders.additionalInformation).toBe("Additional information");
      });

      it("should have correct common text values", () => {
        expect(common.listFor).toBe("List for");
        expect(common.lastUpdated).toBe("Last updated");
        expect(common.at).toBe("at");
        expect(common.backToTop).toBe("Back to top");
        expect(common.dataSource).toBe("Data source");
        expect(common.searchCasesTitle).toBe("Search Cases");
        expect(common.importantInfoTitle).toBe("Important information");
      });

      it("should have correct URL values", () => {
        expect(common.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
      });
    });

    describe("Welsh common locale", () => {
      const common = rcjStandardDailyCauseListCy.common;

      it("should have all required common keys", () => {
        const requiredKeys = [
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText",
          "importantInfoTitle",
          "searchCasesTitle",
          "searchCasesLabel",
          "tableHeaders",
          "dataSource",
          "backToTop",
          "listFor",
          "lastUpdated",
          "at"
        ];

        requiredKeys.forEach((key) => {
          expect(common).toHaveProperty(key);
        });
      });

      it("should have correct table header labels", () => {
        expect(common.tableHeaders.venue).toBe("Lleoliad");
        expect(common.tableHeaders.judge).toBe("Barnwr");
        expect(common.tableHeaders.time).toBe("Amser");
        expect(common.tableHeaders.caseNumber).toBe("Rhif yr achos");
        expect(common.tableHeaders.caseDetails).toBe("Manylion yr achos");
        expect(common.tableHeaders.hearingType).toBe("Math o wrandawiad");
        expect(common.tableHeaders.additionalInformation).toBe("Gwybodaeth ychwanegol");
      });

      it("should have correct common text values", () => {
        expect(common.listFor).toBe("Rhestr ar gyfer");
        expect(common.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(common.at).toBe("am");
        expect(common.backToTop).toBe("Yn ôl i frig y dudalen");
        expect(common.dataSource).toBe("Ffynhonnell data");
        expect(common.searchCasesTitle).toBe("Chwilio Achosion");
        expect(common.importantInfoTitle).toBe("Gwybodaeth bwysig");
      });

      it("should have correct URL values", () => {
        expect(common.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
      });
    });

    describe("Locale consistency", () => {
      it("should have same structure in English and Welsh for COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST", () => {
        const enKeys = Object.keys(rcjStandardDailyCauseListEn.COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST).sort();
        const cyKeys = Object.keys(rcjStandardDailyCauseListCy.COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST).sort();
        expect(enKeys).toEqual(cyKeys);
      });

      it("should have same structure in English and Welsh for common keys", () => {
        const enCommonKeys = Object.keys(rcjStandardDailyCauseListEn.common).sort();
        const cyCommonKeys = Object.keys(rcjStandardDailyCauseListCy.common).sort();
        expect(enCommonKeys).toEqual(cyCommonKeys);
      });

      it("should have same types for each COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST key", () => {
        const enContent = rcjStandardDailyCauseListEn.COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST;
        const cyContent = rcjStandardDailyCauseListCy.COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST;

        Object.keys(enContent).forEach((key) => {
          const enType = typeof enContent[key as keyof typeof enContent];
          const cyType = typeof cyContent[key as keyof typeof cyContent];
          expect(enType).toBe(cyType);
        });
      });

      it("should have same types for each common key", () => {
        const enCommon = rcjStandardDailyCauseListEn.common;
        const cyCommon = rcjStandardDailyCauseListCy.common;

        Object.keys(enCommon).forEach((key) => {
          const enType = typeof enCommon[key as keyof typeof enCommon];
          const cyType = typeof cyCommon[key as keyof typeof cyCommon];
          expect(enType).toBe(cyType);
        });
      });
    });
  });

  describe("Template rendering", () => {
    const listContent = rcjStandardDailyCauseListEn.COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST;
    const common = rcjStandardDailyCauseListEn.common;

    describe("Header section", () => {
      it("should render with complete header data", () => {
        const data = {
          header: {
            listTitle: "County Court at Central London Civil Daily Cause List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain("County Court at Central London Civil Daily Cause List");
        expect(html).toContain("List for 15 January 2026");
        expect(html).toContain("Last updated 14 January 2026 at 12:00pm");
      });
    });

    describe("Location section", () => {
      it("should render all four location lines", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain("Royal Courts of Justice");
        expect(html).toContain("Thomas More Building");
        expect(html).toContain("Strand, London");
        expect(html).toContain("WC2A 2LL");
      });

      it("should render location lines with correct structure", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toMatch(/govuk-!-font-weight-bold.*Royal Courts of Justice/s);
        expect(html).toMatch(/govuk-!-margin-bottom-0.*Thomas More Building/s);
      });
    });

    describe("Important information section", () => {
      it("should render Important information details component", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain("Important information");
        expect(html).toContain("Central London County Court");
        expect(html).toContain("enquiries.centrallondon.countycourt@justice.gov.uk");
      });

      it("should render details component as open by default", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain("open");
        expect(html).toContain("govuk-details");
      });
    });

    describe("Search section", () => {
      it("should render search input with correct labels", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain("Search Cases");
        expect(html).toContain("case-search-input");
        expect(html).toContain("Search by case number, details, venue, judge, or other information");
      });

      it("should render search input with visually hidden label", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toMatch(/govuk-visually-hidden.*Search by case number/s);
      });
    });

    describe("Table headers", () => {
      it("should render all seven table headers", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain("Venue");
        expect(html).toContain("Judge");
        expect(html).toContain("Time");
        expect(html).toContain("Case number");
        expect(html).toContain("Case details");
        expect(html).toContain("Hearing type");
        expect(html).toContain("Additional information");
      });

      it("should render table headers as scope col", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        const headerMatches = html.match(/<th scope="col"/g);
        expect(headerMatches).toHaveLength(7);
      });
    });

    describe("Hearings table", () => {
      it("should render empty table when hearings array is empty", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain("govuk-table__body");
        expect(html).not.toContain("<td");
      });

      it("should render single hearing row with all fields", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [
            {
              venue: "Court 1",
              judge: "Mr Justice Smith",
              time: "10:00am",
              caseNumber: "AB123456",
              caseDetails: "Smith v Jones",
              hearingType: "Application",
              additionalInformation: "In person"
            }
          ],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain("Court 1");
        expect(html).toContain("Mr Justice Smith");
        expect(html).toContain("10:00am");
        expect(html).toContain("AB123456");
        expect(html).toContain("Smith v Jones");
        expect(html).toContain("Application");
        expect(html).toContain("In person");
      });

      it("should render multiple hearing rows", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [
            {
              venue: "Court 1",
              judge: "Mr Justice Smith",
              time: "10:00am",
              caseNumber: "AB123456",
              caseDetails: "Smith v Jones",
              hearingType: "Application",
              additionalInformation: "In person"
            },
            {
              venue: "Court 2",
              judge: "Mrs Justice Brown",
              time: "11:00am",
              caseNumber: "CD789012",
              caseDetails: "Brown v White",
              hearingType: "Trial",
              additionalInformation: "Remote"
            }
          ],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain("Court 1");
        expect(html).toContain("Court 2");
        expect(html).toContain("Smith v Jones");
        expect(html).toContain("Brown v White");
        expect(html).toContain("AB123456");
        expect(html).toContain("CD789012");
      });

      it("should render hearing with empty fields", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [
            {
              venue: "",
              judge: "",
              time: "10:00am",
              caseNumber: "AB123456",
              caseDetails: "",
              hearingType: "",
              additionalInformation: ""
            }
          ],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain("AB123456");
        expect(html).toContain("10:00am");
        const cellMatches = html.match(/<td class="govuk-table__cell"><\/td>/g);
        expect(cellMatches?.length).toBeGreaterThan(0);
      });
    });

    describe("Footer section", () => {
      it("should render data source", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain("Data source: Manual Upload");
      });

      it("should render back to top link", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain('href="#top"');
        expect(html).toContain("Back to top");
      });

      it("should render different data source values", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [],
          dataSource: "CPP"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain("Data source: CPP");
      });
    });

    describe("FACT link section", () => {
      it("should render FACT link with correct text and URL", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("https://www.find-court-tribunal.service.gov.uk/");
        expect(html).toContain("in England and Wales");
      });
    });

    describe("Accessibility attributes", () => {
      it("should render table with aria-label", () => {
        const data = {
          header: {
            listTitle: "County Court at Central London Civil Daily Cause List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain('aria-label="County Court at Central London Civil Daily Cause List"');
      });

      it("should render top anchor for back to top link", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 January 2026",
            lastUpdatedDate: "14 January 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent,
          common,
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain('id="top"');
      });
    });

    describe("Welsh locale rendering", () => {
      const listContentCy = rcjStandardDailyCauseListCy.COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST;
      const commonCy = rcjStandardDailyCauseListCy.common;

      it("should render with Welsh content", () => {
        const data = {
          header: {
            listTitle: "Rhestr Achosion Dyddiol Sifil yn y Llys Sirol yng Nghanol Llundain",
            listDate: "15 Ionawr 2026",
            lastUpdatedDate: "14 Ionawr 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent: listContentCy,
          common: commonCy,
          hearings: [],
          dataSource: "Llwytho â Llaw"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain("Rhestr Achosion Dyddiol Sifil yn y Llys Sirol yng Nghanol Llundain");
        expect(html).toContain("Llysoedd Barn Brenhinol");
        expect(html).toContain("Gwybodaeth bwysig");
        expect(html).toContain("Chwilio Achosion");
      });

      it("should render Welsh table headers", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 Ionawr 2026",
            lastUpdatedDate: "14 Ionawr 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent: listContentCy,
          common: commonCy,
          hearings: [],
          dataSource: "Llwytho â Llaw"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain("Lleoliad");
        expect(html).toContain("Barnwr");
        expect(html).toContain("Amser");
        expect(html).toContain("Rhif yr achos");
        expect(html).toContain("Manylion yr achos");
        expect(html).toContain("Math o wrandawiad");
        expect(html).toContain("Gwybodaeth ychwanegol");
      });

      it("should render Welsh footer text", () => {
        const data = {
          header: {
            listTitle: "Test List",
            listDate: "15 Ionawr 2026",
            lastUpdatedDate: "14 Ionawr 2026",
            lastUpdatedTime: "12:00pm"
          },
          listContent: listContentCy,
          common: commonCy,
          hearings: [],
          dataSource: "Llwytho â Llaw"
        };

        const { html } = render(env, "county-court-central-london-civil-daily-cause-list.njk", data);

        expect(html).toContain("Ffynhonnell data: Llwytho â Llaw");
        expect(html).toContain("Yn ôl i frig y dudalen");
      });
    });
  });

  describe("Template data contract", () => {
    it("should document required template variables", () => {
      const templateContract = {
        description: "County Court at Central London Civil Daily Cause List template requires the following variables",
        variables: {
          header: {
            type: "object",
            properties: {
              listTitle: { type: "string", example: "County Court at Central London Civil Daily Cause List" },
              listDate: { type: "string", example: "15 January 2026" },
              lastUpdatedDate: { type: "string", example: "14 January 2026" },
              lastUpdatedTime: { type: "string", example: "12:00pm" }
            },
            required: true
          },
          listContent: {
            type: "object",
            description: "COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST locale content",
            properties: {
              locationLine1: { type: "string", example: "Royal Courts of Justice" },
              locationLine2: { type: "string", example: "Thomas More Building" },
              locationLine3: { type: "string", example: "Strand, London" },
              locationLine4: { type: "string", example: "WC2A 2LL" },
              hearingsInfoText: { type: "string" },
              mediaAndObserversText: { type: "string" }
            },
            required: true
          },
          common: {
            type: "object",
            description: "Common locale content",
            properties: {
              factLinkText: { type: "string" },
              factLinkUrl: { type: "string" },
              factAdditionalText: { type: "string" },
              importantInfoTitle: { type: "string" },
              searchCasesTitle: { type: "string" },
              searchCasesLabel: { type: "string" },
              tableHeaders: {
                type: "object",
                properties: {
                  venue: { type: "string" },
                  judge: { type: "string" },
                  time: { type: "string" },
                  caseNumber: { type: "string" },
                  caseDetails: { type: "string" },
                  hearingType: { type: "string" },
                  additionalInformation: { type: "string" }
                }
              },
              dataSource: { type: "string" },
              backToTop: { type: "string" },
              listFor: { type: "string" },
              lastUpdated: { type: "string" },
              at: { type: "string" }
            },
            required: true
          },
          hearings: {
            type: "array",
            description: "Array of hearing objects",
            items: {
              type: "object",
              properties: {
                venue: { type: "string", example: "Court 1" },
                judge: { type: "string", example: "Mr Justice Smith" },
                time: { type: "string", example: "10:00am" },
                caseNumber: { type: "string", example: "AB123456" },
                caseDetails: { type: "string", example: "Smith v Jones" },
                hearingType: { type: "string", example: "Application" },
                additionalInformation: { type: "string", example: "In person" }
              }
            },
            required: true
          },
          dataSource: {
            type: "string",
            description: "Provenance label for data source",
            example: "Manual Upload",
            required: true
          }
        },
        conditionalLogic: {
          emptyFields: "All fields can be empty strings and will render as empty table cells",
          emptyHearings: "When hearings array is empty, only table headers are rendered",
          multipleHearings: "Each hearing in the array creates a new table row",
          importantInfo: "Details component is rendered as open by default",
          backToTop: "Back to top link references the #top anchor on the h1"
        }
      };

      expect(templateContract.description).toBeDefined();
      expect(templateContract.variables).toBeDefined();
      expect(templateContract.conditionalLogic).toBeDefined();
    });
  });
});
