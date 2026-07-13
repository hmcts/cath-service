import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  upperTribunalLandsChamberDailyHearingListCy as cy,
  upperTribunalLandsChamberDailyHearingListEn as en
} from "@hmcts/upper-tribunal-lands-chamber-daily-hearing-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

describe("Upper Tribunal Lands Chamber Daily Hearing List template", () => {
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
        expect(en.pageTitle).toBe("Upper Tribunal (Lands Chamber) Daily Hearing List");
      });

      it("should have date-related text", () => {
        expect(en.listForDate).toBe("List for");
        expect(en.lastUpdated).toBe("Last updated");
        expect(en.at).toBe("at");
      });

      it("should have FACT link information", () => {
        expect(en.factLinkText).toContain("Find contact details");
        expect(en.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(en.factAdditionalText).toContain("England and Wales");
      });

      it("should have opening statement content", () => {
        expect(en.openingStatementTitle).toBe("Important information");
        expect(en.openingStatement.contactText).toContain("Cloud Video Platform");
        expect(en.openingStatement.contactText).toContain("Lands@justice.gov.uk");
        expect(en.openingStatement.observeLinkText).toContain("Observe a court or tribunal hearing");
        expect(en.openingStatement.observeLinkUrl).toContain("gov.uk/guidance/observe-a-court-or-tribunal-hearing");
      });

      it("should have search cases section", () => {
        expect(en.searchCasesTitle).toBe("Search Cases");
        expect(en.searchCasesLabel).toContain("Search by case reference");
      });

      it("should have table headers", () => {
        expect(en.tableHeaders.time).toBe("Time");
        expect(en.tableHeaders.caseReferenceNumber).toBe("Case reference number");
        expect(en.tableHeaders.caseName).toBe("Case name");
        expect(en.tableHeaders.judges).toBe("Judge(s)");
        expect(en.tableHeaders.members).toBe("Member(s)");
        expect(en.tableHeaders.hearingType).toBe("Hearing type");
        expect(en.tableHeaders.venue).toBe("Venue");
        expect(en.tableHeaders.modeOfHearing).toBe("Mode of hearing");
        expect(en.tableHeaders.additionalInformation).toBe("Additional information");
      });

      it("should have footer text", () => {
        expect(en.dataSource).toBe("Data source");
        expect(en.backToTop).toBe("Back to top");
      });

      it("should have caution notes", () => {
        expect(en.cautionNote).toContain("Special Category Data");
        expect(en.cautionReporting).toContain("reporting restrictions");
      });

      it("should have provenance labels", () => {
        expect(en.provenanceLabels).toBeDefined();
        expect(en.provenanceLabels.MANUAL_UPLOAD).toBe("Manual Upload");
        expect(en.provenanceLabels.XHIBIT).toBe("XHIBIT");
        expect(en.provenanceLabels.SNL).toBe("SNL");
        expect(en.provenanceLabels.COMMON_PLATFORM).toBe("Common Platform");
      });
    });

    describe("Welsh locale", () => {
      it("should have page title", () => {
        expect(cy.pageTitle).toBe("Rhestr Gwrandawiadau Dyddiol Tribiwnlys Uwch (Siambr Tiroedd)");
      });

      it("should have date-related text", () => {
        expect(cy.listForDate).toBe("Rhestr ar gyfer");
        expect(cy.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(cy.at).toBe("am");
      });

      it("should have FACT link information", () => {
        expect(cy.factLinkText).toContain("Dod o hyd i fanylion cyswllt");
        expect(cy.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(cy.factAdditionalText).toContain("Nghymru a Lloegr");
      });

      it("should have opening statement content", () => {
        expect(cy.openingStatementTitle).toBe("Gwybodaeth bwysig");
        expect(cy.openingStatement.contactText).toContain("Blatfform Fideo Cwmwl");
        expect(cy.openingStatement.contactText).toContain("Lands@justice.gov.uk");
        expect(cy.openingStatement.observeLinkText).toContain("Arsylwi gwrandawiad llys");
        expect(cy.openingStatement.observeLinkUrl).toContain("gov.uk/guidance/observe-a-court-or-tribunal-hearing");
      });

      it("should have search cases section", () => {
        expect(cy.searchCasesTitle).toBe("Chwilio Achosion");
        expect(cy.searchCasesLabel).toContain("Chwilio yn ôl cyfeirnod achos");
      });

      it("should have table headers", () => {
        expect(cy.tableHeaders.time).toBe("Amser");
        expect(cy.tableHeaders.caseReferenceNumber).toBe("Rhif cyfeirnod achos");
        expect(cy.tableHeaders.caseName).toBe("Enw'r achos");
        expect(cy.tableHeaders.judges).toBe("Barnwr/Barnwyr");
        expect(cy.tableHeaders.members).toBe("Aelod/Aelodau");
        expect(cy.tableHeaders.hearingType).toBe("Math o wrandawiad");
        expect(cy.tableHeaders.venue).toBe("Lleoliad");
        expect(cy.tableHeaders.modeOfHearing).toBe("Dull gwrandawiad");
        expect(cy.tableHeaders.additionalInformation).toBe("Gwybodaeth ychwanegol");
      });

      it("should have footer text", () => {
        expect(cy.dataSource).toBe("Ffynhonnell data");
        expect(cy.backToTop).toBe("Yn ôl i frig y dudalen");
      });

      it("should have caution notes", () => {
        expect(cy.cautionNote).toContain("Data Categori Arbennig");
        expect(cy.cautionReporting).toContain("gyfyngiadau adrodd");
      });

      it("should have provenance labels", () => {
        expect(cy.provenanceLabels).toBeDefined();
        expect(cy.provenanceLabels.MANUAL_UPLOAD).toBe("Llwytho â Llaw");
        expect(cy.provenanceLabels.XHIBIT).toBe("XHIBIT");
        expect(cy.provenanceLabels.SNL).toBe("SNL");
        expect(cy.provenanceLabels.COMMON_PLATFORM).toBe("Platfform Cyffredin");
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

      it("should have openingStatement object in both locales", () => {
        expect(en.openingStatement).toBeDefined();
        expect(cy.openingStatement).toBeDefined();
        expect(typeof en.openingStatement).toBe("object");
        expect(typeof cy.openingStatement).toBe("object");
      });

      it("should have same openingStatement structure", () => {
        const enOpeningKeys = Object.keys(en.openingStatement).sort();
        const cyOpeningKeys = Object.keys(cy.openingStatement).sort();
        expect(enOpeningKeys).toEqual(cyOpeningKeys);
      });

      it("should have same provenance label keys", () => {
        const enProvenanceKeys = Object.keys(en.provenanceLabels).sort();
        const cyProvenanceKeys = Object.keys(cy.provenanceLabels).sort();
        expect(enProvenanceKeys).toEqual(cyProvenanceKeys);
      });
    });
  });

  describe("Template rendering", () => {
    const mockHeader = {
      listTitle: "Upper Tribunal (Lands Chamber) Daily Hearing List",
      hearingDate: "15 January 2026",
      lastUpdatedDate: "14 January 2026",
      lastUpdatedTime: "12:00pm"
    };

    const mockDataSource = "Manual Upload";

    describe("Header section", () => {
      it("should render title as h1 with anchor", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('<h1 class="govuk-heading-l" id="top">');
        expect(html).toContain(mockHeader.listTitle);
      });

      it("should render FACT link", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('href="https://www.find-court-tribunal.service.gov.uk/"');
        expect(html).toContain(en.factLinkText);
        expect(html).toContain(en.factAdditionalText);
      });

      it("should render list date", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.listForDate);
        expect(html).toContain(mockHeader.hearingDate);
      });

      it("should render last updated information", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.lastUpdated);
        expect(html).toContain(mockHeader.lastUpdatedDate);
        expect(html).toContain(en.at);
        expect(html).toContain(mockHeader.lastUpdatedTime);
      });
    });

    describe("Opening statement section", () => {
      it("should render details component", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('class="govuk-details');
        expect(html).toContain('data-module="govuk-details"');
        expect(html).toContain("open");
      });

      it("should render opening statement title", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.openingStatementTitle);
      });

      it("should render contact text", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.openingStatement.contactText);
        expect(html).toContain("Lands@justice.gov.uk");
      });

      it("should render observe link", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(`href="${en.openingStatement.observeLinkUrl}"`);
        expect(html).toContain(en.openingStatement.observeLinkText);
        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener noreferrer"');
      });
    });

    describe("Search section", () => {
      it("should render search input", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('name="search"');
        expect(html).toContain('type="text"');
      });

      it("should render search title", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.searchCasesTitle);
      });

      it("should render search label", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(`aria-label="${en.searchCasesLabel}"`);
      });

      it("should have visually hidden label for accessibility", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('class="govuk-label govuk-visually-hidden"');
        expect(html).toContain('for="case-search-input"');
      });
    });

    describe("Table structure", () => {
      it("should render table with correct role and aria-label", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('id="hearings-table"');
        expect(html).toContain('role="table"');
        expect(html).toContain(`aria-label="${en.pageTitle}"`);
      });

      it("should render all table headers", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.tableHeaders.time);
        expect(html).toContain(en.tableHeaders.caseReferenceNumber);
        expect(html).toContain(en.tableHeaders.caseName);
        expect(html).toContain(en.tableHeaders.judges);
        expect(html).toContain(en.tableHeaders.members);
        expect(html).toContain(en.tableHeaders.hearingType);
        expect(html).toContain(en.tableHeaders.venue);
        expect(html).toContain(en.tableHeaders.modeOfHearing);
        expect(html).toContain(en.tableHeaders.additionalInformation);
      });

      it("should use scope=col for header cells", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        const scopeColCount = (html.match(/scope="col"/g) || []).length;
        expect(scopeColCount).toBe(9); // 9 columns
      });
    });

    describe("Hearings data", () => {
      const mockHearings = [
        {
          time: "10:00am",
          caseReferenceNumber: "LC/2026/001",
          caseName: "Smith v Jones",
          judges: "Mr Justice Williams",
          members: "A Member Esq",
          hearingType: "Final hearing",
          venue: "Royal Courts of Justice",
          modeOfHearing: "Video hearing",
          additionalInformation: "Interpreter required"
        },
        {
          time: "2:00pm",
          caseReferenceNumber: "LC/2026/002",
          caseName: "Brown v Taylor",
          judges: "Mrs Justice Davis",
          members: "",
          hearingType: "Preliminary hearing",
          venue: "London",
          modeOfHearing: "In person",
          additionalInformation: ""
        }
      ];

      it("should render single hearing row", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [mockHearings[0]],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockHearings[0].time);
        expect(html).toContain(mockHearings[0].caseReferenceNumber);
        expect(html).toContain(mockHearings[0].caseName);
        expect(html).toContain(mockHearings[0].judges);
        expect(html).toContain(mockHearings[0].members);
        expect(html).toContain(mockHearings[0].hearingType);
        expect(html).toContain(mockHearings[0].venue);
        expect(html).toContain(mockHearings[0].modeOfHearing);
        expect(html).toContain(mockHearings[0].additionalInformation);
      });

      it("should render multiple hearing rows", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: mockHearings,
          dataSource: mockDataSource
        });

        // Check first hearing
        expect(html).toContain(mockHearings[0].time);
        expect(html).toContain(mockHearings[0].caseReferenceNumber);
        expect(html).toContain(mockHearings[0].caseName);

        // Check second hearing
        expect(html).toContain(mockHearings[1].time);
        expect(html).toContain(mockHearings[1].caseReferenceNumber);
        expect(html).toContain(mockHearings[1].caseName);
      });

      it("should render empty members field", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [mockHearings[1]], // Has empty members
          dataSource: mockDataSource
        });

        expect(html).toContain(mockHearings[1].judges);
        const tableBodyMatch = html.match(/<tbody[^>]*>(.*?)<\/tbody>/s);
        expect(tableBodyMatch).toBeTruthy();
      });

      it("should render empty additional information", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [mockHearings[1]], // Has empty additionalInformation
          dataSource: mockDataSource
        });

        expect(html).toContain(mockHearings[1].caseName);
        const tableBodyMatch = html.match(/<tbody[^>]*>(.*?)<\/tbody>/s);
        expect(tableBodyMatch).toBeTruthy();
      });

      it("should render empty table when no hearings", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('class="govuk-table"');
        expect(html).toContain('<tbody class="govuk-table__body">');
        // Should have headers but no rows
        expect(html).toContain(en.tableHeaders.time);
      });
    });

    describe("Footer section", () => {
      it("should render data source", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.dataSource);
        expect(html).toContain(mockDataSource);
      });

      it("should render back to top link", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('href="#top"');
        expect(html).toContain(en.backToTop);
      });

      it("should have back-to-top class for styling", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('class="back-to-top"');
      });
    });

    describe("Welsh locale rendering", () => {
      it("should render with Welsh content when t is cy", () => {
        const mockHeaderCy = {
          listTitle: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Uwch (Siambr Tiroedd)",
          hearingDate: "15 Ionawr 2026",
          lastUpdatedDate: "14 Ionawr 2026",
          lastUpdatedTime: "12:00pm"
        };

        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: cy,
          header: mockHeaderCy,
          hearings: [],
          dataSource: "Llwytho â Llaw"
        });

        expect(html).toContain(cy.pageTitle);
        expect(html).toContain(cy.listForDate);
        expect(html).toContain(cy.lastUpdated);
        expect(html).toContain(cy.at);
        expect(html).toContain(cy.searchCasesTitle);
        expect(html).toContain(cy.tableHeaders.time);
        expect(html).toContain(cy.dataSource);
        expect(html).toContain(cy.backToTop);
      });

      it("should render Welsh opening statement", () => {
        const mockHeaderCy = {
          listTitle: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Uwch (Siambr Tiroedd)",
          hearingDate: "15 Ionawr 2026",
          lastUpdatedDate: "14 Ionawr 2026",
          lastUpdatedTime: "12:00pm"
        };

        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: cy,
          header: mockHeaderCy,
          hearings: [],
          dataSource: "Llwytho â Llaw"
        });

        expect(html).toContain(cy.openingStatementTitle);
        expect(html).toContain("Blatfform Fideo Cwmwl");
        expect(html).toContain("Arsylwi gwrandawiad llys");
      });

      it("should render all Welsh table headers", () => {
        const mockHeaderCy = {
          listTitle: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Uwch (Siambr Tiroedd)",
          hearingDate: "15 Ionawr 2026",
          lastUpdatedDate: "14 Ionawr 2026",
          lastUpdatedTime: "12:00pm"
        };

        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: cy,
          header: mockHeaderCy,
          hearings: [],
          dataSource: "Llwytho â Llaw"
        });

        expect(html).toContain("Rhif cyfeirnod achos");
        expect(html).toContain("Enw");
        expect(html).toContain("Barnwr");
        expect(html).toContain("Aelod");
        expect(html).toContain("Math o wrandawiad");
        expect(html).toContain("Lleoliad");
        expect(html).toContain("Dull gwrandawiad");
        expect(html).toContain("Gwybodaeth ychwanegol");
      });
    });

    describe("Accessibility", () => {
      it("should have GOV.UK grid structure", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('class="govuk-grid-row"');
        expect(html).toContain('class="govuk-grid-column-full"');
      });

      it("should have proper heading hierarchy", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain("<h1"); // Main heading
        expect(html).toContain("<h2"); // Search section heading
      });

      it("should have table semantic structure", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain("<thead");
        expect(html).toContain("<tbody");
        expect(html).toContain('<th scope="col"');
      });

      it("should use semantic HTML5 elements", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain("<label");
        expect(html).toContain('<input class="govuk-input');
        expect(html).toContain('<table class="govuk-table"');
      });
    });

    describe("Custom styling", () => {
      it("should include back-to-top custom styles in head block", () => {
        const html = env.render("upper-tribunal-lands-chamber-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(".back-to-top");
        expect(html).toContain("margin-top: 40px");
      });
    });
  });
});
