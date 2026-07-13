import path from "node:path";
import { fileURLToPath } from "node:url";
import { rcjStandardDailyCauseListCy, rcjStandardDailyCauseListEn } from "@hmcts/rcj-standard-daily-cause-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

describe("civil-courts-rcj-daily-cause-list.njk", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = nunjucks.configure([__dirname, webCoreViews, govukFrontend], {
      autoescape: true,
      noCache: true
    });
  });

  describe("Locale content", () => {
    describe("English locale - CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST", () => {
      it("should have all required keys", () => {
        const required = ["pageTitle", "locationLine1", "locationLine2", "locationLine3", "mediaInquiriesText", "openJusticeText", "courtExclusionText"];
        required.forEach((key) => {
          expect(rcjStandardDailyCauseListEn.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST).toHaveProperty(key);
        });
      });

      it("should have correct pageTitle", () => {
        expect(rcjStandardDailyCauseListEn.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.pageTitle).toBe("Civil Courts at the Royal Courts of Justice Daily Cause List");
      });

      it("should have correct location details", () => {
        expect(rcjStandardDailyCauseListEn.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.locationLine1).toBe("Royal Courts of Justice");
        expect(rcjStandardDailyCauseListEn.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.locationLine2).toBe("Strand, London");
        expect(rcjStandardDailyCauseListEn.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.locationLine3).toBe("WC2A 2LL");
      });

      it("should have media inquiries text", () => {
        expect(rcjStandardDailyCauseListEn.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.mediaInquiriesText).toContain("mediaenquiries.civilcourtsatthercj@justice.gov.uk");
      });

      it("should have open justice text", () => {
        expect(rcjStandardDailyCauseListEn.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.openJusticeText).toContain("open justice");
      });

      it("should have court exclusion text", () => {
        expect(rcjStandardDailyCauseListEn.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.courtExclusionText).toContain("exclude observers");
      });
    });

    describe("English locale - common", () => {
      it("should have all required keys", () => {
        const required = [
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
        required.forEach((key) => {
          expect(rcjStandardDailyCauseListEn.common).toHaveProperty(key);
        });
      });

      it("should have correct FACT link details", () => {
        expect(rcjStandardDailyCauseListEn.common.factLinkText).toBe("Find contact details and other information about courts and tribunals");
        expect(rcjStandardDailyCauseListEn.common.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(rcjStandardDailyCauseListEn.common.factAdditionalText).toContain("England and Wales");
      });

      it("should have correct search labels", () => {
        expect(rcjStandardDailyCauseListEn.common.searchCasesTitle).toBe("Search Cases");
        expect(rcjStandardDailyCauseListEn.common.searchCasesLabel).toContain("case number");
      });

      it("should have all table headers", () => {
        const headers = rcjStandardDailyCauseListEn.common.tableHeaders;
        expect(headers.venue).toBe("Venue");
        expect(headers.judge).toBe("Judge");
        expect(headers.time).toBe("Time");
        expect(headers.caseNumber).toBe("Case number");
        expect(headers.caseDetails).toBe("Case details");
        expect(headers.hearingType).toBe("Hearing type");
        expect(headers.additionalInformation).toBe("Additional information");
      });

      it("should have correct navigation and metadata labels", () => {
        expect(rcjStandardDailyCauseListEn.common.backToTop).toBe("Back to top");
        expect(rcjStandardDailyCauseListEn.common.listFor).toBe("List for");
        expect(rcjStandardDailyCauseListEn.common.lastUpdated).toBe("Last updated");
        expect(rcjStandardDailyCauseListEn.common.at).toBe("at");
        expect(rcjStandardDailyCauseListEn.common.dataSource).toBe("Data source");
      });
    });

    describe("Welsh locale - CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST", () => {
      it("should have all required keys", () => {
        const required = ["pageTitle", "locationLine1", "locationLine2", "locationLine3", "mediaInquiriesText", "openJusticeText", "courtExclusionText"];
        required.forEach((key) => {
          expect(rcjStandardDailyCauseListCy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST).toHaveProperty(key);
        });
      });

      it("should have correct pageTitle", () => {
        expect(rcjStandardDailyCauseListCy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.pageTitle).toBe("Rhestr Achosion Dyddiol Llys Sifil yn y Llysoedd Barn Brenhinol");
      });

      it("should have correct location details", () => {
        expect(rcjStandardDailyCauseListCy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.locationLine1).toBe("Llysoedd Barn Brenhinol");
        expect(rcjStandardDailyCauseListCy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.locationLine2).toBe("Strand, London");
        expect(rcjStandardDailyCauseListCy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.locationLine3).toBe("WC2A 2LL");
      });

      it("should have media inquiries text in Welsh", () => {
        expect(rcjStandardDailyCauseListCy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.mediaInquiriesText).toContain("mediaenquiries.civilcourtsatthercj@justice.gov.uk");
      });

      it("should have open justice text in Welsh", () => {
        expect(rcjStandardDailyCauseListCy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.openJusticeText).toContain("cyfiawnder agored");
      });

      it("should have court exclusion text in Welsh", () => {
        expect(rcjStandardDailyCauseListCy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.courtExclusionText).toContain("eithrio arsylwyr");
      });
    });

    describe("Welsh locale - common", () => {
      it("should have all required keys", () => {
        const required = [
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
        required.forEach((key) => {
          expect(rcjStandardDailyCauseListCy.common).toHaveProperty(key);
        });
      });

      it("should have all table headers in Welsh", () => {
        const headers = rcjStandardDailyCauseListCy.common.tableHeaders;
        expect(headers.venue).toBe("Lleoliad");
        expect(headers.judge).toBe("Barnwr");
        expect(headers.time).toBe("Amser");
        expect(headers.caseNumber).toBe("Rhif yr achos");
        expect(headers.caseDetails).toBe("Manylion yr achos");
        expect(headers.hearingType).toBe("Math o wrandawiad");
        expect(headers.additionalInformation).toBe("Gwybodaeth ychwanegol");
      });

      it("should have correct navigation and metadata labels in Welsh", () => {
        expect(rcjStandardDailyCauseListCy.common.backToTop).toBe("Yn ôl i frig y dudalen");
        expect(rcjStandardDailyCauseListCy.common.listFor).toBe("Rhestr ar gyfer");
        expect(rcjStandardDailyCauseListCy.common.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(rcjStandardDailyCauseListCy.common.at).toBe("am");
        expect(rcjStandardDailyCauseListCy.common.dataSource).toBe("Ffynhonnell data");
      });
    });

    describe("Locale consistency", () => {
      it("should have same structure in English and Welsh for CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST", () => {
        expect(Object.keys(rcjStandardDailyCauseListEn.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST).sort()).toEqual(
          Object.keys(rcjStandardDailyCauseListCy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST).sort()
        );
      });

      it("should have same structure in English and Welsh for common", () => {
        expect(Object.keys(rcjStandardDailyCauseListEn.common).sort()).toEqual(Object.keys(rcjStandardDailyCauseListCy.common).sort());
      });

      it("should have same types for each key in common", () => {
        Object.keys(rcjStandardDailyCauseListEn.common).forEach((key) => {
          const enType = typeof rcjStandardDailyCauseListEn.common[key as keyof typeof rcjStandardDailyCauseListEn.common];
          const cyType = typeof rcjStandardDailyCauseListCy.common[key as keyof typeof rcjStandardDailyCauseListCy.common];
          expect(enType).toBe(cyType);
        });
      });

      it("should have same structure for table headers", () => {
        expect(Object.keys(rcjStandardDailyCauseListEn.common.tableHeaders).sort()).toEqual(
          Object.keys(rcjStandardDailyCauseListCy.common.tableHeaders).sort()
        );
      });
    });
  });

  describe("Template rendering", () => {
    const baseData = {
      header: {
        listTitle: rcjStandardDailyCauseListEn.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.pageTitle,
        listDate: "10 July 2026",
        lastUpdatedDate: "10 July 2026",
        lastUpdatedTime: "2:30pm"
      },
      listContent: {
        locationLine1: rcjStandardDailyCauseListEn.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.locationLine1,
        locationLine2: rcjStandardDailyCauseListEn.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.locationLine2,
        locationLine3: rcjStandardDailyCauseListEn.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.locationLine3,
        mediaInquiriesText: rcjStandardDailyCauseListEn.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.mediaInquiriesText,
        openJusticeText: rcjStandardDailyCauseListEn.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.openJusticeText,
        courtExclusionText: rcjStandardDailyCauseListEn.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.courtExclusionText
      },
      common: rcjStandardDailyCauseListEn.common,
      hearings: [],
      dataSource: "XHIBIT"
    };

    describe("Page header", () => {
      it("should render page title", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("Civil Courts at the Royal Courts of Justice Daily Cause List");
        expect(html).toContain('id="top"');
      });

      it("should render FACT link", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("https://www.find-court-tribunal.service.gov.uk/");
        expect(html).toContain("in England and Wales");
      });

      it("should render location details", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("Royal Courts of Justice");
        expect(html).toContain("Strand, London");
        expect(html).toContain("WC2A 2LL");
      });

      it("should render list date and time", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("List for");
        expect(html).toContain("10 July 2026");
        expect(html).toContain("Last updated");
        expect(html).toContain("2:30pm");
        expect(html).toContain("at");
      });
    });

    describe("Important information details", () => {
      it("should render important information section", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("Important information");
      });

      it("should render media inquiries text", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("mediaenquiries.civilcourtsatthercj@justice.gov.uk");
        expect(html).toContain("Arrangements will then be made for you to attend");
      });

      it("should render open justice text", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("principles of open justice");
      });

      it("should render court exclusion text", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("exclude observers");
        expect(html).toContain("proper administration of justice");
      });

      it("should render details component as open by default", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("govuk-details");
        expect(html).toContain("open");
      });
    });

    describe("Search functionality", () => {
      it("should render search container", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("search-container");
      });

      it("should render search title", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("Search Cases");
      });

      it("should render search input with correct attributes", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('name="search"');
        expect(html).toContain('type="text"');
      });

      it("should render visually hidden label for accessibility", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("govuk-visually-hidden");
        expect(html).toContain("Search by case number, details, venue, judge, or other information");
      });

      it("should have aria-label for accessibility", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain('aria-label="Search by case number, details, venue, judge, or other information"');
      });
    });

    describe("Hearings table", () => {
      it("should render table with all headers", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("Venue");
        expect(html).toContain("Judge");
        expect(html).toContain("Time");
        expect(html).toContain("Case number");
        expect(html).toContain("Case details");
        expect(html).toContain("Hearing type");
        expect(html).toContain("Additional information");
      });

      it("should have table accessibility attributes", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain('role="table"');
        expect(html).toContain('aria-label="Civil Courts at the Royal Courts of Justice Daily Cause List"');
        expect(html).toContain('id="hearings-table"');
      });

      it("should render empty table when no hearings", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("govuk-table");
        expect(html).toContain("govuk-table__head");
        expect(html).toContain("govuk-table__body");
      });

      it("should render single hearing", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              venue: "Court Room 1",
              judge: "Judge Smith",
              time: "10:00am",
              caseNumber: "AB-2026-001",
              caseDetails: "Test v Example",
              hearingType: "Hearing",
              additionalInformation: "Remote hearing"
            }
          ]
        };
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", data);
        expect(html).toContain("Court Room 1");
        expect(html).toContain("Judge Smith");
        expect(html).toContain("10:00am");
        expect(html).toContain("AB-2026-001");
        expect(html).toContain("Test v Example");
        expect(html).toContain("Hearing");
        expect(html).toContain("Remote hearing");
      });

      it("should render multiple hearings", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              venue: "Court Room 1",
              judge: "Judge Smith",
              time: "10:00am",
              caseNumber: "AB-2026-001",
              caseDetails: "Test v Example",
              hearingType: "Hearing",
              additionalInformation: "Remote hearing"
            },
            {
              venue: "Court Room 2",
              judge: "Judge Jones",
              time: "2:00pm",
              caseNumber: "CD-2026-002",
              caseDetails: "Sample v Demo",
              hearingType: "Trial",
              additionalInformation: "In person"
            }
          ]
        };
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", data);
        expect(html).toContain("Court Room 1");
        expect(html).toContain("Court Room 2");
        expect(html).toContain("Judge Smith");
        expect(html).toContain("Judge Jones");
        expect(html).toContain("AB-2026-001");
        expect(html).toContain("CD-2026-002");
      });

      it("should render hearing with empty venue", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              venue: "",
              judge: "Judge Smith",
              time: "10:00am",
              caseNumber: "AB-2026-001",
              caseDetails: "Test v Example",
              hearingType: "Hearing",
              additionalInformation: ""
            }
          ]
        };
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", data);
        expect(html).toContain("Judge Smith");
        expect(html).toContain("AB-2026-001");
      });

      it("should render hearing with empty judge", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              venue: "Court Room 1",
              judge: "",
              time: "10:00am",
              caseNumber: "AB-2026-001",
              caseDetails: "Test v Example",
              hearingType: "Hearing",
              additionalInformation: ""
            }
          ]
        };
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", data);
        expect(html).toContain("Court Room 1");
        expect(html).toContain("AB-2026-001");
      });

      it("should render hearing with empty additional information", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              venue: "Court Room 1",
              judge: "Judge Smith",
              time: "10:00am",
              caseNumber: "AB-2026-001",
              caseDetails: "Test v Example",
              hearingType: "Hearing",
              additionalInformation: ""
            }
          ]
        };
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", data);
        expect(html).toContain("Court Room 1");
        expect(html).toContain("Hearing");
      });
    });

    describe("Data source", () => {
      it("should render data source label", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("Data source");
      });

      it("should render data source value", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("XHIBIT");
      });

      it("should handle different data sources", () => {
        const data = {
          ...baseData,
          dataSource: "SNL"
        };
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", data);
        expect(html).toContain("SNL");
      });

      it("should handle empty data source", () => {
        const data = {
          ...baseData,
          dataSource: ""
        };
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", data);
        expect(html).toContain("Data source");
      });
    });

    describe("Back to top link", () => {
      it("should render back to top link", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("Back to top");
        expect(html).toContain('href="#top"');
      });

      it("should have correct CSS class", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", baseData);
        expect(html).toContain("back-to-top");
      });
    });

    describe("Welsh rendering", () => {
      const welshData = {
        header: {
          listTitle: rcjStandardDailyCauseListCy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.pageTitle,
          listDate: "10 Gorffennaf 2026",
          lastUpdatedDate: "10 Gorffennaf 2026",
          lastUpdatedTime: "2:30yp"
        },
        listContent: {
          locationLine1: rcjStandardDailyCauseListCy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.locationLine1,
          locationLine2: rcjStandardDailyCauseListCy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.locationLine2,
          locationLine3: rcjStandardDailyCauseListCy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.locationLine3,
          mediaInquiriesText: rcjStandardDailyCauseListCy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.mediaInquiriesText,
          openJusticeText: rcjStandardDailyCauseListCy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.openJusticeText,
          courtExclusionText: rcjStandardDailyCauseListCy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.courtExclusionText
        },
        common: rcjStandardDailyCauseListCy.common,
        hearings: [],
        dataSource: "XHIBIT"
      };

      it("should render Welsh page title", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", welshData);
        expect(html).toContain("Rhestr Achosion Dyddiol Llys Sifil yn y Llysoedd Barn Brenhinol");
      });

      it("should render Welsh location details", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", welshData);
        expect(html).toContain("Llysoedd Barn Brenhinol");
      });

      it("should render Welsh FACT link text", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", welshData);
        expect(html).toContain("Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd");
      });

      it("should render Welsh date and time labels", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", welshData);
        expect(html).toContain("Rhestr ar gyfer");
        expect(html).toContain("Diweddarwyd ddiwethaf");
        expect(html).toContain("am");
      });

      it("should render Welsh important information title", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", welshData);
        expect(html).toContain("Gwybodaeth bwysig");
      });

      it("should render Welsh media inquiries text", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", welshData);
        expect(html).toContain("mediaenquiries.civilcourtsatthercj@justice.gov.uk");
        expect(html).toContain("trefniadau i chi fynychu");
      });

      it("should render Welsh open justice text", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", welshData);
        expect(html).toContain("cyfiawnder agored");
      });

      it("should render Welsh court exclusion text", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", welshData);
        expect(html).toContain("eithrio arsylwyr");
      });

      it("should render Welsh search title", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", welshData);
        expect(html).toContain("Chwilio Achosion");
      });

      it("should render Welsh table headers", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", welshData);
        expect(html).toContain("Lleoliad");
        expect(html).toContain("Barnwr");
        expect(html).toContain("Amser");
        expect(html).toContain("Rhif yr achos");
        expect(html).toContain("Manylion yr achos");
        expect(html).toContain("Math o wrandawiad");
        expect(html).toContain("Gwybodaeth ychwanegol");
      });

      it("should render Welsh data source label", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", welshData);
        expect(html).toContain("Ffynhonnell data");
      });

      it("should render Welsh back to top link", () => {
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", welshData);
        expect(html).toContain("Yn ôl i frig y dudalen");
      });

      it("should render Welsh hearing data", () => {
        const data = {
          ...welshData,
          hearings: [
            {
              venue: "Ystafell Llys 1",
              judge: "Barnwr Smith",
              time: "10:00am",
              caseNumber: "AB-2026-001",
              caseDetails: "Prawf v Enghraifft",
              hearingType: "Gwrandawiad",
              additionalInformation: "Gwrandawiad o bell"
            }
          ]
        };
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", data);
        expect(html).toContain("Ystafell Llys 1");
        expect(html).toContain("Barnwr Smith");
        expect(html).toContain("Prawf v Enghraifft");
        expect(html).toContain("Gwrandawiad");
        expect(html).toContain("Gwrandawiad o bell");
      });
    });

    describe("Edge cases", () => {
      it("should handle very long case details", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              venue: "Court Room 1",
              judge: "Judge Smith",
              time: "10:00am",
              caseNumber: "AB-2026-001",
              caseDetails:
                "This is a very long case detail that might wrap across multiple lines and needs to be handled properly by the template rendering system without breaking the layout or causing display issues",
              hearingType: "Hearing",
              additionalInformation: ""
            }
          ]
        };
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", data);
        expect(html).toContain("very long case detail");
      });

      it("should handle special characters in case details", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              venue: "Court Room 1",
              judge: "Judge O'Brien",
              time: "10:00am",
              caseNumber: "AB-2026-001",
              caseDetails: "Test & Example <Company> Ltd",
              hearingType: "Hearing",
              additionalInformation: "Note: Special chars & symbols"
            }
          ]
        };
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", data);
        expect(html).toContain("Judge O&#39;Brien");
        expect(html).toContain("Test &amp; Example &lt;Company&gt; Ltd");
      });

      it("should handle many hearings", () => {
        const hearings = Array.from({ length: 50 }, (_, i) => ({
          venue: `Court Room ${i + 1}`,
          judge: `Judge ${i + 1}`,
          time: `${10 + Math.floor(i / 6)}:${(i % 6) * 10}am`,
          caseNumber: `AB-2026-${String(i + 1).padStart(3, "0")}`,
          caseDetails: `Case ${i + 1}`,
          hearingType: "Hearing",
          additionalInformation: ""
        }));
        const data = {
          ...baseData,
          hearings
        };
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", data);
        expect(html).toContain("Court Room 1");
        expect(html).toContain("Court Room 50");
      });

      it("should handle missing optional date components", () => {
        const data = {
          ...baseData,
          header: {
            ...baseData.header,
            lastUpdatedDate: "",
            lastUpdatedTime: ""
          }
        };
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", data);
        expect(html).toContain("Last updated");
      });

      it("should handle empty location lines", () => {
        const data = {
          ...baseData,
          listContent: {
            ...baseData.listContent,
            locationLine2: "",
            locationLine3: ""
          }
        };
        const html = env.render("civil-courts-rcj-daily-cause-list.njk", data);
        expect(html).toContain("Royal Courts of Justice");
      });
    });
  });
});
