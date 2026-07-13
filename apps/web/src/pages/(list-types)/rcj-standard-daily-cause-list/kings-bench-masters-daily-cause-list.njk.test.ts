import path from "node:path";
import { fileURLToPath } from "node:url";
import { rcjStandardDailyCauseListCy, rcjStandardDailyCauseListEn } from "@hmcts/rcj-standard-daily-cause-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

describe("kings-bench-masters-daily-cause-list.njk", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = nunjucks.configure([__dirname, webCoreViews, govukFrontend], {
      autoescape: true,
      noCache: true
    });
  });

  describe("Locale content", () => {
    describe("English locale - KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST", () => {
      it("should have all required keys", () => {
        const required = [
          "pageTitle",
          "locationLine1",
          "locationLine2",
          "locationLine3",
          "pressAndPublicTitle",
          "pressAndPublicText",
          "judgmentsTitle",
          "judgmentsText",
          "bundlesTitle",
          "bundlesText",
          "inPersonHearingsTitle",
          "inPersonHearingsText",
          "kbGuideLinkText",
          "kbGuideLinkUrl",
          "trialWindowsLinkText",
          "trialWindowsLinkUrl"
        ];
        required.forEach((key) => {
          expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST).toHaveProperty(key);
        });
      });

      it("should have correct pageTitle", () => {
        expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.pageTitle).toBe("King's Bench Masters Daily Cause List");
      });

      it("should have correct location details", () => {
        expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.locationLine1).toBe("Royal Courts of Justice");
        expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.locationLine2).toBe("Strand, London");
        expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.locationLine3).toBe("WC2A 2LL");
      });

      it("should have press and public access text", () => {
        expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.pressAndPublicText).toContain("media representative");
        expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.pressAndPublicText).toContain("Bear Garden");
      });

      it("should have judgments text", () => {
        expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.judgmentsText).toContain("Judgments handed down");
        expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.judgmentsText).toContain("National Archives");
      });

      it("should have bundles text", () => {
        expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.bundlesText).toContain("In-person hearings");
        expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.bundlesText).toContain("Remote hearings");
        expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.bundlesText).toContain("Bear Garden");
      });

      it("should have in person hearings text", () => {
        expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.inPersonHearingsText).toContain("masters' chambers");
        expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.inPersonHearingsText).toContain("6 attendees");
      });

      it("should have King's Bench Guide link", () => {
        expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.kbGuideLinkText).toBe("King's Bench Guide");
        expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.kbGuideLinkUrl).toContain("judiciary.uk");
      });

      it("should have trial windows link", () => {
        expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.trialWindowsLinkText).toBe("Current trial windows");
        expect(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.trialWindowsLinkUrl).toContain("gov.uk");
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

    describe("Welsh locale - KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST", () => {
      it("should have all required keys", () => {
        const required = [
          "pageTitle",
          "locationLine1",
          "locationLine2",
          "locationLine3",
          "pressAndPublicTitle",
          "pressAndPublicText",
          "judgmentsTitle",
          "judgmentsText",
          "bundlesTitle",
          "bundlesText",
          "inPersonHearingsTitle",
          "inPersonHearingsText",
          "kbGuideLinkText",
          "kbGuideLinkUrl",
          "trialWindowsLinkText",
          "trialWindowsLinkUrl"
        ];
        required.forEach((key) => {
          expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST).toHaveProperty(key);
        });
      });

      it("should have correct pageTitle", () => {
        expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.pageTitle).toBe("Rhestr Achosion Dyddiol Meistri Mainc y Brenin");
      });

      it("should have correct location details", () => {
        expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.locationLine1).toBe("Llysoedd Barn Brenhinol");
        expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.locationLine2).toBe("Strand, London");
        expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.locationLine3).toBe("WC2A 2LL");
      });

      it("should have press and public access text in Welsh", () => {
        expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.pressAndPublicText).toContain("gynrychiolydd");
        expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.pressAndPublicText).toContain("Bear Garden");
      });

      it("should have judgments text in Welsh", () => {
        expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.judgmentsText).toContain("dyfarniadau");
        expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.judgmentsText).toContain("Archifau Cenedlaethol");
      });

      it("should have bundles text in Welsh", () => {
        expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.bundlesText).toContain("Gwrandawiadau wyneb yn wyneb");
        expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.bundlesText).toContain("Gwrandawiadau o bell");
        expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.bundlesText).toContain("Bear Garden");
      });

      it("should have in person hearings text in Welsh", () => {
        expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.inPersonHearingsText).toContain("siambrau");
        expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.inPersonHearingsText).toContain("6 mynychwr");
      });

      it("should have King's Bench Guide link text in Welsh", () => {
        expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.kbGuideLinkText).toBe("Canllaw Mainc y Brenin");
        expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.kbGuideLinkUrl).toContain("judiciary.uk");
      });

      it("should have trial windows link text in Welsh", () => {
        expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.trialWindowsLinkText).toBe("Cyfnodau treial cyfredol");
        expect(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.trialWindowsLinkUrl).toContain("gov.uk");
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
      it("should have same structure in English and Welsh for KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST", () => {
        expect(Object.keys(rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST).sort()).toEqual(
          Object.keys(rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST).sort()
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
        listTitle: rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.pageTitle,
        listDate: "10 July 2026",
        lastUpdatedDate: "10 July 2026",
        lastUpdatedTime: "2:30pm"
      },
      listContent: {
        locationLine1: rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.locationLine1,
        locationLine2: rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.locationLine2,
        locationLine3: rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.locationLine3,
        pressAndPublicTitle: rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.pressAndPublicTitle,
        pressAndPublicText: rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.pressAndPublicText,
        judgmentsTitle: rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.judgmentsTitle,
        judgmentsText: rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.judgmentsText,
        bundlesTitle: rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.bundlesTitle,
        bundlesText: rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.bundlesText,
        inPersonHearingsTitle: rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.inPersonHearingsTitle,
        inPersonHearingsText: rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.inPersonHearingsText,
        kbGuideLinkText: rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.kbGuideLinkText,
        kbGuideLinkUrl: rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.kbGuideLinkUrl,
        trialWindowsLinkText: rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.trialWindowsLinkText,
        trialWindowsLinkUrl: rcjStandardDailyCauseListEn.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.trialWindowsLinkUrl
      },
      common: rcjStandardDailyCauseListEn.common,
      hearings: [],
      dataSource: "XHIBIT"
    };

    describe("Page header", () => {
      it("should render page title", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("King&#39;s Bench Masters Daily Cause List");
        expect(html).toContain('id="top"');
      });

      it("should render FACT link", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("https://www.find-court-tribunal.service.gov.uk/");
        expect(html).toContain("in England and Wales");
      });

      it("should render location details", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("Royal Courts of Justice");
        expect(html).toContain("Strand, London");
        expect(html).toContain("WC2A 2LL");
      });

      it("should render list date and time", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("List for");
        expect(html).toContain("10 July 2026");
        expect(html).toContain("Last updated");
        expect(html).toContain("2:30pm");
        expect(html).toContain("at");
      });
    });

    describe("Important information details", () => {
      it("should render important information section", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("Important information");
      });

      it("should render press and public access section", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("Press and Public Access");
        expect(html).toContain("media representative");
        expect(html).toContain("Bear Garden");
      });

      it("should render press and public text with paragraph breaks", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("media representative");
        expect(html).toContain("press and public");
      });

      it("should render judgments section", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("Judgments");
        expect(html).toContain("Judgments handed down");
        expect(html).toContain("National Archives");
      });

      it("should render bundles section", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("Bundles");
        expect(html).toContain("In-person hearings");
        expect(html).toContain("Remote hearings");
      });

      it("should render bundles text with paragraph breaks", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("Bear Garden");
        expect(html).toContain("3 days before");
      });

      it("should render in person hearings section", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("In-Person Hearings");
        expect(html).toContain("masters' chambers");
        expect(html).toContain("6 attendees");
      });

      it("should render King's Bench Guide link", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("King's Bench Guide");
        expect(html).toContain("judiciary.uk");
      });

      it("should render trial windows link", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("Current trial windows");
        expect(html).toContain("gov.uk");
      });

      it("should render details component as open by default", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("govuk-details");
        expect(html).toContain("open");
      });
    });

    describe("Search functionality", () => {
      it("should render search container", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("search-container");
      });

      it("should render search title", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("Search Cases");
      });

      it("should render search input with correct attributes", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('name="search"');
        expect(html).toContain('type="text"');
      });

      it("should render visually hidden label for accessibility", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("govuk-visually-hidden");
        expect(html).toContain("Search by case number, details, venue, judge, or other information");
      });

      it("should have aria-label for accessibility", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain('aria-label="Search by case number, details, venue, judge, or other information"');
      });
    });

    describe("Hearings table", () => {
      it("should render table with all headers", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("Venue");
        expect(html).toContain("Judge");
        expect(html).toContain("Time");
        expect(html).toContain("Case number");
        expect(html).toContain("Case details");
        expect(html).toContain("Hearing type");
        expect(html).toContain("Additional information");
      });

      it("should have table accessibility attributes", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain('role="table"');
        expect(html).toContain('aria-label="King&#39;s Bench Masters Daily Cause List"');
        expect(html).toContain('id="hearings-table"');
      });

      it("should render empty table when no hearings", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
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
              judge: "Master Smith",
              time: "10:00am",
              caseNumber: "KB-2026-001",
              caseDetails: "Test v Example",
              hearingType: "Case Management",
              additionalInformation: "Remote hearing"
            }
          ]
        };
        const html = env.render("kings-bench-masters-daily-cause-list.njk", data);
        expect(html).toContain("Court Room 1");
        expect(html).toContain("Master Smith");
        expect(html).toContain("10:00am");
        expect(html).toContain("KB-2026-001");
        expect(html).toContain("Test v Example");
        expect(html).toContain("Case Management");
        expect(html).toContain("Remote hearing");
      });

      it("should render multiple hearings", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              venue: "Court Room 1",
              judge: "Master Smith",
              time: "10:00am",
              caseNumber: "KB-2026-001",
              caseDetails: "Test v Example",
              hearingType: "Case Management",
              additionalInformation: "Remote hearing"
            },
            {
              venue: "Court Room 2",
              judge: "Master Jones",
              time: "2:00pm",
              caseNumber: "KB-2026-002",
              caseDetails: "Sample v Demo",
              hearingType: "Summary Judgment",
              additionalInformation: "In person"
            }
          ]
        };
        const html = env.render("kings-bench-masters-daily-cause-list.njk", data);
        expect(html).toContain("Court Room 1");
        expect(html).toContain("Court Room 2");
        expect(html).toContain("Master Smith");
        expect(html).toContain("Master Jones");
        expect(html).toContain("KB-2026-001");
        expect(html).toContain("KB-2026-002");
      });

      it("should render hearing with empty venue", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              venue: "",
              judge: "Master Smith",
              time: "10:00am",
              caseNumber: "KB-2026-001",
              caseDetails: "Test v Example",
              hearingType: "Case Management",
              additionalInformation: ""
            }
          ]
        };
        const html = env.render("kings-bench-masters-daily-cause-list.njk", data);
        expect(html).toContain("Master Smith");
        expect(html).toContain("KB-2026-001");
      });

      it("should render hearing with empty judge", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              venue: "Court Room 1",
              judge: "",
              time: "10:00am",
              caseNumber: "KB-2026-001",
              caseDetails: "Test v Example",
              hearingType: "Case Management",
              additionalInformation: ""
            }
          ]
        };
        const html = env.render("kings-bench-masters-daily-cause-list.njk", data);
        expect(html).toContain("Court Room 1");
        expect(html).toContain("KB-2026-001");
      });

      it("should render hearing with empty additional information", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              venue: "Court Room 1",
              judge: "Master Smith",
              time: "10:00am",
              caseNumber: "KB-2026-001",
              caseDetails: "Test v Example",
              hearingType: "Case Management",
              additionalInformation: ""
            }
          ]
        };
        const html = env.render("kings-bench-masters-daily-cause-list.njk", data);
        expect(html).toContain("Court Room 1");
        expect(html).toContain("Case Management");
      });
    });

    describe("Data source", () => {
      it("should render data source label", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("Data source");
      });

      it("should render data source value", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("XHIBIT");
      });

      it("should handle different data sources", () => {
        const data = {
          ...baseData,
          dataSource: "SNL"
        };
        const html = env.render("kings-bench-masters-daily-cause-list.njk", data);
        expect(html).toContain("SNL");
      });

      it("should handle empty data source", () => {
        const data = {
          ...baseData,
          dataSource: ""
        };
        const html = env.render("kings-bench-masters-daily-cause-list.njk", data);
        expect(html).toContain("Data source");
      });
    });

    describe("Back to top link", () => {
      it("should render back to top link", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("Back to top");
        expect(html).toContain('href="#top"');
      });

      it("should have correct CSS class", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("back-to-top");
      });
    });

    describe("Welsh rendering", () => {
      const welshData = {
        header: {
          listTitle: rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.pageTitle,
          listDate: "10 Gorffennaf 2026",
          lastUpdatedDate: "10 Gorffennaf 2026",
          lastUpdatedTime: "2:30yp"
        },
        listContent: {
          locationLine1: rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.locationLine1,
          locationLine2: rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.locationLine2,
          locationLine3: rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.locationLine3,
          pressAndPublicTitle: rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.pressAndPublicTitle,
          pressAndPublicText: rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.pressAndPublicText,
          judgmentsTitle: rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.judgmentsTitle,
          judgmentsText: rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.judgmentsText,
          bundlesTitle: rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.bundlesTitle,
          bundlesText: rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.bundlesText,
          inPersonHearingsTitle: rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.inPersonHearingsTitle,
          inPersonHearingsText: rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.inPersonHearingsText,
          kbGuideLinkText: rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.kbGuideLinkText,
          kbGuideLinkUrl: rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.kbGuideLinkUrl,
          trialWindowsLinkText: rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.trialWindowsLinkText,
          trialWindowsLinkUrl: rcjStandardDailyCauseListCy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.trialWindowsLinkUrl
        },
        common: rcjStandardDailyCauseListCy.common,
        hearings: [],
        dataSource: "XHIBIT"
      };

      it("should render Welsh page title", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", welshData);
        expect(html).toContain("Rhestr Achosion Dyddiol Meistri Mainc y Brenin");
      });

      it("should render Welsh location details", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", welshData);
        expect(html).toContain("Llysoedd Barn Brenhinol");
      });

      it("should render Welsh FACT link text", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", welshData);
        expect(html).toContain("Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd");
      });

      it("should render Welsh date and time labels", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", welshData);
        expect(html).toContain("Rhestr ar gyfer");
        expect(html).toContain("Diweddarwyd ddiwethaf");
        expect(html).toContain("am");
      });

      it("should render Welsh important information title", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", welshData);
        expect(html).toContain("Gwybodaeth bwysig");
      });

      it("should render Welsh press and public access section", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", welshData);
        expect(html).toContain("Mynediad");
        expect(html).toContain("gynrychiolydd");
        expect(html).toContain("Bear Garden");
      });

      it("should render Welsh judgments section", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", welshData);
        expect(html).toContain("Dyfarniadau");
        expect(html).toContain("Archifau Cenedlaethol");
      });

      it("should render Welsh bundles section", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", welshData);
        expect(html).toContain("Bwnde");
        expect(html).toContain("Gwrandawiadau wyneb yn wyneb");
        expect(html).toContain("Gwrandawiadau o bell");
      });

      it("should render Welsh in person hearings section", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", welshData);
        expect(html).toContain("Gwrandawiadau Wyneb yn Wyneb");
        expect(html).toContain("siambrau");
        expect(html).toContain("6 mynychwr");
      });

      it("should render Welsh King's Bench Guide link", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", welshData);
        expect(html).toContain("Canllaw Mainc y Brenin");
      });

      it("should render Welsh trial windows link", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", welshData);
        expect(html).toContain("Cyfnodau treial cyfredol");
      });

      it("should render Welsh search title", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", welshData);
        expect(html).toContain("Chwilio Achosion");
      });

      it("should render Welsh table headers", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", welshData);
        expect(html).toContain("Lleoliad");
        expect(html).toContain("Barnwr");
        expect(html).toContain("Amser");
        expect(html).toContain("Rhif yr achos");
        expect(html).toContain("Manylion yr achos");
        expect(html).toContain("Math o wrandawiad");
        expect(html).toContain("Gwybodaeth ychwanegol");
      });

      it("should render Welsh data source label", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", welshData);
        expect(html).toContain("Ffynhonnell data");
      });

      it("should render Welsh back to top link", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", welshData);
        expect(html).toContain("Yn ôl i frig y dudalen");
      });

      it("should render Welsh hearing data", () => {
        const data = {
          ...welshData,
          hearings: [
            {
              venue: "Ystafell Llys 1",
              judge: "Meistr Smith",
              time: "10:00am",
              caseNumber: "KB-2026-001",
              caseDetails: "Prawf v Enghraifft",
              hearingType: "Rheoli Achos",
              additionalInformation: "Gwrandawiad o bell"
            }
          ]
        };
        const html = env.render("kings-bench-masters-daily-cause-list.njk", data);
        expect(html).toContain("Ystafell Llys 1");
        expect(html).toContain("Meistr Smith");
        expect(html).toContain("Prawf v Enghraifft");
        expect(html).toContain("Rheoli Achos");
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
              judge: "Master Smith",
              time: "10:00am",
              caseNumber: "KB-2026-001",
              caseDetails:
                "This is a very long case detail that might wrap across multiple lines and needs to be handled properly by the template rendering system without breaking the layout or causing display issues",
              hearingType: "Case Management",
              additionalInformation: ""
            }
          ]
        };
        const html = env.render("kings-bench-masters-daily-cause-list.njk", data);
        expect(html).toContain("very long case detail");
      });

      it("should handle special characters in case details", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              venue: "Court Room 1",
              judge: "Master O'Brien",
              time: "10:00am",
              caseNumber: "KB-2026-001",
              caseDetails: "Test & Example <Company> Ltd",
              hearingType: "Case Management",
              additionalInformation: "Note: Special chars & symbols"
            }
          ]
        };
        const html = env.render("kings-bench-masters-daily-cause-list.njk", data);
        expect(html).toContain("Master O&#39;Brien");
        expect(html).toContain("Test &amp; Example &lt;Company&gt; Ltd");
      });

      it("should handle many hearings", () => {
        const hearings = Array.from({ length: 50 }, (_, i) => ({
          venue: `Court Room ${i + 1}`,
          judge: `Master ${i + 1}`,
          time: `${10 + Math.floor(i / 6)}:${(i % 6) * 10}am`,
          caseNumber: `KB-2026-${String(i + 1).padStart(3, "0")}`,
          caseDetails: `Case ${i + 1}`,
          hearingType: "Case Management",
          additionalInformation: ""
        }));
        const data = {
          ...baseData,
          hearings
        };
        const html = env.render("kings-bench-masters-daily-cause-list.njk", data);
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
        const html = env.render("kings-bench-masters-daily-cause-list.njk", data);
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
        const html = env.render("kings-bench-masters-daily-cause-list.njk", data);
        expect(html).toContain("Royal Courts of Justice");
      });

      it("should handle text with multiple paragraph breaks", () => {
        const html = env.render("kings-bench-masters-daily-cause-list.njk", baseData);
        expect(html).toContain("</p><p");
      });
    });
  });
});
