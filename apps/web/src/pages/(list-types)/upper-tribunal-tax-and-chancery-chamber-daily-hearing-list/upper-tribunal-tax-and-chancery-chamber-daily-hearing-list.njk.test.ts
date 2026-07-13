import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  upperTribunalTaxAndChanceryChamberDailyHearingListCy,
  upperTribunalTaxAndChanceryChamberDailyHearingListEn
} from "@hmcts/upper-tribunal-tax-and-chancery-chamber-daily-hearing-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

describe("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = nunjucks.configure([__dirname, webCoreViews, govukFrontend], {
      autoescape: true,
      noCache: true
    });
  });

  describe("Locale content", () => {
    describe("English locale", () => {
      it("should have all required keys", () => {
        const requiredKeys = [
          "pageTitle",
          "downloadPdf",
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText",
          "listForDate",
          "lastUpdated",
          "at",
          "openingStatement",
          "openingStatementTitle",
          "searchCasesTitle",
          "searchCasesLabel",
          "tableHeaders",
          "dataSource",
          "backToTop",
          "cautionNote",
          "cautionReporting",
          "provenanceLabels"
        ];

        requiredKeys.forEach((key) => {
          expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.pageTitle).toBe("Upper Tribunal Tax and Chancery Chamber Daily Hearing List");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.downloadPdf).toBe("Download as PDF");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.listForDate).toBe("List for");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.lastUpdated).toBe("Last updated");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.at).toBe("at");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.openingStatementTitle).toBe("Important information");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.searchCasesTitle).toBe("Search Cases");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.dataSource).toBe("Data source");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.backToTop).toBe("Back to top");
      });

      it("should have correct table headers", () => {
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.tableHeaders.time).toBe("Time");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.tableHeaders.caseReferenceNumber).toBe("Case reference number");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.tableHeaders.caseName).toBe("Case name");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.tableHeaders.judges).toBe("Judge(s)");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.tableHeaders.members).toBe("Member(s)");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.tableHeaders.hearingType).toBe("Hearing type");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.tableHeaders.venue).toBe("Venue");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.tableHeaders.additionalInformation).toBe("Additional information");
      });

      it("should have opening statement content", () => {
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.openingStatement.contactText).toContain("uttc@justice.gov.uk");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.openingStatement.observeLinkText).toContain("Observe a court or tribunal hearing");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.openingStatement.observeLinkUrl).toBe(
          "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing"
        );
      });

      it("should have correct URL values", () => {
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.openingStatement.observeLinkUrl).toBe(
          "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing"
        );
      });

      it("should have provenance labels", () => {
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.provenanceLabels.MANUAL_UPLOAD).toBe("Manual Upload");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.provenanceLabels.XHIBIT).toBe("XHIBIT");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.provenanceLabels.SNL).toBe("SNL");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListEn.provenanceLabels.COMMON_PLATFORM).toBe("Common Platform");
      });
    });

    describe("Welsh locale", () => {
      it("should have all required keys", () => {
        const requiredKeys = [
          "pageTitle",
          "downloadPdf",
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText",
          "listForDate",
          "lastUpdated",
          "at",
          "openingStatement",
          "openingStatementTitle",
          "searchCasesTitle",
          "searchCasesLabel",
          "tableHeaders",
          "dataSource",
          "backToTop",
          "cautionNote",
          "cautionReporting",
          "provenanceLabels"
        ];

        requiredKeys.forEach((key) => {
          expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.pageTitle).toBe("Rhestr Gwrandawiadau Dyddiol Tribiwnlys Uwch Siambr Dreth a Siawnsri");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.downloadPdf).toBe("Lawrlwytho fel PDF");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.listForDate).toBe("Rhestr ar gyfer");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.at).toBe("am");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.openingStatementTitle).toBe("Gwybodaeth bwysig");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.searchCasesTitle).toBe("Chwilio Achosion");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.dataSource).toBe("Ffynhonnell data");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.backToTop).toBe("Yn ôl i frig y dudalen");
      });

      it("should have correct table headers", () => {
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.tableHeaders.time).toBe("Amser");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.tableHeaders.caseReferenceNumber).toBe("Rhif cyfeirnod achos");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.tableHeaders.caseName).toBe("Enw'r achos");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.tableHeaders.judges).toBe("Barnwr/Barnwyr");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.tableHeaders.members).toBe("Aelod/Aelodau");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.tableHeaders.hearingType).toBe("Math o wrandawiad");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.tableHeaders.venue).toBe("Lleoliad");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.tableHeaders.additionalInformation).toBe("Gwybodaeth ychwanegol");
      });

      it("should have opening statement content", () => {
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.openingStatement.contactText).toContain("uttc@justice.gov.uk");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.openingStatement.observeLinkText).toContain("Arsylwi gwrandawiad llys neu dribiwnlys");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.openingStatement.observeLinkUrl).toBe(
          "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing"
        );
      });

      it("should have provenance labels", () => {
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.provenanceLabels.MANUAL_UPLOAD).toBe("Llwytho â Llaw");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.provenanceLabels.XHIBIT).toBe("XHIBIT");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.provenanceLabels.SNL).toBe("SNL");
        expect(upperTribunalTaxAndChanceryChamberDailyHearingListCy.provenanceLabels.COMMON_PLATFORM).toBe("Platfform Cyffredin");
      });
    });

    describe("Locale consistency", () => {
      it("should have same structure in English and Welsh", () => {
        expect(Object.keys(upperTribunalTaxAndChanceryChamberDailyHearingListEn).sort()).toEqual(
          Object.keys(upperTribunalTaxAndChanceryChamberDailyHearingListCy).sort()
        );
      });

      it("should have same types for each key", () => {
        Object.keys(upperTribunalTaxAndChanceryChamberDailyHearingListEn).forEach((key) => {
          const enType = typeof upperTribunalTaxAndChanceryChamberDailyHearingListEn[key as keyof typeof upperTribunalTaxAndChanceryChamberDailyHearingListEn];
          const cyType = typeof upperTribunalTaxAndChanceryChamberDailyHearingListCy[key as keyof typeof upperTribunalTaxAndChanceryChamberDailyHearingListCy];
          expect(enType).toBe(cyType);
        });
      });

      it("should have same structure for tableHeaders object", () => {
        expect(Object.keys(upperTribunalTaxAndChanceryChamberDailyHearingListEn.tableHeaders).sort()).toEqual(
          Object.keys(upperTribunalTaxAndChanceryChamberDailyHearingListCy.tableHeaders).sort()
        );
      });

      it("should have same structure for openingStatement object", () => {
        expect(Object.keys(upperTribunalTaxAndChanceryChamberDailyHearingListEn.openingStatement).sort()).toEqual(
          Object.keys(upperTribunalTaxAndChanceryChamberDailyHearingListCy.openingStatement).sort()
        );
      });

      it("should have same structure for provenanceLabels object", () => {
        expect(Object.keys(upperTribunalTaxAndChanceryChamberDailyHearingListEn.provenanceLabels).sort()).toEqual(
          Object.keys(upperTribunalTaxAndChanceryChamberDailyHearingListCy.provenanceLabels).sort()
        );
      });
    });
  });

  describe("Template rendering", () => {
    const baseData = {
      t: upperTribunalTaxAndChanceryChamberDailyHearingListEn,
      en: upperTribunalTaxAndChanceryChamberDailyHearingListEn,
      cy: upperTribunalTaxAndChanceryChamberDailyHearingListCy,
      title: "Upper Tribunal Tax and Chancery Chamber Daily Hearing List",
      header: {
        listTitle: "Upper Tribunal Tax and Chancery Chamber Daily Hearing List",
        hearingDate: "10 July 2026",
        lastUpdatedDate: "10 July 2026",
        lastUpdatedTime: "9:30am"
      },
      hearings: [],
      dataSource: "Manual Upload"
    };

    describe("Page header", () => {
      it("should render page title as h1", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain('<h1 class="govuk-heading-l" id="top">');
        expect(html).toContain("Upper Tribunal Tax and Chancery Chamber Daily Hearing List");
      });

      it("should render FACT link", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("https://www.find-court-tribunal.service.gov.uk/");
        expect(html).toContain("in England and Wales, and some non-devolved tribunals in Scotland.");
      });

      it("should render list date", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain("List for");
        expect(html).toContain("10 July 2026");
      });

      it("should render last updated date and time", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain("Last updated");
        expect(html).toContain("10 July 2026");
        expect(html).toContain("at");
        expect(html).toContain("9:30am");
      });
    });

    describe("Opening statement details", () => {
      it("should render opening statement title", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain("Important information");
      });

      it("should render contact text with email", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain("uttc@justice.gov.uk");
      });

      it("should render observe link with correct URL", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain("Observe a court or tribunal hearing");
        expect(html).toContain("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener noreferrer"');
      });

      it("should have details element open by default", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain('<details class="govuk-details govuk-!-margin-top-6" data-module="govuk-details" open>');
      });
    });

    describe("Search section", () => {
      it("should render search cases heading", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain("Search Cases");
      });

      it("should render search input with label", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('name="search"');
        expect(html).toContain("Search by case reference, case name, judge, venue, or other details");
      });

      it("should have visually hidden label", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain('class="govuk-label govuk-visually-hidden"');
      });

      it("should have aria-label on search input", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain('aria-label="Search by case reference, case name, judge, venue, or other details"');
      });
    });

    describe("Hearings table", () => {
      it("should render table with correct headers", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain("Time");
        expect(html).toContain("Case reference number");
        expect(html).toContain("Case name");
        expect(html).toContain("Judge(s)");
        expect(html).toContain("Member(s)");
        expect(html).toContain("Hearing type");
        expect(html).toContain("Venue");
        expect(html).toContain("Additional information");
      });

      it("should render table with aria-label", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain('role="table"');
        expect(html).toContain('aria-label="Upper Tribunal Tax and Chancery Chamber Daily Hearing List"');
      });

      it("should render empty tbody when no hearings", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain('<tbody class="govuk-table__body">');
        expect(html).toContain("</tbody>");
      });

      it("should render single hearing row", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              time: "10:00am",
              caseReferenceNumber: "TC/2026/12345",
              caseName: "Smith v HMRC",
              judges: "Judge John Doe",
              members: "Jane Smith",
              hearingType: "Final Hearing",
              venue: "Royal Courts of Justice",
              additionalInformation: "Remote hearing"
            }
          ]
        };
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", data);
        expect(html).toContain("10:00am");
        expect(html).toContain("TC/2026/12345");
        expect(html).toContain("Smith v HMRC");
        expect(html).toContain("Judge John Doe");
        expect(html).toContain("Jane Smith");
        expect(html).toContain("Final Hearing");
        expect(html).toContain("Royal Courts of Justice");
        expect(html).toContain("Remote hearing");
      });

      it("should render multiple hearing rows", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              time: "10:00am",
              caseReferenceNumber: "TC/2026/12345",
              caseName: "Smith v HMRC",
              judges: "Judge John Doe",
              members: "Jane Smith",
              hearingType: "Final Hearing",
              venue: "Royal Courts of Justice",
              additionalInformation: "Remote hearing"
            },
            {
              time: "2:00pm",
              caseReferenceNumber: "TC/2026/67890",
              caseName: "Jones v HMRC",
              judges: "Judge Mary Johnson",
              members: "Robert Brown",
              hearingType: "Preliminary Hearing",
              venue: "Field House",
              additionalInformation: "In person"
            }
          ]
        };
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", data);
        expect(html).toContain("10:00am");
        expect(html).toContain("TC/2026/12345");
        expect(html).toContain("Smith v HMRC");
        expect(html).toContain("2:00pm");
        expect(html).toContain("TC/2026/67890");
        expect(html).toContain("Jones v HMRC");
      });

      it("should render hearing with empty fields", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              time: "10:00am",
              caseReferenceNumber: "TC/2026/12345",
              caseName: "Smith v HMRC",
              judges: "",
              members: "",
              hearingType: "",
              venue: "",
              additionalInformation: ""
            }
          ]
        };
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", data);
        expect(html).toContain("10:00am");
        expect(html).toContain("TC/2026/12345");
        expect(html).toContain("Smith v HMRC");
      });

      it("should render hearing with multiple judges", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              time: "10:00am",
              caseReferenceNumber: "TC/2026/12345",
              caseName: "Smith v HMRC",
              judges: "Judge John Doe, Judge Jane Smith",
              members: "Robert Brown, Sarah Wilson",
              hearingType: "Final Hearing",
              venue: "Royal Courts of Justice",
              additionalInformation: "Panel hearing"
            }
          ]
        };
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", data);
        expect(html).toContain("Judge John Doe, Judge Jane Smith");
        expect(html).toContain("Robert Brown, Sarah Wilson");
      });
    });

    describe("Data source", () => {
      it("should render data source with label", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain("Data source");
        expect(html).toContain("Manual Upload");
      });

      it("should render different data source values", () => {
        const data = {
          ...baseData,
          dataSource: "XHIBIT"
        };
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", data);
        expect(html).toContain("XHIBIT");
      });

      it("should render data source in small text", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain('class="govuk-body-s govuk-!-margin-top-6"');
      });
    });

    describe("Back to top link", () => {
      it("should render back to top link", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain("Back to top");
        expect(html).toContain('href="#top"');
      });

      it("should have back-to-top class wrapper", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain('<div class="back-to-top">');
      });

      it("should render as a govuk-link", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain('class="govuk-link"');
      });
    });

    describe("Custom styles", () => {
      it("should include custom back-to-top style in head block", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", baseData);
        expect(html).toContain(".back-to-top {");
        expect(html).toContain("margin-top: 40px;");
      });
    });

    describe("Welsh rendering", () => {
      const welshData = {
        t: upperTribunalTaxAndChanceryChamberDailyHearingListCy,
        en: upperTribunalTaxAndChanceryChamberDailyHearingListEn,
        cy: upperTribunalTaxAndChanceryChamberDailyHearingListCy,
        title: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Uwch Siambr Dreth a Siawnsri",
        header: {
          listTitle: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Uwch Siambr Dreth a Siawnsri",
          hearingDate: "10 Gorffennaf 2026",
          lastUpdatedDate: "10 Gorffennaf 2026",
          lastUpdatedTime: "9:30yb"
        },
        hearings: [],
        dataSource: "Llwytho â Llaw"
      };

      it("should render Welsh page title", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", welshData);
        expect(html).toContain("Rhestr Gwrandawiadau Dyddiol Tribiwnlys Uwch Siambr Dreth a Siawnsri");
      });

      it("should render Welsh list date label", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", welshData);
        expect(html).toContain("Rhestr ar gyfer");
      });

      it("should render Welsh last updated text", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", welshData);
        expect(html).toContain("Diweddarwyd ddiwethaf");
        expect(html).toContain("am");
      });

      it("should render Welsh opening statement title", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", welshData);
        expect(html).toContain("Gwybodaeth bwysig");
      });

      it("should render Welsh search cases heading", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", welshData);
        expect(html).toContain("Chwilio Achosion");
      });

      it("should render Welsh table headers", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", welshData);
        expect(html).toContain("Amser");
        expect(html).toContain("Rhif cyfeirnod achos");
        expect(html).toContain("Enw&#39;r achos");
        expect(html).toContain("Barnwr/Barnwyr");
        expect(html).toContain("Aelod/Aelodau");
        expect(html).toContain("Math o wrandawiad");
        expect(html).toContain("Lleoliad");
        expect(html).toContain("Gwybodaeth ychwanegol");
      });

      it("should render Welsh data source label", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", welshData);
        expect(html).toContain("Ffynhonnell data");
        expect(html).toContain("Llwytho â Llaw");
      });

      it("should render Welsh back to top link", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", welshData);
        expect(html).toContain("Yn ôl i frig y dudalen");
      });

      it("should render Welsh FACT link text", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", welshData);
        expect(html).toContain("Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd");
        expect(html).toContain("yng Nghymru a Lloegr, a rhai tribiwnlysoedd sydd heb eu datganoli yn yr Alban.");
      });

      it("should render Welsh observe link text", () => {
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", welshData);
        expect(html).toContain("Arsylwi gwrandawiad llys neu dribiwnlys");
      });
    });

    describe("Edge cases", () => {
      it("should handle very long case names", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              time: "10:00am",
              caseReferenceNumber: "TC/2026/12345",
              caseName: "A Very Long Case Name Involving Multiple Parties and Complex Tax Matters Including International Transactions and Transfer Pricing",
              judges: "Judge John Doe",
              members: "Jane Smith",
              hearingType: "Final Hearing",
              venue: "Royal Courts of Justice",
              additionalInformation: "Remote hearing"
            }
          ]
        };
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", data);
        expect(html).toContain(
          "A Very Long Case Name Involving Multiple Parties and Complex Tax Matters Including International Transactions and Transfer Pricing"
        );
      });

      it("should handle special characters in case details", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              time: "10:00am",
              caseReferenceNumber: "TC/2026/12345",
              caseName: "O'Brien & Smith v HMRC",
              judges: "Judge Mary O'Connor",
              members: "Robert D'Angelo",
              hearingType: "Preliminary Hearing",
              venue: "Field House",
              additionalInformation: "Hearing re: s.29 application"
            }
          ]
        };
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", data);
        expect(html).toContain("O&#39;Brien &amp; Smith v HMRC");
        expect(html).toContain("Judge Mary O&#39;Connor");
      });

      it("should handle zero hearings", () => {
        const data = {
          ...baseData,
          hearings: []
        };
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", data);
        expect(html).toContain('<tbody class="govuk-table__body">');
        expect(html).not.toContain("10:00am");
      });

      it("should handle hearing with all empty optional fields", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              time: "10:00am",
              caseReferenceNumber: "TC/2026/12345",
              caseName: "Smith v HMRC",
              judges: "",
              members: "",
              hearingType: "",
              venue: "",
              additionalInformation: ""
            }
          ]
        };
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", data);
        expect(html).toContain("10:00am");
        expect(html).toContain("TC/2026/12345");
        expect(html).toContain("Smith v HMRC");
        expect(html).toContain('<td class="govuk-table__cell"></td>');
      });

      it("should handle missing dataSource", () => {
        const data = {
          ...baseData,
          dataSource: ""
        };
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", data);
        expect(html).toContain("Data source:");
      });

      it("should handle long additional information text", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              time: "10:00am",
              caseReferenceNumber: "TC/2026/12345",
              caseName: "Smith v HMRC",
              judges: "Judge John Doe",
              members: "Jane Smith",
              hearingType: "Final Hearing",
              venue: "Royal Courts of Justice",
              additionalInformation:
                "This is a remote hearing. Parties should join using the video link provided. Technical support available 30 minutes before the hearing starts. Please test your connection in advance."
            }
          ]
        };
        const html = env.render("upper-tribunal-tax-and-chancery-chamber-daily-hearing-list.njk", data);
        expect(html).toContain("This is a remote hearing");
        expect(html).toContain("test your connection in advance");
      });
    });

    describe("Template data contract", () => {
      it("should document required template variables", () => {
        const templateContract = {
          description: "Upper Tribunal Tax and Chancery Chamber Daily Hearing List template requires the following variables",
          variables: {
            t: {
              type: "object",
              description: "Translation object (upperTribunalTaxAndChanceryChamberDailyHearingListEn or upperTribunalTaxAndChanceryChamberDailyHearingListCy)",
              required: true
            },
            en: {
              type: "object",
              description: "English locale object",
              required: true
            },
            cy: {
              type: "object",
              description: "Welsh locale object",
              required: true
            },
            title: {
              type: "string",
              description: "Page title",
              example: "Upper Tribunal Tax and Chancery Chamber Daily Hearing List",
              required: true
            },
            header: {
              type: "object",
              properties: {
                listTitle: { type: "string", example: "Upper Tribunal Tax and Chancery Chamber Daily Hearing List" },
                hearingDate: { type: "string", example: "10 July 2026" },
                lastUpdatedDate: { type: "string", example: "10 July 2026" },
                lastUpdatedTime: { type: "string", example: "9:30am" }
              },
              required: true
            },
            hearings: {
              type: "array",
              items: {
                time: { type: "string", example: "10:00am" },
                caseReferenceNumber: { type: "string", example: "TC/2026/12345" },
                caseName: { type: "string", example: "Smith v HMRC" },
                judges: { type: "string", example: "Judge John Doe" },
                members: { type: "string", example: "Jane Smith" },
                hearingType: { type: "string", example: "Final Hearing" },
                venue: { type: "string", example: "Royal Courts of Justice" },
                additionalInformation: { type: "string", example: "Remote hearing" }
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
            openingStatement: "Details element is open by default",
            emptyHearings: "Table renders with headers but no rows when hearings array is empty",
            emptyFields: "Empty string fields render as empty table cells",
            specialCharacters: "Nunjucks autoescape handles HTML entities in content",
            backToTop: "Link targets the #top id on the h1 element"
          }
        };

        expect(templateContract.description).toBeDefined();
        expect(templateContract.variables).toBeDefined();
        expect(templateContract.conditionalLogic).toBeDefined();
      });
    });
  });
});
