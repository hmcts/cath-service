import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  londonAdministrativeCourtDailyCauseListCy as cy,
  londonAdministrativeCourtDailyCauseListEn as en
} from "@hmcts/london-administrative-court-daily-cause-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

describe("London Administrative Court Daily Cause List template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = nunjucks.configure([__dirname, webCoreViews, govukFrontend], {
      autoescape: true,
      noCache: true
    });
  });

  describe("Locale content", () => {
    describe("English locale", () => {
      it("should have page title", () => {
        expect(en.pageTitle).toBe("London Administrative Court Daily Cause List");
      });

      it("should have date-related text", () => {
        expect(en.listFor).toBe("List for");
        expect(en.lastUpdated).toBe("Last updated");
        expect(en.at).toBe("at");
      });

      it("should have FACT link information", () => {
        expect(en.factLinkText).toContain("Find contact details");
        expect(en.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(en.factAdditionalText).toContain("England and Wales");
      });

      it("should have venue location lines", () => {
        expect(en.locationLine1).toBe("Royal Courts of Justice");
        expect(en.locationLine2).toBe("Strand, London");
        expect(en.locationLine3).toBe("WC2A 2LL");
      });

      it("should have important information section", () => {
        expect(en.importantInfoTitle).toBe("Important information");
        expect(en.importantInfoText).toContain("Hearings take place in public");
        expect(en.judgmentsTitle).toBe("Judgments");
        expect(en.judgmentsText).toContain("Judgments handed down");
      });

      it("should have search cases section", () => {
        expect(en.searchCasesTitle).toBe("Search Cases");
        expect(en.searchCasesLabel).toContain("Search by case number");
      });

      it("should have table headers", () => {
        expect(en.tableHeaders.venue).toBe("Venue");
        expect(en.tableHeaders.judge).toBe("Judge");
        expect(en.tableHeaders.time).toBe("Time");
        expect(en.tableHeaders.caseNumber).toBe("Case Number");
        expect(en.tableHeaders.caseDetails).toBe("Case Details");
        expect(en.tableHeaders.hearingType).toBe("Hearing Type");
        expect(en.tableHeaders.additionalInformation).toBe("Additional Information");
      });

      it("should have section titles", () => {
        expect(en.mainHearingsTitle).toBe("Main hearings");
        expect(en.planningCourtTitle).toBe("Planning Court");
      });

      it("should have no hearings message", () => {
        expect(en.noHearingsMessage).toBe("No hearings scheduled for this section");
      });

      it("should have footer text", () => {
        expect(en.dataSource).toBe("Data source");
        expect(en.backToTop).toBe("Back to top");
      });

      it("should have caution text", () => {
        expect(en.cautionNote).toContain("Special Category Data");
        expect(en.cautionReporting).toContain("reporting restrictions");
      });

      it("should have provenance labels", () => {
        expect(en.provenanceLabels).toBeDefined();
        expect(typeof en.provenanceLabels).toBe("object");
      });
    });

    describe("Welsh locale", () => {
      it("should have page title", () => {
        expect(cy.pageTitle).toBe("Rhestr Achosion Dyddiol Llys Gweinyddol Llundain");
      });

      it("should have date-related text", () => {
        expect(cy.listFor).toBe("Rhestr ar gyfer");
        expect(cy.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(cy.at).toBe("am");
      });

      it("should have FACT link information", () => {
        expect(cy.factLinkText).toContain("Dod o hyd i fanylion cyswllt");
        expect(cy.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(cy.factAdditionalText).toContain("tribiwnlysoedd");
      });

      it("should have venue location lines", () => {
        expect(cy.locationLine1).toBe("Llysoedd Barn Brenhinol");
        expect(cy.locationLine2).toBe("Strand, London");
        expect(cy.locationLine3).toBe("WC2A 2LL");
      });

      it("should have important information section", () => {
        expect(cy.importantInfoTitle).toBe("Gwybodaeth bwysig");
        expect(cy.importantInfoText).toContain("Mae gwrandawiadau'n cael eu cynnal yn gyhoeddus");
        expect(cy.judgmentsTitle).toBe("Dyfarniadau");
        expect(cy.judgmentsText).toContain("Bydd dyfarniadau");
      });

      it("should have search cases section", () => {
        expect(cy.searchCasesTitle).toBe("Chwilio Achosion");
        expect(cy.searchCasesLabel).toContain("Chwilio yn ôl rhif achos");
      });

      it("should have table headers", () => {
        expect(cy.tableHeaders.venue).toBe("Lleoliad");
        expect(cy.tableHeaders.judge).toBe("Barnwr");
        expect(cy.tableHeaders.time).toBe("Amser");
        expect(cy.tableHeaders.caseNumber).toBe("Rhif yr achos");
        expect(cy.tableHeaders.caseDetails).toBe("Manylion yr achos");
        expect(cy.tableHeaders.hearingType).toBe("Math o wrandawiad");
        expect(cy.tableHeaders.additionalInformation).toBe("Gwybodaeth ychwanegol");
      });

      it("should have section titles", () => {
        expect(cy.mainHearingsTitle).toBe("Prif wrandawiadau");
        expect(cy.planningCourtTitle).toBe("Llys Cynllunio");
      });

      it("should have no hearings message", () => {
        expect(cy.noHearingsMessage).toBe("Dim gwrandawiadau wedi'u trefnu ar gyfer yr adran hon");
      });

      it("should have footer text", () => {
        expect(cy.dataSource).toBe("Ffynhonnell data");
        expect(cy.backToTop).toBe("Yn ôl i frig y dudalen");
      });

      it("should have caution text", () => {
        expect(cy.cautionNote).toContain("Data Categori Arbennig");
        expect(cy.cautionReporting).toContain("GLlTEF");
      });

      it("should have provenance labels", () => {
        expect(cy.provenanceLabels).toBeDefined();
        expect(typeof cy.provenanceLabels).toBe("object");
      });
    });

    describe("Locale consistency", () => {
      it("should have same structure in English and Welsh", () => {
        const enKeys = Object.keys(en).sort();
        const cyKeys = Object.keys(cy).sort();
        expect(enKeys).toEqual(cyKeys);
      });

      it("should have all table headers in both locales", () => {
        const enHeaders = Object.keys(en.tableHeaders).sort();
        const cyHeaders = Object.keys(cy.tableHeaders).sort();
        expect(enHeaders).toEqual(cyHeaders);
      });
    });
  });

  describe("Template rendering", () => {
    const mockHeader = {
      listTitle: "London Administrative Court Daily Cause List",
      listDate: "15 January 2026",
      lastUpdatedDate: "14 January 2026",
      lastUpdatedTime: "12:00pm"
    };

    const mockDataSource = "Manual Upload";

    describe("Header section", () => {
      it("should render title as h1 with anchor", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('<h1 class="govuk-heading-l" id="top">');
        expect(html).toContain(mockHeader.listTitle);
      });

      it("should render FACT link", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('href="https://www.find-court-tribunal.service.gov.uk/"');
        expect(html).toContain(en.factLinkText);
        expect(html).toContain(en.factAdditionalText);
      });

      it("should render venue location lines", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain("Royal Courts of Justice");
        expect(html).toContain("Strand, London");
        expect(html).toContain("WC2A 2LL");
      });

      it("should render list date", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.listFor);
        expect(html).toContain(mockHeader.listDate);
      });

      it("should render last updated information", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.lastUpdated);
        expect(html).toContain(mockHeader.lastUpdatedDate);
        expect(html).toContain(en.at);
        expect(html).toContain(mockHeader.lastUpdatedTime);
      });
    });

    describe("Important information section", () => {
      it("should render details component open by default", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('class="govuk-details');
        expect(html).toContain("open");
      });

      it("should render important information title", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.importantInfoTitle);
      });

      it("should render important information text", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain("Hearings take place in public");
      });

      it("should render judgments section heading", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.judgmentsTitle);
      });

      it("should render judgments text", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain("Judgments handed down");
      });
    });

    describe("Search section", () => {
      it("should render search input", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('name="search"');
        expect(html).toContain('type="text"');
      });

      it("should render search title", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.searchCasesTitle);
      });

      it("should render search label with aria-label", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(`aria-label="${en.searchCasesLabel}"`);
      });

      it("should have visually hidden label for accessibility", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('class="govuk-label govuk-visually-hidden"');
        expect(html).toContain('for="case-search-input"');
      });
    });

    describe("Main hearings section", () => {
      const mockMainHearings = [
        {
          venue: "Court 1",
          judge: "Mr Justice Smith",
          time: "10:00am",
          caseNumber: "CO/123/2026",
          caseDetails: "R (on the application of Jones) v Secretary of State",
          hearingType: "Judicial Review",
          additionalInformation: "Remote hearing"
        },
        {
          venue: "Court 2",
          judge: "Mrs Justice Brown",
          time: "2:00pm",
          caseNumber: "CO/456/2026",
          caseDetails: "R (on the application of Wilson) v Local Authority",
          hearingType: "Permission Hearing",
          additionalInformation: ""
        }
      ];

      it("should render table with correct role and aria-label when hearings exist", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: mockMainHearings,
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('id="main-hearings-section"');
        expect(html).toContain('role="table"');
        expect(html).toContain(`aria-label="${en.mainHearingsTitle}"`);
      });

      it("should render all table headers", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: mockMainHearings,
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.tableHeaders.venue);
        expect(html).toContain(en.tableHeaders.judge);
        expect(html).toContain(en.tableHeaders.time);
        expect(html).toContain(en.tableHeaders.caseNumber);
        expect(html).toContain(en.tableHeaders.caseDetails);
        expect(html).toContain(en.tableHeaders.hearingType);
        expect(html).toContain(en.tableHeaders.additionalInformation);
      });

      it("should use scope=col for header cells", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: mockMainHearings,
          planningCourt: [],
          dataSource: mockDataSource
        });

        const scopeColMatches = html.match(/scope="col"/g) || [];
        expect(scopeColMatches.length).toBeGreaterThanOrEqual(7);
      });

      it("should render single hearing row", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [mockMainHearings[0]],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockMainHearings[0].venue);
        expect(html).toContain(mockMainHearings[0].judge);
        expect(html).toContain(mockMainHearings[0].time);
        expect(html).toContain(mockMainHearings[0].caseNumber);
        expect(html).toContain(mockMainHearings[0].caseDetails);
        expect(html).toContain(mockMainHearings[0].hearingType);
        expect(html).toContain(mockMainHearings[0].additionalInformation);
      });

      it("should render multiple hearing rows", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: mockMainHearings,
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockMainHearings[0].caseNumber);
        expect(html).toContain(mockMainHearings[1].caseNumber);
      });

      it("should render empty additional information", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [mockMainHearings[1]],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockMainHearings[1].venue);
        const tableBodyMatch = html.match(/<tbody[^>]*>(.*?)<\/tbody>/s);
        expect(tableBodyMatch).toBeTruthy();
      });

      it("should show no hearings message when main hearings empty", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.noHearingsMessage);
        expect(html).not.toContain('id="main-hearings-table-container"');
      });
    });

    describe("Planning Court section", () => {
      const mockPlanningHearings = [
        {
          venue: "Planning Court 1",
          judge: "Mr Justice Green",
          time: "10:30am",
          caseNumber: "PC/789/2026",
          caseDetails: "Developer Ltd v Planning Authority",
          hearingType: "Full Hearing",
          additionalInformation: "In person"
        },
        {
          venue: "Planning Court 2",
          judge: "Mrs Justice White",
          time: "2:30pm",
          caseNumber: "PC/101/2026",
          caseDetails: "Resident Association v Developer",
          hearingType: "Case Management",
          additionalInformation: ""
        }
      ];

      it("should render planning court heading", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: mockPlanningHearings,
          dataSource: mockDataSource
        });

        expect(html).toContain(en.planningCourtTitle);
      });

      it("should render planning court section with section-divider class", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: mockPlanningHearings,
          dataSource: mockDataSource
        });

        expect(html).toContain('class="hearings-section section-divider"');
        expect(html).toContain('id="planning-court-section"');
      });

      it("should render planning court table with correct aria-label", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: mockPlanningHearings,
          dataSource: mockDataSource
        });

        expect(html).toContain(`aria-label="${en.planningCourtTitle}"`);
      });

      it("should render single planning court hearing", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [mockPlanningHearings[0]],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockPlanningHearings[0].venue);
        expect(html).toContain(mockPlanningHearings[0].judge);
        expect(html).toContain(mockPlanningHearings[0].caseNumber);
        expect(html).toContain(mockPlanningHearings[0].caseDetails);
      });

      it("should render multiple planning court hearings", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: mockPlanningHearings,
          dataSource: mockDataSource
        });

        expect(html).toContain(mockPlanningHearings[0].caseNumber);
        expect(html).toContain(mockPlanningHearings[1].caseNumber);
      });

      it("should show no hearings message when planning court empty", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        const matches = html.match(new RegExp(en.noHearingsMessage, "g")) || [];
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });

      it("should render planning court heading even when empty", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.planningCourtTitle);
        expect(html).toContain('<h2 class="govuk-heading-l">');
      });
    });

    describe("Mixed sections", () => {
      const mockMainHearings = [
        {
          venue: "Court 1",
          judge: "Mr Justice Smith",
          time: "10:00am",
          caseNumber: "CO/123/2026",
          caseDetails: "Test Case 1",
          hearingType: "Judicial Review",
          additionalInformation: "Remote"
        }
      ];

      const mockPlanningHearings = [
        {
          venue: "Planning Court 1",
          judge: "Mr Justice Green",
          time: "10:30am",
          caseNumber: "PC/789/2026",
          caseDetails: "Test Case 2",
          hearingType: "Full Hearing",
          additionalInformation: "In person"
        }
      ];

      it("should render both sections when both have hearings", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: mockMainHearings,
          planningCourt: mockPlanningHearings,
          dataSource: mockDataSource
        });

        expect(html).toContain('id="main-hearings-section"');
        expect(html).toContain('id="planning-court-section"');
        expect(html).toContain(mockMainHearings[0].caseNumber);
        expect(html).toContain(mockPlanningHearings[0].caseNumber);
      });

      it("should show main hearings table and planning court no hearings message", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: mockMainHearings,
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('id="main-hearings-section"');
        expect(html).toContain(mockMainHearings[0].caseNumber);
        expect(html).toContain(en.planningCourtTitle);
        expect(html).toContain(en.noHearingsMessage);
      });

      it("should show main hearings no hearings message and planning court table", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: mockPlanningHearings,
          dataSource: mockDataSource
        });

        expect(html).toContain(en.noHearingsMessage);
        expect(html).toContain('id="planning-court-section"');
        expect(html).toContain(mockPlanningHearings[0].caseNumber);
      });
    });

    describe("Footer section", () => {
      it("should render data source", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.dataSource);
        expect(html).toContain(mockDataSource);
      });

      it("should render back to top link", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('href="#top"');
        expect(html).toContain(en.backToTop);
      });

      it("should have back-to-top class for styling", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('class="back-to-top"');
      });
    });

    describe("Welsh locale rendering", () => {
      const mockHeaderCy = {
        listTitle: "Rhestr Achosion Dyddiol Llys Gweinyddol Llundain",
        listDate: "15 Ionawr 2026",
        lastUpdatedDate: "14 Ionawr 2026",
        lastUpdatedTime: "12:00pm"
      };

      it("should render with Welsh content when t is cy", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: cy,
          header: mockHeaderCy,
          mainHearings: [],
          planningCourt: [],
          dataSource: "Lanlwytho â Llaw"
        });

        expect(html).toContain(cy.listFor);
        expect(html).toContain(cy.lastUpdated);
        expect(html).toContain(cy.at);
        expect(html).toContain(cy.searchCasesTitle);
        expect(html).toContain(cy.dataSource);
        expect(html).toContain(cy.backToTop);
      });

      it("should render Welsh venue location", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: cy,
          header: mockHeaderCy,
          mainHearings: [],
          planningCourt: [],
          dataSource: "Lanlwytho â Llaw"
        });

        expect(html).toContain("Llysoedd Barn Brenhinol");
      });

      it("should render Welsh section titles", () => {
        const mockHeaderCy = {
          listTitle: "Rhestr Achosion Dyddiol Llys Gweinyddol Llundain",
          listDate: "15 Ionawr 2026",
          lastUpdatedDate: "14 Ionawr 2026",
          lastUpdatedTime: "12:00pm"
        };

        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: cy,
          header: mockHeaderCy,
          mainHearings: [],
          planningCourt: [],
          dataSource: "Lanlwytho â Llaw"
        });

        expect(html).toContain(cy.planningCourtTitle);
        expect(html).toContain("Dim gwrandawiadau wedi");
      });

      it("should render Welsh table headers", () => {
        const mockHearings = [
          {
            venue: "Llys 1",
            judge: "Mr Ustus Smith",
            time: "10:00am",
            caseNumber: "CO/123/2026",
            caseDetails: "Achos prawf",
            hearingType: "Adolygiad Barnwrol",
            additionalInformation: "O bell"
          }
        ];

        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: cy,
          header: mockHeaderCy,
          mainHearings: mockHearings,
          planningCourt: [],
          dataSource: "Lanlwytho â Llaw"
        });

        expect(html).toContain(cy.tableHeaders.venue);
        expect(html).toContain(cy.tableHeaders.judge);
        expect(html).toContain(cy.tableHeaders.time);
        expect(html).toContain(cy.tableHeaders.caseNumber);
        expect(html).toContain(cy.tableHeaders.caseDetails);
        expect(html).toContain(cy.tableHeaders.hearingType);
        expect(html).toContain(cy.tableHeaders.additionalInformation);
      });
    });

    describe("Accessibility", () => {
      it("should have GOV.UK grid structure", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('class="govuk-grid-row"');
        expect(html).toContain('class="govuk-grid-column-full"');
      });

      it("should have proper heading hierarchy", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain("<h1");
        expect(html).toContain("<h2");
        expect(html).toContain("<h3");
      });

      it("should have table semantic structure", () => {
        const mockHearings = [
          {
            venue: "Court 1",
            judge: "Judge",
            time: "10:00am",
            caseNumber: "CO/1/2026",
            caseDetails: "Case",
            hearingType: "Type",
            additionalInformation: "Info"
          }
        ];

        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: mockHearings,
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain("<thead");
        expect(html).toContain("<tbody");
        expect(html).toContain("<th");
        expect(html).toContain("<td");
      });

      it("should use semantic HTML5 elements", () => {
        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: [],
          planningCourt: [],
          dataSource: mockDataSource
        });

        expect(html).toContain("<label");
        expect(html).toContain("<input");
        expect(html).toContain("<details");
      });

      it("should have proper ARIA labels for tables", () => {
        const mockHearings = [
          {
            venue: "Court 1",
            judge: "Judge",
            time: "10:00am",
            caseNumber: "CO/1/2026",
            caseDetails: "Case",
            hearingType: "Type",
            additionalInformation: ""
          }
        ];

        const html = env.render("london-administrative-court-daily-cause-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          mainHearings: mockHearings,
          planningCourt: mockHearings,
          dataSource: mockDataSource
        });

        expect(html).toContain('role="table"');
        expect(html).toContain("aria-label");
      });
    });
  });
});
