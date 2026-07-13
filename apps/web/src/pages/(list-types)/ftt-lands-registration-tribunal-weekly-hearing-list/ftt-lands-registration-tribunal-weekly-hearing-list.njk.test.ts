import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fttLrtWeeklyHearingListCy as cy, fttLrtWeeklyHearingListEn as en } from "@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("ftt-lands-registration-tribunal-weekly-hearing-list template", () => {
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
      const templatePath = path.join(__dirname, "ftt-lands-registration-tribunal-weekly-hearing-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have page title", () => {
      expect(en.pageTitle).toBe("First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List");
    });

    it("should have list for week commencing label", () => {
      expect(en.listForWeekCommencing).toBe("List for week commencing");
    });

    it("should have last updated label", () => {
      expect(en.lastUpdated).toBe("Last updated");
    });

    it("should have at label", () => {
      expect(en.at).toBe("at");
    });

    it("should have fact link text", () => {
      expect(en.factLinkText).toBe("Find contact details and other information about courts and tribunals");
    });

    it("should have fact link URL", () => {
      expect(en.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
    });

    it("should have fact additional text", () => {
      expect(en.factAdditionalText).toBe("in England and Wales, and some non-devolved tribunals in Scotland.");
    });

    it("should have important information title", () => {
      expect(en.importantInformationTitle).toBe("Important information");
    });

    it("should have important information text", () => {
      expect(en.importantInformationText).toContain("Members of the public wishing to observe a hearing");
    });

    it("should have important information link text", () => {
      expect(en.importantInformationLinkText).toBe("Observe a court or tribunal hearing as a journalist, researcher or member of the public");
    });

    it("should have important information link URL", () => {
      expect(en.importantInformationLinkUrl).toBe("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
    });

    it("should have search cases title", () => {
      expect(en.searchCasesTitle).toBe("Search Cases");
    });

    it("should have search cases label", () => {
      expect(en.searchCasesLabel).toBe("Search by case name, date, judge, or other details");
    });

    it("should have table headers", () => {
      expect(en.tableHeaders.date).toBe("Date");
      expect(en.tableHeaders.hearingTime).toBe("Hearing time");
      expect(en.tableHeaders.caseName).toBe("Case name");
      expect(en.tableHeaders.caseReferenceNumber).toBe("Case reference number");
      expect(en.tableHeaders.judge).toBe("Judge");
      expect(en.tableHeaders.venuePlatform).toBe("Venue/Platform");
    });

    it("should have data source label", () => {
      expect(en.dataSource).toBe("Data source");
    });

    it("should have back to top label", () => {
      expect(en.backToTop).toBe("Back to top");
    });

    it("should have caution note", () => {
      expect(en.cautionNote).toContain("Special Category Data");
    });

    it("should have caution reporting", () => {
      expect(en.cautionReporting).toContain("reporting restrictions");
    });

    it("should have provenance labels", () => {
      expect(en.provenanceLabels).toBeDefined();
    });
  });

  describe("Welsh locale", () => {
    it("should have page title", () => {
      expect(cy.pageTitle).toBe("First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List");
    });

    it("should have list for week commencing label", () => {
      expect(cy.listForWeekCommencing).toBe("List for week commencing");
    });

    it("should have last updated label", () => {
      expect(cy.lastUpdated).toBe("Last updated");
    });

    it("should have at label", () => {
      expect(cy.at).toBe("at");
    });

    it("should have fact link text", () => {
      expect(cy.factLinkText).toBe("Find contact details and other information about courts and tribunals");
    });

    it("should have fact link URL", () => {
      expect(cy.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
    });

    it("should have fact additional text", () => {
      expect(cy.factAdditionalText).toBe("in England and Wales, and some non-devolved tribunals in Scotland.");
    });

    it("should have important information title", () => {
      expect(cy.importantInformationTitle).toBe("Important information");
    });

    it("should have important information text", () => {
      expect(cy.importantInformationText).toContain("Members of the public wishing to observe a hearing");
    });

    it("should have important information link text", () => {
      expect(cy.importantInformationLinkText).toBe("Observe a court or tribunal hearing as a journalist, researcher or member of the public");
    });

    it("should have important information link URL", () => {
      expect(cy.importantInformationLinkUrl).toBe("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
    });

    it("should have search cases title", () => {
      expect(cy.searchCasesTitle).toBe("Search Cases");
    });

    it("should have search cases label", () => {
      expect(cy.searchCasesLabel).toBe("Search by case name, date, judge, or other details");
    });

    it("should have table headers", () => {
      expect(cy.tableHeaders.date).toBe("Date");
      expect(cy.tableHeaders.hearingTime).toBe("Hearing time");
      expect(cy.tableHeaders.caseName).toBe("Case name");
      expect(cy.tableHeaders.caseReferenceNumber).toBe("Case reference number");
      expect(cy.tableHeaders.judge).toBe("Judge");
      expect(cy.tableHeaders.venuePlatform).toBe("Venue/Platform");
    });

    it("should have data source label", () => {
      expect(cy.dataSource).toBe("Data source");
    });

    it("should have back to top label", () => {
      expect(cy.backToTop).toBe("Back to top");
    });

    it("should have caution note", () => {
      expect(cy.cautionNote).toContain("Special Category Data");
    });

    it("should have caution reporting", () => {
      expect(cy.cautionReporting).toContain("reporting restrictions");
    });

    it("should have provenance labels", () => {
      expect(cy.provenanceLabels).toBeDefined();
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = [
        "pageTitle",
        "listForWeekCommencing",
        "lastUpdated",
        "at",
        "factLinkText",
        "factLinkUrl",
        "factAdditionalText",
        "importantInformationTitle",
        "importantInformationText",
        "importantInformationLinkText",
        "importantInformationLinkUrl",
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
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });

    it("should have same table header keys", () => {
      expect(Object.keys(en.tableHeaders).sort()).toEqual(Object.keys(cy.tableHeaders).sort());
    });
  });

  describe("Content validation", () => {
    it("should have non-empty strings for all English string content", () => {
      expect(en.pageTitle.length).toBeGreaterThan(0);
      expect(en.listForWeekCommencing.length).toBeGreaterThan(0);
      expect(en.lastUpdated.length).toBeGreaterThan(0);
      expect(en.at.length).toBeGreaterThan(0);
      expect(en.factLinkText.length).toBeGreaterThan(0);
      expect(en.factLinkUrl.length).toBeGreaterThan(0);
      expect(en.factAdditionalText.length).toBeGreaterThan(0);
      expect(en.importantInformationTitle.length).toBeGreaterThan(0);
      expect(en.importantInformationText.length).toBeGreaterThan(0);
      expect(en.importantInformationLinkText.length).toBeGreaterThan(0);
      expect(en.importantInformationLinkUrl.length).toBeGreaterThan(0);
      expect(en.searchCasesTitle.length).toBeGreaterThan(0);
      expect(en.searchCasesLabel.length).toBeGreaterThan(0);
      expect(en.dataSource.length).toBeGreaterThan(0);
      expect(en.backToTop.length).toBeGreaterThan(0);
      expect(en.cautionNote.length).toBeGreaterThan(0);
      expect(en.cautionReporting.length).toBeGreaterThan(0);
    });

    it("should have non-empty strings for all Welsh string content", () => {
      expect(cy.pageTitle.length).toBeGreaterThan(0);
      expect(cy.listForWeekCommencing.length).toBeGreaterThan(0);
      expect(cy.lastUpdated.length).toBeGreaterThan(0);
      expect(cy.at.length).toBeGreaterThan(0);
      expect(cy.factLinkText.length).toBeGreaterThan(0);
      expect(cy.factLinkUrl.length).toBeGreaterThan(0);
      expect(cy.factAdditionalText.length).toBeGreaterThan(0);
      expect(cy.importantInformationTitle.length).toBeGreaterThan(0);
      expect(cy.importantInformationText.length).toBeGreaterThan(0);
      expect(cy.importantInformationLinkText.length).toBeGreaterThan(0);
      expect(cy.importantInformationLinkUrl.length).toBeGreaterThan(0);
      expect(cy.searchCasesTitle.length).toBeGreaterThan(0);
      expect(cy.searchCasesLabel.length).toBeGreaterThan(0);
      expect(cy.dataSource.length).toBeGreaterThan(0);
      expect(cy.backToTop.length).toBeGreaterThan(0);
      expect(cy.cautionNote.length).toBeGreaterThan(0);
      expect(cy.cautionReporting.length).toBeGreaterThan(0);
    });

    it("should have valid URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.importantInformationLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.importantInformationLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Template rendering with data variations", () => {
    const baseTemplateData = {
      t: en,
      en,
      cy,
      header: {
        listTitle: "First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List",
        weekCommencingDate: "7 July 2026",
        lastUpdatedDate: "10 July 2026",
        lastUpdatedTime: "9:00am"
      },
      dataSource: "Test Source"
    };

    describe("Basic template rendering", () => {
      it("should render template with header information", () => {
        const html = env.render("ftt-lands-registration-tribunal-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List");
        expect(html).toContain("7 July 2026");
        expect(html).toContain("10 July 2026");
        expect(html).toContain("9:00am");
      });

      it("should render fact link", () => {
        const html = env.render("ftt-lands-registration-tribunal-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("https://www.find-court-tribunal.service.gov.uk/");
        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("in England and Wales, and some non-devolved tribunals in Scotland.");
      });

      it("should render important information details", () => {
        const html = env.render("ftt-lands-registration-tribunal-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Important information");
        expect(html).toContain("Members of the public wishing to observe a hearing");
        expect(html).toContain("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
      });

      it("should render search input", () => {
        const html = env.render("ftt-lands-registration-tribunal-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Search Cases");
        expect(html).toContain('id="case-search-input"');
      });

      it("should render table headers", () => {
        const html = env.render("ftt-lands-registration-tribunal-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Date");
        expect(html).toContain("Hearing time");
        expect(html).toContain("Case name");
        expect(html).toContain("Case reference number");
        expect(html).toContain("Judge");
        expect(html).toContain("Venue/Platform");
      });

      it("should render data source", () => {
        const html = env.render("ftt-lands-registration-tribunal-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Data source");
        expect(html).toContain("Test Source");
      });

      it("should render back to top link", () => {
        const html = env.render("ftt-lands-registration-tribunal-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Back to top");
        expect(html).toContain('href="#top"');
      });
    });

    describe("Hearing variations", () => {
      it("should render hearing with all fields populated", () => {
        const html = env.render("ftt-lands-registration-tribunal-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              date: "Monday 7 July 2026",
              hearingTime: "10:00am",
              caseName: "Smith v Jones",
              caseReferenceNumber: "LR/2026/001",
              judge: "Judge Williams",
              venuePlatform: "Video Hearing"
            }
          ]
        });

        expect(html).toContain("Monday 7 July 2026");
        expect(html).toContain("10:00am");
        expect(html).toContain("Smith v Jones");
        expect(html).toContain("LR/2026/001");
        expect(html).toContain("Judge Williams");
        expect(html).toContain("Video Hearing");
      });

      it("should render multiple hearings", () => {
        const html = env.render("ftt-lands-registration-tribunal-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              date: "Monday 7 July 2026",
              hearingTime: "10:00am",
              caseName: "Smith v Jones",
              caseReferenceNumber: "LR/2026/001",
              judge: "Judge Williams",
              venuePlatform: "Video Hearing"
            },
            {
              date: "Tuesday 8 July 2026",
              hearingTime: "2:00pm",
              caseName: "Brown v White",
              caseReferenceNumber: "LR/2026/002",
              judge: "Judge Taylor",
              venuePlatform: "In Person"
            },
            {
              date: "Wednesday 9 July 2026",
              hearingTime: "11:30am",
              caseName: "Green v Blue",
              caseReferenceNumber: "LR/2026/003",
              judge: "Judge Anderson",
              venuePlatform: "Telephone Hearing"
            }
          ]
        });

        expect(html).toContain("Smith v Jones");
        expect(html).toContain("Brown v White");
        expect(html).toContain("Green v Blue");
        expect(html).toContain("LR/2026/001");
        expect(html).toContain("LR/2026/002");
        expect(html).toContain("LR/2026/003");
      });

      it("should render hearing with empty optional fields", () => {
        const html = env.render("ftt-lands-registration-tribunal-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              date: "Monday 7 July 2026",
              hearingTime: "",
              caseName: "Test Case",
              caseReferenceNumber: "LR/2026/004",
              judge: "",
              venuePlatform: ""
            }
          ]
        });

        expect(html).toContain("Monday 7 July 2026");
        expect(html).toContain("Test Case");
        expect(html).toContain("LR/2026/004");
      });

      it("should handle empty hearings array", () => {
        const html = env.render("ftt-lands-registration-tribunal-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List");
        expect(html).toContain('<tbody class="govuk-table__body">');
      });

      it("should handle long case names", () => {
        const html = env.render("ftt-lands-registration-tribunal-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              date: "Monday 7 July 2026",
              hearingTime: "10:00am",
              caseName:
                "A Very Long Case Name With Multiple Parties Including Smith, Jones, Brown and Several Other Interested Parties v The Defendant and Several Other Respondents",
              caseReferenceNumber: "LR/2026/999",
              judge: "Judge Williams",
              venuePlatform: "Video Hearing"
            }
          ]
        });

        expect(html).toContain("A Very Long Case Name With Multiple Parties");
        expect(html).toContain("LR/2026/999");
      });

      it("should handle special characters in case names", () => {
        const html = env.render("ftt-lands-registration-tribunal-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              date: "Monday 7 July 2026",
              hearingTime: "10:00am",
              caseName: "Smith & Co v Jones & Associates",
              caseReferenceNumber: "LR/2026/100",
              judge: "Judge O'Brien",
              venuePlatform: "In Person"
            }
          ]
        });

        expect(html).toContain("Smith &amp; Co v Jones &amp; Associates");
        expect(html).toContain("O&#39;Brien");
      });

      it("should handle different venue/platform types", () => {
        const html = env.render("ftt-lands-registration-tribunal-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              date: "Monday 7 July 2026",
              hearingTime: "9:00am",
              caseName: "Case 1",
              caseReferenceNumber: "LR/2026/201",
              judge: "Judge A",
              venuePlatform: "In Person"
            },
            {
              date: "Monday 7 July 2026",
              hearingTime: "10:00am",
              caseName: "Case 2",
              caseReferenceNumber: "LR/2026/202",
              judge: "Judge B",
              venuePlatform: "Video Hearing"
            },
            {
              date: "Monday 7 July 2026",
              hearingTime: "11:00am",
              caseName: "Case 3",
              caseReferenceNumber: "LR/2026/203",
              judge: "Judge C",
              venuePlatform: "Telephone Hearing"
            },
            {
              date: "Monday 7 July 2026",
              hearingTime: "2:00pm",
              caseName: "Case 4",
              caseReferenceNumber: "LR/2026/204",
              judge: "Judge D",
              venuePlatform: "Hybrid Hearing"
            }
          ]
        });

        expect(html).toContain("In Person");
        expect(html).toContain("Video Hearing");
        expect(html).toContain("Telephone Hearing");
        expect(html).toContain("Hybrid Hearing");
      });

      it("should handle different hearing times", () => {
        const html = env.render("ftt-lands-registration-tribunal-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              date: "Monday 7 July 2026",
              hearingTime: "9:00am",
              caseName: "Morning Case",
              caseReferenceNumber: "LR/2026/301",
              judge: "Judge Morning",
              venuePlatform: "In Person"
            },
            {
              date: "Monday 7 July 2026",
              hearingTime: "12:30pm",
              caseName: "Midday Case",
              caseReferenceNumber: "LR/2026/302",
              judge: "Judge Midday",
              venuePlatform: "Video Hearing"
            },
            {
              date: "Monday 7 July 2026",
              hearingTime: "4:30pm",
              caseName: "Afternoon Case",
              caseReferenceNumber: "LR/2026/303",
              judge: "Judge Afternoon",
              venuePlatform: "Telephone Hearing"
            }
          ]
        });

        expect(html).toContain("9:00am");
        expect(html).toContain("12:30pm");
        expect(html).toContain("4:30pm");
      });
    });

    describe("Welsh locale rendering", () => {
      it("should render with Welsh translations", () => {
        const welshTemplateData = {
          ...baseTemplateData,
          t: cy,
          hearings: [
            {
              date: "Dydd Llun 7 Gorffennaf 2026",
              hearingTime: "10:00am",
              caseName: "Smith v Jones",
              caseReferenceNumber: "LR/2026/001",
              judge: "Barnwr Williams",
              venuePlatform: "Gwrandawiad Fideo"
            }
          ]
        };

        const html = env.render("ftt-lands-registration-tribunal-weekly-hearing-list.njk", welshTemplateData);

        expect(html).toContain("First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List");
        expect(html).toContain("Dydd Llun 7 Gorffennaf 2026");
      });
    });
  });
});
