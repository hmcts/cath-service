import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rcjStandardDailyCauseListCy as cy, rcjStandardDailyCauseListEn as en } from "@hmcts/rcj-standard-daily-cause-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("court-of-appeal-criminal-division-daily-cause-list template", () => {
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
      const templatePath = path.join(__dirname, "court-of-appeal-criminal-division-daily-cause-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale - COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST", () => {
    it("should have page title", () => {
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.pageTitle).toBe("Court of Appeal (Criminal Division) Daily Cause List");
    });

    it("should have location line 1", () => {
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.locationLine1).toBe("Royal Courts of Justice");
    });

    it("should have location line 2", () => {
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.locationLine2).toBe("Strand, London");
    });

    it("should have location line 3", () => {
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.locationLine3).toBe("WC2A 2LL");
    });

    it("should have important info text", () => {
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.importantInfoText).toContain(
        "advocates, whether appearing remotely or in person, are required to be robed"
      );
    });

    it("should have quick guide text", () => {
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.quickGuideText).toBe("For further information about our hearings, please see");
    });

    it("should have quick guide link text", () => {
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.quickGuideLinkText).toBe("this quick guide");
    });

    it("should have quick guide link URL", () => {
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.quickGuideLinkUrl).toMatch(/^https:\/\//);
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.quickGuideLinkUrl).toContain("judiciary.uk");
    });
  });

  describe("Welsh locale - COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST", () => {
    it("should have page title", () => {
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.pageTitle).toBeTruthy();
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.pageTitle.length).toBeGreaterThan(0);
    });

    it("should have location line 1", () => {
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.locationLine1).toBeTruthy();
    });

    it("should have location line 2", () => {
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.locationLine2).toBeTruthy();
    });

    it("should have location line 3", () => {
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.locationLine3).toBeTruthy();
    });

    it("should have important info text", () => {
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.importantInfoText).toBeTruthy();
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.importantInfoText.length).toBeGreaterThan(0);
    });

    it("should have quick guide text", () => {
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.quickGuideText).toBeTruthy();
    });

    it("should have quick guide link text", () => {
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.quickGuideLinkText).toBeTruthy();
    });

    it("should have quick guide link URL", () => {
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.quickGuideLinkUrl).toBeTruthy();
    });
  });

  describe("English locale - common", () => {
    it("should have fact link text", () => {
      expect(en.common.factLinkText).toBe("Find contact details and other information about courts and tribunals");
    });

    it("should have fact link URL", () => {
      expect(en.common.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
    });

    it("should have fact additional text", () => {
      expect(en.common.factAdditionalText).toBe("in England and Wales, and some non-devolved tribunals in Scotland.");
    });

    it("should have important info title", () => {
      expect(en.common.importantInfoTitle).toBe("Important information");
    });

    it("should have search cases title", () => {
      expect(en.common.searchCasesTitle).toBe("Search Cases");
    });

    it("should have search cases label", () => {
      expect(en.common.searchCasesLabel).toBeTruthy();
      expect(en.common.searchCasesLabel.length).toBeGreaterThan(0);
    });

    it("should have table headers", () => {
      expect(en.common.tableHeaders.venue).toBe("Venue");
      expect(en.common.tableHeaders.judge).toBe("Judge");
      expect(en.common.tableHeaders.time).toBe("Time");
      expect(en.common.tableHeaders.caseNumber).toBe("Case number");
      expect(en.common.tableHeaders.caseDetails).toBe("Case details");
      expect(en.common.tableHeaders.hearingType).toBe("Hearing type");
      expect(en.common.tableHeaders.additionalInformation).toBe("Additional information");
    });

    it("should have data source label", () => {
      expect(en.common.dataSource).toBe("Data source");
    });

    it("should have back to top text", () => {
      expect(en.common.backToTop).toBe("Back to top");
    });

    it("should have list for label", () => {
      expect(en.common.listFor).toBe("List for");
    });

    it("should have last updated label", () => {
      expect(en.common.lastUpdated).toBe("Last updated");
    });

    it("should have at label", () => {
      expect(en.common.at).toBe("at");
    });
  });

  describe("Welsh locale - common", () => {
    it("should have fact link text", () => {
      expect(cy.common.factLinkText).toBeTruthy();
      expect(cy.common.factLinkText.length).toBeGreaterThan(0);
    });

    it("should have fact link URL", () => {
      expect(cy.common.factLinkUrl).toBeTruthy();
    });

    it("should have fact additional text", () => {
      expect(cy.common.factAdditionalText).toBeTruthy();
    });

    it("should have important info title", () => {
      expect(cy.common.importantInfoTitle).toBeTruthy();
    });

    it("should have search cases title", () => {
      expect(cy.common.searchCasesTitle).toBeTruthy();
    });

    it("should have search cases label", () => {
      expect(cy.common.searchCasesLabel).toBeTruthy();
    });

    it("should have table headers", () => {
      expect(cy.common.tableHeaders.venue).toBeTruthy();
      expect(cy.common.tableHeaders.judge).toBeTruthy();
      expect(cy.common.tableHeaders.time).toBeTruthy();
      expect(cy.common.tableHeaders.caseNumber).toBeTruthy();
      expect(cy.common.tableHeaders.caseDetails).toBeTruthy();
      expect(cy.common.tableHeaders.hearingType).toBeTruthy();
      expect(cy.common.tableHeaders.additionalInformation).toBeTruthy();
    });

    it("should have data source label", () => {
      expect(cy.common.dataSource).toBeTruthy();
    });

    it("should have back to top text", () => {
      expect(cy.common.backToTop).toBeTruthy();
    });

    it("should have list for label", () => {
      expect(cy.common.listFor).toBeTruthy();
    });

    it("should have last updated label", () => {
      expect(cy.common.lastUpdated).toBeTruthy();
    });

    it("should have at label", () => {
      expect(cy.common.at).toBeTruthy();
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh for COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST", () => {
      expect(Object.keys(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST).sort()).toEqual(Object.keys(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST).sort());
    });

    it("should have same keys in English and Welsh for common", () => {
      expect(Object.keys(en.common).sort()).toEqual(Object.keys(cy.common).sort());
    });

    it("should have all required keys for COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST", () => {
      const requiredKeys = [
        "pageTitle",
        "locationLine1",
        "locationLine2",
        "locationLine3",
        "importantInfoText",
        "quickGuideText",
        "quickGuideLinkText",
        "quickGuideLinkUrl"
      ];

      requiredKeys.forEach((key) => {
        expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST).toHaveProperty(key);
        expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST).toHaveProperty(key);
      });
    });

    it("should have all required keys for common", () => {
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
        expect(en.common).toHaveProperty(key);
        expect(cy.common).toHaveProperty(key);
      });
    });
  });

  describe("Content validation", () => {
    it("should have valid URLs in English", () => {
      expect(en.common.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.quickGuideLinkUrl).toMatch(/^https:\/\//);
    });

    it("should have non-empty strings for all English COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST content", () => {
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.pageTitle.length).toBeGreaterThan(0);
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.locationLine1.length).toBeGreaterThan(0);
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.locationLine2.length).toBeGreaterThan(0);
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.locationLine3.length).toBeGreaterThan(0);
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.importantInfoText.length).toBeGreaterThan(0);
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.quickGuideText.length).toBeGreaterThan(0);
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.quickGuideLinkText.length).toBeGreaterThan(0);
      expect(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.quickGuideLinkUrl.length).toBeGreaterThan(0);
    });

    it("should have non-empty strings for all Welsh COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST content", () => {
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.pageTitle.length).toBeGreaterThan(0);
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.locationLine1.length).toBeGreaterThan(0);
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.locationLine2.length).toBeGreaterThan(0);
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.locationLine3.length).toBeGreaterThan(0);
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.importantInfoText.length).toBeGreaterThan(0);
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.quickGuideText.length).toBeGreaterThan(0);
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.quickGuideLinkText.length).toBeGreaterThan(0);
      expect(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.quickGuideLinkUrl.length).toBeGreaterThan(0);
    });
  });

  describe("Template rendering with data variations", () => {
    const baseTemplateData = {
      common: en.common,
      listContent: en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST,
      header: {
        listTitle: "Court of Appeal (Criminal Division) Daily Cause List",
        listDate: "13 July 2026",
        lastUpdatedDate: "13 July 2026",
        lastUpdatedTime: "9:00am"
      },
      dataSource: "Test Source"
    };

    describe("Basic template structure", () => {
      it("should render template with header information", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Court of Appeal (Criminal Division) Daily Cause List");
        expect(html).toContain("Royal Courts of Justice");
        expect(html).toContain("Strand, London");
        expect(html).toContain("WC2A 2LL");
      });

      it("should render fact link with correct URL", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("https://www.find-court-tribunal.service.gov.uk/");
      });

      it("should render list date and last updated", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("List for");
        expect(html).toContain("13 July 2026");
        expect(html).toContain("Last updated");
        expect(html).toContain("9:00am");
      });

      it("should render important information section", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Important information");
        expect(html).toContain("advocates, whether appearing remotely or in person, are required to be robed");
        expect(html).toContain("this quick guide");
      });

      it("should render search cases section", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Search Cases");
        expect(html).toContain("case-search-input");
      });

      it("should render table headers", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Venue");
        expect(html).toContain("Judge");
        expect(html).toContain("Time");
        expect(html).toContain("Case number");
        expect(html).toContain("Case details");
        expect(html).toContain("Hearing type");
        expect(html).toContain("Additional information");
      });

      it("should render data source", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Data source");
        expect(html).toContain("Test Source");
      });

      it("should render back to top link", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Back to top");
        expect(html).toContain('href="#top"');
      });
    });

    describe("Hearings table variations", () => {
      it("should render single hearing", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              venue: "Court 1",
              judge: "Judge Smith",
              time: "10:00am",
              caseNumber: "T123456",
              caseDetails: "R v Jones",
              hearingType: "Appeal",
              additionalInformation: "In person"
            }
          ]
        });

        expect(html).toContain("Court 1");
        expect(html).toContain("Judge Smith");
        expect(html).toContain("10:00am");
        expect(html).toContain("T123456");
        expect(html).toContain("R v Jones");
        expect(html).toContain("Appeal");
        expect(html).toContain("In person");
      });

      it("should render multiple hearings", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              venue: "Court 1",
              judge: "Judge Smith",
              time: "10:00am",
              caseNumber: "T123456",
              caseDetails: "R v Jones",
              hearingType: "Appeal",
              additionalInformation: "In person"
            },
            {
              venue: "Court 2",
              judge: "Judge Williams",
              time: "2:00pm",
              caseNumber: "T789012",
              caseDetails: "R v Brown",
              hearingType: "Sentence",
              additionalInformation: "Video"
            },
            {
              venue: "Court 3",
              judge: "Judge Taylor",
              time: "11:30am",
              caseNumber: "T345678",
              caseDetails: "R v Green",
              hearingType: "Application",
              additionalInformation: "Remote"
            }
          ]
        });

        expect(html).toContain("Court 1");
        expect(html).toContain("Judge Smith");
        expect(html).toContain("R v Jones");
        expect(html).toContain("Court 2");
        expect(html).toContain("Judge Williams");
        expect(html).toContain("R v Brown");
        expect(html).toContain("Court 3");
        expect(html).toContain("Judge Taylor");
        expect(html).toContain("R v Green");
      });

      it("should handle empty hearings array", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("govuk-table__body");
        expect(html).not.toContain("Court 1");
      });

      it("should handle hearings with empty fields", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              venue: "Court 1",
              judge: "",
              time: "10:00am",
              caseNumber: "T123456",
              caseDetails: "R v Test",
              hearingType: "",
              additionalInformation: ""
            }
          ]
        });

        expect(html).toContain("Court 1");
        expect(html).toContain("10:00am");
        expect(html).toContain("T123456");
        expect(html).toContain("R v Test");
      });

      it("should handle hearings with special characters in case details", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              venue: "Court 1",
              judge: "Judge Smith",
              time: "10:00am",
              caseNumber: "T123456",
              caseDetails: "R v O'Brien & Others",
              hearingType: "Appeal",
              additionalInformation: "In person"
            }
          ]
        });

        expect(html).toContain("R v O&#39;Brien &amp; Others");
      });

      it("should handle hearings with long case details", () => {
        const longCaseDetails = "R v A Very Long Case Name With Multiple Defendants Including Smith, Jones, Williams, and Others";
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              venue: "Court 1",
              judge: "Judge Smith",
              time: "10:00am",
              caseNumber: "T123456",
              caseDetails: longCaseDetails,
              hearingType: "Appeal",
              additionalInformation: "In person"
            }
          ]
        });

        expect(html).toContain("R v A Very Long Case Name");
      });
    });

    describe("Welsh translation", () => {
      it("should render template with Welsh content", () => {
        const welshData = {
          common: cy.common,
          listContent: cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST,
          header: {
            listTitle: cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.pageTitle,
            listDate: "13 Gorffennaf 2026",
            lastUpdatedDate: "13 Gorffennaf 2026",
            lastUpdatedTime: "9:00am"
          },
          dataSource: "Ffynhonnell Data Prawf",
          hearings: []
        };

        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", welshData);

        expect(html).toContain(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.pageTitle);
        expect(html).toContain(cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.locationLine1);
        expect(html).toContain(cy.common.importantInfoTitle);
        expect(html).toContain(cy.common.searchCasesTitle);
      });

      it("should render Welsh table headers", () => {
        const welshData = {
          common: cy.common,
          listContent: cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST,
          header: {
            listTitle: cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.pageTitle,
            listDate: "13 Gorffennaf 2026",
            lastUpdatedDate: "13 Gorffennaf 2026",
            lastUpdatedTime: "9:00am"
          },
          dataSource: "Ffynhonnell Data",
          hearings: []
        };

        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", welshData);

        expect(html).toContain(cy.common.tableHeaders.venue);
        expect(html).toContain(cy.common.tableHeaders.judge);
        expect(html).toContain(cy.common.tableHeaders.time);
        expect(html).toContain(cy.common.tableHeaders.caseNumber);
        expect(html).toContain(cy.common.tableHeaders.caseDetails);
        expect(html).toContain(cy.common.tableHeaders.hearingType);
        expect(html).toContain(cy.common.tableHeaders.additionalInformation);
      });
    });

    describe("Accessibility features", () => {
      it("should have heading with id for anchor link", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain('id="top"');
      });

      it("should have aria-label on search input", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain('aria-label="Search by case number');
      });

      it("should have role attribute on table", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain('role="table"');
      });

      it("should have aria-label on table", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain('aria-label="Court of Appeal (Criminal Division) Daily Cause List"');
      });

      it("should have scope attribute on table headers", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain('scope="col"');
      });
    });

    describe("Links and external references", () => {
      it("should render quick guide link with target blank and security attributes", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener noreferrer"');
        expect(html).toContain(en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.quickGuideLinkUrl);
      });

      it("should render fact link correctly", () => {
        const html = env.render("court-of-appeal-criminal-division-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain('href="https://www.find-court-tribunal.service.gov.uk/"');
        expect(html).toContain('class="govuk-link"');
      });
    });
  });
});
