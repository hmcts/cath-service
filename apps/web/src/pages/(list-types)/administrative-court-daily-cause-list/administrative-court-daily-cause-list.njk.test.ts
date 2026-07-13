import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { administrativeCourtDailyCauseListCy as cy, administrativeCourtDailyCauseListEn as en } from "@hmcts/administrative-court-daily-cause-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("administrative-court-daily-cause-list template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
    const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

    env = nunjucks.configure([__dirname, webCoreViews, govukFrontend], {
      autoescape: true,
      noCache: true
    });
  });

  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "administrative-court-daily-cause-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale - Birmingham", () => {
    const listType = en.BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST;

    it("should have page title", () => {
      expect(listType.pageTitle).toBe("Birmingham Administrative Court Daily Cause List");
    });

    it("should have important info text", () => {
      expect(listType.importantInfoText).toContain("Hearings take place in public");
    });

    it("should have judgments title", () => {
      expect(listType.judgmentsTitle).toBe("Judgments");
    });

    it("should have judgments text", () => {
      expect(listType.judgmentsText).toContain("Judgments handed down by the judge remotely");
    });
  });

  describe("English locale - Leeds", () => {
    const listType = en.LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST;

    it("should have page title", () => {
      expect(listType.pageTitle).toBe("Leeds Administrative Court Daily Cause List");
    });

    it("should have important info text with contact details", () => {
      expect(listType.importantInfoText).toContain("leeds@administrativecourtoffice.justice.gov.uk");
      expect(listType.importantInfoText).toContain("0113 306 2578");
    });

    it("should have judgments title", () => {
      expect(listType.judgmentsTitle).toBe("Judgments");
    });

    it("should have judgments text", () => {
      expect(listType.judgmentsText).toContain("Judgments handed down by the judge remotely");
    });
  });

  describe("English locale - Bristol Cardiff", () => {
    const listType = en.BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST;

    it("should have page title", () => {
      expect(listType.pageTitle).toBe("Bristol and Cardiff Administrative Court Daily Cause List");
    });

    it("should have important info text", () => {
      expect(listType.importantInfoText).toContain("Hearings take place in public");
    });

    it("should have judgments title", () => {
      expect(listType.judgmentsTitle).toBe("Judgments");
    });

    it("should have judgments text", () => {
      expect(listType.judgmentsText).toContain("Judgments handed down by the judge remotely");
    });
  });

  describe("English locale - Manchester", () => {
    const listType = en.MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST;

    it("should have page title", () => {
      expect(listType.pageTitle).toBe("Manchester Administrative Court Daily Cause List");
    });

    it("should have important info text with contact details", () => {
      expect(listType.importantInfoText).toContain("manchester@administrativecourtoffice.justice.gov.uk");
      expect(listType.importantInfoText).toContain("0161 240 5313");
    });

    it("should have judgments title", () => {
      expect(listType.judgmentsTitle).toBe("Judgments");
    });

    it("should have judgments text", () => {
      expect(listType.judgmentsText).toContain("Judgments handed down by the judge remotely");
    });
  });

  describe("English locale - Common", () => {
    const common = en.common;

    it("should have fact link text", () => {
      expect(common.factLinkText).toBe("Find contact details and other information about courts and tribunals");
    });

    it("should have fact link URL", () => {
      expect(common.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
    });

    it("should have fact additional text", () => {
      expect(common.factAdditionalText).toBe("in England and Wales, and some non-devolved tribunals in Scotland.");
    });

    it("should have important info title", () => {
      expect(common.importantInfoTitle).toBe("Important information");
    });

    it("should have search cases title", () => {
      expect(common.searchCasesTitle).toBe("Search Cases");
    });

    it("should have search cases label", () => {
      expect(common.searchCasesLabel).toBe("Search by case number, details, venue, judge, or other information");
    });

    it("should have table headers", () => {
      expect(common.tableHeaders.venue).toBe("Venue");
      expect(common.tableHeaders.judge).toBe("Judge");
      expect(common.tableHeaders.time).toBe("Time");
      expect(common.tableHeaders.caseNumber).toBe("Case Number");
      expect(common.tableHeaders.caseDetails).toBe("Case Details");
      expect(common.tableHeaders.hearingType).toBe("Hearing Type");
      expect(common.tableHeaders.additionalInformation).toBe("Additional Information");
    });

    it("should have data source label", () => {
      expect(common.dataSource).toBe("Data source");
    });

    it("should have back to top label", () => {
      expect(common.backToTop).toBe("Back to top");
    });

    it("should have list for label", () => {
      expect(common.listFor).toBe("List for");
    });

    it("should have last updated label", () => {
      expect(common.lastUpdated).toBe("Last updated");
    });

    it("should have at label", () => {
      expect(common.at).toBe("at");
    });

    it("should have caution note", () => {
      expect(common.cautionNote).toContain("Special Category Data");
    });

    it("should have caution reporting", () => {
      expect(common.cautionReporting).toContain("reporting restrictions");
    });
  });

  describe("Welsh locale - Birmingham", () => {
    const listType = cy.BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST;

    it("should have page title", () => {
      expect(listType.pageTitle).toBe("Rhestr Achosion Dyddiol Llys Gweinyddol Birmingham");
    });

    it("should have important info text", () => {
      expect(listType.importantInfoText).toContain("Mae gwrandawiadau'n cael eu cynnal yn gyhoeddus");
    });

    it("should have judgments title", () => {
      expect(listType.judgmentsTitle).toBe("Dyfarniadau");
    });

    it("should have judgments text", () => {
      expect(listType.judgmentsText).toContain("Bydd dyfarniadau a draddodir gan y barnwr o bell");
    });
  });

  describe("Welsh locale - Leeds", () => {
    const listType = cy.LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST;

    it("should have page title", () => {
      expect(listType.pageTitle).toBe("Rhestr Achosion Dyddiol Llys Gweinyddol Leeds");
    });

    it("should have important info text with contact details", () => {
      expect(listType.importantInfoText).toContain("leeds@administrativecourtoffice.justice.gov.uk");
      expect(listType.importantInfoText).toContain("0113 306 2578");
    });

    it("should have judgments title", () => {
      expect(listType.judgmentsTitle).toBe("Dyfarniadau");
    });

    it("should have judgments text", () => {
      expect(listType.judgmentsText).toContain("Bydd dyfarniadau a draddodir gan y barnwr o bell");
    });
  });

  describe("Welsh locale - Bristol Cardiff", () => {
    const listType = cy.BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST;

    it("should have page title", () => {
      expect(listType.pageTitle).toBe("Rhestr Achosion Dyddiol Llys Gweinyddol Bryste a Chaerdydd");
    });

    it("should have important info text", () => {
      expect(listType.importantInfoText).toContain("Mae gwrandawiadau'n cael eu cynnal yn gyhoeddus");
    });

    it("should have judgments title", () => {
      expect(listType.judgmentsTitle).toBe("Dyfarniadau");
    });

    it("should have judgments text", () => {
      expect(listType.judgmentsText).toContain("Bydd dyfarniadau a draddodir gan y barnwr o bell");
    });
  });

  describe("Welsh locale - Manchester", () => {
    const listType = cy.MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST;

    it("should have page title", () => {
      expect(listType.pageTitle).toBe("Rhestr Achosion Dyddiol Llys Gweinyddol Manceinion");
    });

    it("should have important info text with contact details", () => {
      expect(listType.importantInfoText).toContain("manchester@administrativecourtoffice.justice.gov.uk");
      expect(listType.importantInfoText).toContain("0161 240 5313");
    });

    it("should have judgments title", () => {
      expect(listType.judgmentsTitle).toBe("Dyfarniadau");
    });

    it("should have judgments text", () => {
      expect(listType.judgmentsText).toContain("Bydd dyfarniadau a draddodir gan y barnwr o bell");
    });
  });

  describe("Welsh locale - Common", () => {
    const common = cy.common;

    it("should have fact link text", () => {
      expect(common.factLinkText).toBe("Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd yng Nghymru a Lloegr");
    });

    it("should have fact link URL", () => {
      expect(common.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
    });

    it("should have fact additional text", () => {
      expect(common.factAdditionalText).toBe("a rhai tribiwnlysoedd heb eu datganoli yn yr Alban.");
    });

    it("should have important info title", () => {
      expect(common.importantInfoTitle).toBe("Gwybodaeth bwysig");
    });

    it("should have search cases title", () => {
      expect(common.searchCasesTitle).toBe("Chwilio Achosion");
    });

    it("should have search cases label", () => {
      expect(common.searchCasesLabel).toBe("Chwilio yn ôl rhif achos, manylion, lleoliad, barnwr, neu wybodaeth arall");
    });

    it("should have table headers", () => {
      expect(common.tableHeaders.venue).toBe("Lleoliad");
      expect(common.tableHeaders.judge).toBe("Barnwr");
      expect(common.tableHeaders.time).toBe("Amser");
      expect(common.tableHeaders.caseNumber).toBe("Rhif yr achos");
      expect(common.tableHeaders.caseDetails).toBe("Manylion yr achos");
      expect(common.tableHeaders.hearingType).toBe("Math o wrandawiad");
      expect(common.tableHeaders.additionalInformation).toBe("Gwybodaeth ychwanegol");
    });

    it("should have data source label", () => {
      expect(common.dataSource).toBe("Ffynhonnell data");
    });

    it("should have back to top label", () => {
      expect(common.backToTop).toBe("Yn ôl i frig y dudalen");
    });

    it("should have list for label", () => {
      expect(common.listFor).toBe("Rhestr ar gyfer");
    });

    it("should have last updated label", () => {
      expect(common.lastUpdated).toBe("Diweddarwyd ddiwethaf");
    });

    it("should have at label", () => {
      expect(common.at).toBe("am");
    });

    it("should have caution note", () => {
      expect(common.cautionNote).toContain("Data Categori Arbennig");
    });

    it("should have caution reporting", () => {
      expect(common.cautionReporting).toContain("chyfyngiadau adrodd");
    });
  });

  describe("Locale consistency", () => {
    it("should have same list type keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required list types", () => {
      const requiredListTypes = [
        "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
        "LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
        "BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
        "MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
        "common"
      ];

      requiredListTypes.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });

    it("should have same common keys in English and Welsh", () => {
      expect(Object.keys(en.common).sort()).toEqual(Object.keys(cy.common).sort());
    });

    it("should have same table header keys in English and Welsh", () => {
      expect(Object.keys(en.common.tableHeaders).sort()).toEqual(Object.keys(cy.common.tableHeaders).sort());
    });
  });

  describe("Content validation", () => {
    it("should have non-empty strings for all English list type content", () => {
      const listTypes = [
        en.BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST,
        en.LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST,
        en.BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST,
        en.MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST
      ];

      listTypes.forEach((listType) => {
        expect(listType.pageTitle.length).toBeGreaterThan(0);
        expect(listType.importantInfoText.length).toBeGreaterThan(0);
        expect(listType.judgmentsTitle.length).toBeGreaterThan(0);
        expect(listType.judgmentsText.length).toBeGreaterThan(0);
      });
    });

    it("should have non-empty strings for all English common content", () => {
      expect(en.common.factLinkText.length).toBeGreaterThan(0);
      expect(en.common.factLinkUrl.length).toBeGreaterThan(0);
      expect(en.common.factAdditionalText.length).toBeGreaterThan(0);
      expect(en.common.importantInfoTitle.length).toBeGreaterThan(0);
      expect(en.common.searchCasesTitle.length).toBeGreaterThan(0);
      expect(en.common.searchCasesLabel.length).toBeGreaterThan(0);
      expect(en.common.dataSource.length).toBeGreaterThan(0);
      expect(en.common.backToTop.length).toBeGreaterThan(0);
      expect(en.common.listFor.length).toBeGreaterThan(0);
      expect(en.common.lastUpdated.length).toBeGreaterThan(0);
      expect(en.common.at.length).toBeGreaterThan(0);
      expect(en.common.cautionNote.length).toBeGreaterThan(0);
      expect(en.common.cautionReporting.length).toBeGreaterThan(0);
    });

    it("should have non-empty strings for all Welsh list type content", () => {
      const listTypes = [
        cy.BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST,
        cy.LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST,
        cy.BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST,
        cy.MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST
      ];

      listTypes.forEach((listType) => {
        expect(listType.pageTitle.length).toBeGreaterThan(0);
        expect(listType.importantInfoText.length).toBeGreaterThan(0);
        expect(listType.judgmentsTitle.length).toBeGreaterThan(0);
        expect(listType.judgmentsText.length).toBeGreaterThan(0);
      });
    });

    it("should have non-empty strings for all Welsh common content", () => {
      expect(cy.common.factLinkText.length).toBeGreaterThan(0);
      expect(cy.common.factLinkUrl.length).toBeGreaterThan(0);
      expect(cy.common.factAdditionalText.length).toBeGreaterThan(0);
      expect(cy.common.importantInfoTitle.length).toBeGreaterThan(0);
      expect(cy.common.searchCasesTitle.length).toBeGreaterThan(0);
      expect(cy.common.searchCasesLabel.length).toBeGreaterThan(0);
      expect(cy.common.dataSource.length).toBeGreaterThan(0);
      expect(cy.common.backToTop.length).toBeGreaterThan(0);
      expect(cy.common.listFor.length).toBeGreaterThan(0);
      expect(cy.common.lastUpdated.length).toBeGreaterThan(0);
      expect(cy.common.at.length).toBeGreaterThan(0);
      expect(cy.common.cautionNote.length).toBeGreaterThan(0);
      expect(cy.common.cautionReporting.length).toBeGreaterThan(0);
    });

    it("should have valid URLs", () => {
      expect(en.common.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.common.factLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Template rendering with data variations", () => {
    const baseTemplateData = {
      en,
      cy,
      listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
      listContent: en.BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST,
      common: en.common,
      header: {
        listTitle: "Birmingham Administrative Court Daily Cause List",
        listDate: "10 July 2026",
        lastUpdatedDate: "10 July 2026",
        lastUpdatedTime: "9:00am"
      },
      hearings: [],
      dataSource: "CPP"
    };

    describe("Header rendering", () => {
      it("should render header with title and dates", () => {
        const html = env.render("administrative-court-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain("Birmingham Administrative Court Daily Cause List");
        expect(html).toContain("List for");
        expect(html).toContain("10 July 2026");
        expect(html).toContain("Last updated");
        expect(html).toContain("9:00am");
      });
    });

    describe("Fact link rendering", () => {
      it("should render fact link when present", () => {
        const html = env.render("administrative-court-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("https://www.find-court-tribunal.service.gov.uk/");
        expect(html).toContain("in England and Wales, and some non-devolved tribunals in Scotland.");
      });

      it("should not render fact link when not present", () => {
        const dataWithoutFactLink = {
          ...baseTemplateData,
          common: {
            ...baseTemplateData.common,
            factLinkText: ""
          }
        };
        const html = env.render("administrative-court-daily-cause-list.njk", dataWithoutFactLink);

        expect(html).not.toContain("Find contact details and other information");
      });
    });

    describe("Important information rendering", () => {
      it("should render important information details when present", () => {
        const html = env.render("administrative-court-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain("Important information");
        expect(html).toContain("Hearings take place in public");
        expect(html).toContain("Judgments");
      });

      it("should not render important information when listTypeName missing", () => {
        const dataWithoutListTypeName = {
          ...baseTemplateData,
          listTypeName: null
        };
        const html = env.render("administrative-court-daily-cause-list.njk", dataWithoutListTypeName);

        const detailsMatch = html.match(/govuk-details/g);
        expect(detailsMatch).toBeNull();
      });
    });

    describe("Search rendering", () => {
      it("should render search input", () => {
        const html = env.render("administrative-court-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain("Search Cases");
        expect(html).toContain("case-search-input");
        expect(html).toContain("Search by case number, details, venue, judge, or other information");
      });
    });

    describe("Table rendering", () => {
      it("should render table headers", () => {
        const html = env.render("administrative-court-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain("Venue");
        expect(html).toContain("Judge");
        expect(html).toContain("Time");
        expect(html).toContain("Case Number");
        expect(html).toContain("Case Details");
        expect(html).toContain("Hearing Type");
        expect(html).toContain("Additional Information");
      });

      it("should render empty table when no hearings", () => {
        const html = env.render("administrative-court-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain("govuk-table");
        expect(html).toContain("hearings-table");
      });

      it("should render hearings when present", () => {
        const dataWithHearings = {
          ...baseTemplateData,
          hearings: [
            {
              venue: "Court Room 1",
              judge: "Judge Smith",
              time: "10:00am",
              caseNumber: "T123456/2026",
              caseDetails: "Test Case v Another Party",
              hearingType: "Trial",
              additionalInformation: "Video hearing"
            },
            {
              venue: "Court Room 2",
              judge: "Judge Jones",
              time: "2:00pm",
              caseNumber: "T789012/2026",
              caseDetails: "Another Case v Respondent",
              hearingType: "Directions",
              additionalInformation: ""
            }
          ]
        };
        const html = env.render("administrative-court-daily-cause-list.njk", dataWithHearings);

        expect(html).toContain("Court Room 1");
        expect(html).toContain("Judge Smith");
        expect(html).toContain("10:00am");
        expect(html).toContain("T123456/2026");
        expect(html).toContain("Test Case v Another Party");
        expect(html).toContain("Trial");
        expect(html).toContain("Video hearing");

        expect(html).toContain("Court Room 2");
        expect(html).toContain("Judge Jones");
        expect(html).toContain("2:00pm");
        expect(html).toContain("T789012/2026");
        expect(html).toContain("Another Case v Respondent");
        expect(html).toContain("Directions");
      });
    });

    describe("Data source rendering", () => {
      it("should render data source", () => {
        const html = env.render("administrative-court-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain("Data source");
        expect(html).toContain("CPP");
      });
    });

    describe("Back to top rendering", () => {
      it("should render back to top link", () => {
        const html = env.render("administrative-court-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain("Back to top");
        expect(html).toContain("#top");
      });
    });

    describe("Welsh rendering", () => {
      it("should render Welsh content when using Welsh locale", () => {
        const welshData = {
          ...baseTemplateData,
          listContent: cy.BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST,
          common: cy.common,
          header: {
            listTitle: "Rhestr Achosion Dyddiol Llys Gweinyddol Birmingham",
            listDate: "10 Gorffennaf 2026",
            lastUpdatedDate: "10 Gorffennaf 2026",
            lastUpdatedTime: "9:00am"
          }
        };
        const html = env.render("administrative-court-daily-cause-list.njk", welshData);

        expect(html).toContain("Rhestr Achosion Dyddiol Llys Gweinyddol Birmingham");
        expect(html).toContain("Gwybodaeth bwysig");
        expect(html).toContain("Mae gwrandawiadau'n cael eu cynnal yn gyhoeddus");
        expect(html).toContain("Dyfarniadau");
        expect(html).toContain("Chwilio Achosion");
        expect(html).toContain("Lleoliad");
        expect(html).toContain("Barnwr");
        expect(html).toContain("Amser");
      });
    });

    describe("Different list types rendering", () => {
      it("should render Leeds list type", () => {
        const leedsData = {
          ...baseTemplateData,
          listTypeName: "LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
          listContent: en.LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST,
          header: {
            ...baseTemplateData.header,
            listTitle: "Leeds Administrative Court Daily Cause List"
          }
        };
        const html = env.render("administrative-court-daily-cause-list.njk", leedsData);

        expect(html).toContain("Leeds Administrative Court Daily Cause List");
        expect(html).toContain("leeds@administrativecourtoffice.justice.gov.uk");
        expect(html).toContain("0113 306 2578");
      });

      it("should render Bristol Cardiff list type", () => {
        const bristolCardiffData = {
          ...baseTemplateData,
          listTypeName: "BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
          listContent: en.BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST,
          header: {
            ...baseTemplateData.header,
            listTitle: "Bristol and Cardiff Administrative Court Daily Cause List"
          }
        };
        const html = env.render("administrative-court-daily-cause-list.njk", bristolCardiffData);

        expect(html).toContain("Bristol and Cardiff Administrative Court Daily Cause List");
      });

      it("should render Manchester list type", () => {
        const manchesterData = {
          ...baseTemplateData,
          listTypeName: "MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
          listContent: en.MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST,
          header: {
            ...baseTemplateData.header,
            listTitle: "Manchester Administrative Court Daily Cause List"
          }
        };
        const html = env.render("administrative-court-daily-cause-list.njk", manchesterData);

        expect(html).toContain("Manchester Administrative Court Daily Cause List");
        expect(html).toContain("manchester@administrativecourtoffice.justice.gov.uk");
        expect(html).toContain("0161 240 5313");
      });
    });

    describe("Edge cases", () => {
      it("should handle empty strings in hearings data", () => {
        const dataWithEmptyStrings = {
          ...baseTemplateData,
          hearings: [
            {
              venue: "",
              judge: "",
              time: "",
              caseNumber: "",
              caseDetails: "",
              hearingType: "",
              additionalInformation: ""
            }
          ]
        };
        const html = env.render("administrative-court-daily-cause-list.njk", dataWithEmptyStrings);

        expect(html).toContain("govuk-table");
      });

      it("should handle multiple hearings", () => {
        const hearings = Array.from({ length: 10 }, (_, i) => ({
          venue: `Court Room ${i + 1}`,
          judge: `Judge ${i + 1}`,
          time: `${9 + i}:00am`,
          caseNumber: `T${100000 + i}/2026`,
          caseDetails: `Case ${i + 1} Details`,
          hearingType: "Hearing",
          additionalInformation: `Info ${i + 1}`
        }));

        const dataWithManyHearings = {
          ...baseTemplateData,
          hearings
        };
        const html = env.render("administrative-court-daily-cause-list.njk", dataWithManyHearings);

        expect(html).toContain("Court Room 1");
        expect(html).toContain("Court Room 10");
        expect(html).toContain("T100000/2026");
        expect(html).toContain("T100009/2026");
      });
    });
  });
});
