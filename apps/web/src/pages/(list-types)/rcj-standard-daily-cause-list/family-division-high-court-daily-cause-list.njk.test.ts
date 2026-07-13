import path from "node:path";
import { fileURLToPath } from "node:url";
import { rcjStandardDailyCauseListCy as cy, rcjStandardDailyCauseListEn as en } from "@hmcts/rcj-standard-daily-cause-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

describe("Family Division High Court Daily Cause List template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = nunjucks.configure([__dirname, webCoreViews, govukFrontend], {
      autoescape: true,
      noCache: true
    });
  });

  describe("Locale content", () => {
    describe("English locale", () => {
      const familyDivision = en.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST;

      it("should have page title", () => {
        expect(familyDivision.pageTitle).toBe("Family Division of the High Court Daily Cause List");
      });

      it("should have venue location lines", () => {
        expect(familyDivision.locationLine1).toBe("Royal Courts of Justice");
        expect(familyDivision.locationLine2).toBe("Strand, London");
        expect(familyDivision.locationLine3).toBe("WC2A 2LL");
      });

      it("should have general hearing rules text", () => {
        expect(familyDivision.generalHearingRulesText).toContain("Any application made after 1 March 2022");
        expect(familyDivision.generalHearingRulesText).toContain("Accredited members of the press");
        expect(familyDivision.generalHearingRulesText).toContain("rcj.familyhighcourt@justice.gov.uk");
        expect(familyDivision.generalHearingRulesText).toContain("rcj.familylisting@justice.gov.uk");
      });

      it("should have Court of Protection section", () => {
        expect(familyDivision.courtOfProtectionTitle).toBe("Court of Protection (Royal Courts of Justice)");
        expect(familyDivision.courtOfProtectionText).toContain("Any application made after 1 March 2022");
        expect(familyDivision.courtOfProtectionText).toContain("Accredited members of the press");
      });

      it("should have Tipstaff section", () => {
        expect(familyDivision.tipstaffTitle).toBe("Tipstaff");
        expect(familyDivision.tipstaffText).toContain("Unlisted applications may only be made");
        expect(familyDivision.tipstaffText).toContain("Applications Court");
        expect(familyDivision.tipstaffText).toContain("10.30am");
        expect(familyDivision.tipstaffText).toContain("020 7947 6200");
      });

      it("should have Judgments section", () => {
        expect(familyDivision.judgmentsTitle).toBe("Judgments");
        expect(familyDivision.judgmentsText).toContain("Judgments will be handed down remotely");
        expect(familyDivision.judgmentsText).toContain("National Archives");
      });

      it("should have common section with required fields", () => {
        expect(en.common.factLinkText).toContain("Find contact details");
        expect(en.common.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(en.common.factAdditionalText).toContain("England and Wales");
        expect(en.common.importantInfoTitle).toBe("Important information");
        expect(en.common.searchCasesTitle).toBe("Search Cases");
        expect(en.common.searchCasesLabel).toContain("Search by case number");
        expect(en.common.dataSource).toBe("Data source");
        expect(en.common.backToTop).toBe("Back to top");
        expect(en.common.listFor).toBe("List for");
        expect(en.common.lastUpdated).toBe("Last updated");
        expect(en.common.at).toBe("at");
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

      it("should have provenance labels", () => {
        expect(en.common.provenanceLabels).toBeDefined();
        expect(typeof en.common.provenanceLabels).toBe("object");
      });
    });

    describe("Welsh locale", () => {
      const familyDivision = cy.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST;

      it("should have page title", () => {
        expect(familyDivision.pageTitle).toBe("Rhestr Achosion Dyddiol Adran Deulu yr Uchel Lys");
      });

      it("should have venue location lines", () => {
        expect(familyDivision.locationLine1).toBe("Llysoedd Barn Brenhinol");
        expect(familyDivision.locationLine2).toBe("Strand, London");
        expect(familyDivision.locationLine3).toBe("WC2A 2LL");
      });

      it("should have general hearing rules text", () => {
        expect(familyDivision.generalHearingRulesText).toBeDefined();
        expect(typeof familyDivision.generalHearingRulesText).toBe("string");
        expect(familyDivision.generalHearingRulesText.length).toBeGreaterThan(0);
      });

      it("should have Court of Protection section", () => {
        expect(familyDivision.courtOfProtectionTitle).toBeDefined();
        expect(familyDivision.courtOfProtectionText).toBeDefined();
        expect(typeof familyDivision.courtOfProtectionText).toBe("string");
      });

      it("should have Tipstaff section", () => {
        expect(familyDivision.tipstaffTitle).toBeDefined();
        expect(familyDivision.tipstaffText).toBeDefined();
        expect(typeof familyDivision.tipstaffText).toBe("string");
      });

      it("should have Judgments section", () => {
        expect(familyDivision.judgmentsTitle).toBeDefined();
        expect(familyDivision.judgmentsText).toBeDefined();
        expect(typeof familyDivision.judgmentsText).toBe("string");
      });

      it("should have common section with required fields", () => {
        expect(cy.common.factLinkText).toContain("Dod o hyd");
        expect(cy.common.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(cy.common.importantInfoTitle).toBe("Gwybodaeth bwysig");
        expect(cy.common.searchCasesTitle).toBe("Chwilio Achosion");
        expect(cy.common.dataSource).toBe("Ffynhonnell data");
        expect(cy.common.backToTop).toBe("Yn ôl i frig y dudalen");
        expect(cy.common.listFor).toBe("Rhestr ar gyfer");
        expect(cy.common.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(cy.common.at).toBe("am");
      });

      it("should have table headers", () => {
        expect(cy.common.tableHeaders.venue).toBeDefined();
        expect(cy.common.tableHeaders.judge).toBeDefined();
        expect(cy.common.tableHeaders.time).toBeDefined();
        expect(cy.common.tableHeaders.caseNumber).toBeDefined();
        expect(cy.common.tableHeaders.caseDetails).toBeDefined();
        expect(cy.common.tableHeaders.hearingType).toBeDefined();
        expect(cy.common.tableHeaders.additionalInformation).toBeDefined();
      });

      it("should have provenance labels", () => {
        expect(cy.common.provenanceLabels).toBeDefined();
        expect(typeof cy.common.provenanceLabels).toBe("object");
      });
    });

    describe("Locale consistency", () => {
      it("should have same top-level structure in English and Welsh", () => {
        const enKeys = Object.keys(en).sort();
        const cyKeys = Object.keys(cy).sort();
        expect(enKeys).toEqual(cyKeys);
      });

      it("should have same structure in Family Division section", () => {
        const enFamilyKeys = Object.keys(en.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST).sort();
        const cyFamilyKeys = Object.keys(cy.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST).sort();
        expect(enFamilyKeys).toEqual(cyFamilyKeys);
      });

      it("should have same common section structure", () => {
        const enCommonKeys = Object.keys(en.common).sort();
        const cyCommonKeys = Object.keys(cy.common).sort();
        expect(enCommonKeys).toEqual(cyCommonKeys);
      });

      it("should have all table headers in both locales", () => {
        const enHeaders = Object.keys(en.common.tableHeaders).sort();
        const cyHeaders = Object.keys(cy.common.tableHeaders).sort();
        expect(enHeaders).toEqual(cyHeaders);
      });
    });
  });

  describe("Template rendering", () => {
    const mockHeader = {
      listTitle: "Family Division of the High Court Daily Cause List",
      listDate: "15 January 2026",
      lastUpdatedDate: "14 January 2026",
      lastUpdatedTime: "12:00pm"
    };

    const mockListContent = en.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST;
    const mockCommon = en.common;
    const mockDataSource = "Manual Upload";

    describe("Header section", () => {
      it("should render title as h1 with anchor", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('<h1 class="govuk-heading-l" id="top">');
        expect(html).toContain(mockHeader.listTitle);
      });

      it("should render FACT link", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('href="https://www.find-court-tribunal.service.gov.uk/"');
        expect(html).toContain(mockCommon.factLinkText);
        expect(html).toContain(mockCommon.factAdditionalText);
      });

      it("should render venue location lines", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain("Royal Courts of Justice");
        expect(html).toContain("Strand, London");
        expect(html).toContain("WC2A 2LL");
      });

      it("should render list date", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockCommon.listFor);
        expect(html).toContain(mockHeader.listDate);
      });

      it("should render last updated information", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockCommon.lastUpdated);
        expect(html).toContain(mockHeader.lastUpdatedDate);
        expect(html).toContain(mockCommon.at);
        expect(html).toContain(mockHeader.lastUpdatedTime);
      });
    });

    describe("Important information section", () => {
      it("should render details component open by default", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('class="govuk-details');
        expect(html).toContain("open");
      });

      it("should render important information title", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockCommon.importantInfoTitle);
      });

      it("should render general hearing rules text with paragraphs", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain("Any application made after 1 March 2022");
        expect(html).toContain('class="govuk-body"');
      });

      it("should render Court of Protection section", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockListContent.courtOfProtectionTitle);
        expect(html).toContain('class="govuk-heading-s');
      });

      it("should render Court of Protection text", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain("Any application made after 1 March 2022");
      });

      it("should render Tipstaff section", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockListContent.tipstaffTitle);
        expect(html).toContain('class="govuk-heading-s');
      });

      it("should render Tipstaff text", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain("Unlisted applications");
        expect(html).toContain("10.30am");
        expect(html).toContain("020 7947 6200");
      });

      it("should render Judgments section heading", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockListContent.judgmentsTitle);
      });

      it("should render Judgments text", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain("Judgments will be handed down remotely");
        expect(html).toContain("National Archives");
      });
    });

    describe("Search section", () => {
      it("should render search input", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('name="search"');
        expect(html).toContain('type="text"');
      });

      it("should render search title", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockCommon.searchCasesTitle);
      });

      it("should render search label with aria-label", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(`aria-label="${mockCommon.searchCasesLabel}"`);
      });

      it("should have visually hidden label for accessibility", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('class="govuk-label govuk-visually-hidden"');
        expect(html).toContain('for="case-search-input"');
      });
    });

    describe("Hearings table", () => {
      const mockHearings = [
        {
          venue: "Court 1",
          judge: "Mr Justice Smith",
          time: "10:00am",
          caseNumber: "FD/123/2026",
          caseDetails: "Re: A (A Child)",
          hearingType: "Final Hearing",
          additionalInformation: "Remote hearing"
        },
        {
          venue: "Court 2",
          judge: "Mrs Justice Brown",
          time: "2:00pm",
          caseNumber: "FD/456/2026",
          caseDetails: "Re: B (Children)",
          hearingType: "Case Management",
          additionalInformation: ""
        }
      ];

      it("should render table with correct role and aria-label", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: mockHearings,
          dataSource: mockDataSource
        });

        expect(html).toContain('id="hearings-table"');
        expect(html).toContain('role="table"');
        expect(html).toContain(`aria-label="${mockHeader.listTitle}"`);
      });

      it("should render all table headers", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: mockHearings,
          dataSource: mockDataSource
        });

        expect(html).toContain(mockCommon.tableHeaders.venue);
        expect(html).toContain(mockCommon.tableHeaders.judge);
        expect(html).toContain(mockCommon.tableHeaders.time);
        expect(html).toContain(mockCommon.tableHeaders.caseNumber);
        expect(html).toContain(mockCommon.tableHeaders.caseDetails);
        expect(html).toContain(mockCommon.tableHeaders.hearingType);
        expect(html).toContain(mockCommon.tableHeaders.additionalInformation);
      });

      it("should use scope=col for header cells", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: mockHearings,
          dataSource: mockDataSource
        });

        const scopeColMatches = html.match(/scope="col"/g) || [];
        expect(scopeColMatches.length).toBeGreaterThanOrEqual(7);
      });

      it("should render single hearing row", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [mockHearings[0]],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockHearings[0].venue);
        expect(html).toContain(mockHearings[0].judge);
        expect(html).toContain(mockHearings[0].time);
        expect(html).toContain(mockHearings[0].caseNumber);
        expect(html).toContain(mockHearings[0].caseDetails);
        expect(html).toContain(mockHearings[0].hearingType);
        expect(html).toContain(mockHearings[0].additionalInformation);
      });

      it("should render multiple hearing rows", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: mockHearings,
          dataSource: mockDataSource
        });

        expect(html).toContain(mockHearings[0].caseNumber);
        expect(html).toContain(mockHearings[1].caseNumber);
        expect(html).toContain(mockHearings[0].caseDetails);
        expect(html).toContain(mockHearings[1].caseDetails);
      });

      it("should render empty additional information gracefully", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [mockHearings[1]],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockHearings[1].venue);
        const tableBodyMatch = html.match(/<tbody[^>]*>(.*?)<\/tbody>/s);
        expect(tableBodyMatch).toBeTruthy();
      });

      it("should render empty hearings array without errors", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('id="hearings-table"');
        expect(html).toContain("<tbody");
        expect(html).toContain("</tbody>");
      });

      it("should contain table structure elements", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: mockHearings,
          dataSource: mockDataSource
        });

        expect(html).toContain('class="govuk-table"');
        expect(html).toContain('class="govuk-table__head"');
        expect(html).toContain('class="govuk-table__body"');
        expect(html).toContain('class="govuk-table__row"');
        expect(html).toContain('class="govuk-table__header"');
        expect(html).toContain('class="govuk-table__cell"');
      });
    });

    describe("Footer section", () => {
      it("should render data source", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockCommon.dataSource);
        expect(html).toContain(mockDataSource);
      });

      it("should render back to top link", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('href="#top"');
        expect(html).toContain(mockCommon.backToTop);
      });

      it("should have back-to-top class for styling", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('class="back-to-top"');
      });
    });

    describe("Welsh locale rendering", () => {
      const mockHeaderCy = {
        listTitle: "Rhestr Achosion Dyddiol Adran Deulu yr Uchel Lys",
        listDate: "15 Ionawr 2026",
        lastUpdatedDate: "14 Ionawr 2026",
        lastUpdatedTime: "12:00pm"
      };

      const mockListContentCy = cy.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST;
      const mockCommonCy = cy.common;

      it("should render with Welsh content", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeaderCy,
          listContent: mockListContentCy,
          common: mockCommonCy,
          hearings: [],
          dataSource: "Lanlwytho â Llaw"
        });

        expect(html).toContain(mockCommonCy.listFor);
        expect(html).toContain(mockCommonCy.lastUpdated);
        expect(html).toContain(mockCommonCy.at);
        expect(html).toContain(mockCommonCy.searchCasesTitle);
        expect(html).toContain(mockCommonCy.dataSource);
        expect(html).toContain(mockCommonCy.backToTop);
      });

      it("should render Welsh venue location", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeaderCy,
          listContent: mockListContentCy,
          common: mockCommonCy,
          hearings: [],
          dataSource: "Lanlwytho â Llaw"
        });

        expect(html).toContain("Llysoedd Barn Brenhinol");
      });

      it("should render Welsh section titles", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeaderCy,
          listContent: mockListContentCy,
          common: mockCommonCy,
          hearings: [],
          dataSource: "Lanlwytho â Llaw"
        });

        expect(html).toContain(mockListContentCy.courtOfProtectionTitle);
        expect(html).toContain(mockListContentCy.tipstaffTitle);
        expect(html).toContain(mockListContentCy.judgmentsTitle);
      });

      it("should render Welsh table headers", () => {
        const mockHearings = [
          {
            venue: "Llys 1",
            judge: "Mr Ustus Smith",
            time: "10:00am",
            caseNumber: "FD/123/2026",
            caseDetails: "Ynghylch: A (Plentyn)",
            hearingType: "Gwrandawiad Terfynol",
            additionalInformation: "Gwrandawiad o bell"
          }
        ];

        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeaderCy,
          listContent: mockListContentCy,
          common: mockCommonCy,
          hearings: mockHearings,
          dataSource: "Lanlwytho â Llaw"
        });

        expect(html).toContain(mockCommonCy.tableHeaders.venue);
        expect(html).toContain(mockCommonCy.tableHeaders.judge);
        expect(html).toContain(mockCommonCy.tableHeaders.time);
        expect(html).toContain(mockCommonCy.tableHeaders.caseNumber);
        expect(html).toContain(mockCommonCy.tableHeaders.caseDetails);
        expect(html).toContain(mockCommonCy.tableHeaders.hearingType);
        expect(html).toContain(mockCommonCy.tableHeaders.additionalInformation);
      });
    });

    describe("Accessibility", () => {
      it("should have GOV.UK grid structure", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('class="govuk-grid-row"');
        expect(html).toContain('class="govuk-grid-column-full"');
      });

      it("should have proper heading hierarchy", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
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
            caseNumber: "FD/1/2026",
            caseDetails: "Case",
            hearingType: "Type",
            additionalInformation: "Info"
          }
        ];

        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: mockHearings,
          dataSource: mockDataSource
        });

        expect(html).toContain("<thead");
        expect(html).toContain("<tbody");
        expect(html).toContain("<th");
        expect(html).toContain("<td");
      });

      it("should use semantic HTML5 elements", () => {
        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain("<label");
        expect(html).toContain("<input");
        expect(html).toContain("<details");
      });

      it("should have proper ARIA labels for table", () => {
        const mockHearings = [
          {
            venue: "Court 1",
            judge: "Judge",
            time: "10:00am",
            caseNumber: "FD/1/2026",
            caseDetails: "Case",
            hearingType: "Type",
            additionalInformation: ""
          }
        ];

        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: mockHearings,
          dataSource: mockDataSource
        });

        expect(html).toContain('role="table"');
        expect(html).toContain("aria-label");
      });
    });

    describe("Data variations", () => {
      it("should handle hearings with all fields populated", () => {
        const completeHearing = {
          venue: "Court 1, Royal Courts of Justice",
          judge: "The Honourable Mr Justice Smith",
          time: "10:30am",
          caseNumber: "FD/1234/2026",
          caseDetails: "Re: A (A Child) - Final Hearing",
          hearingType: "Final Hearing",
          additionalInformation: "Remote hearing via MS Teams"
        };

        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: [completeHearing],
          dataSource: mockDataSource
        });

        expect(html).toContain(completeHearing.venue);
        expect(html).toContain(completeHearing.judge);
        expect(html).toContain(completeHearing.time);
        expect(html).toContain(completeHearing.caseNumber);
        expect(html).toContain(completeHearing.caseDetails);
        expect(html).toContain(completeHearing.hearingType);
        expect(html).toContain(completeHearing.additionalInformation);
      });

      it("should handle multiple hearings with varied data", () => {
        const variedHearings = [
          {
            venue: "Court 1",
            judge: "Mr Justice Smith",
            time: "10:00am",
            caseNumber: "FD/123/2026",
            caseDetails: "Short case",
            hearingType: "CMH",
            additionalInformation: "Remote"
          },
          {
            venue: "Court 2 - Remote Hearing Centre",
            judge: "Mrs Justice Brown QC",
            time: "2:30pm",
            caseNumber: "FD/456/2026",
            caseDetails: "Very long case details with multiple parties involved",
            hearingType: "Final Hearing with multiple issues",
            additionalInformation: ""
          }
        ];

        const html = env.render("family-division-high-court-daily-cause-list.njk", {
          header: mockHeader,
          listContent: mockListContent,
          common: mockCommon,
          hearings: variedHearings,
          dataSource: mockDataSource
        });

        for (const hearing of variedHearings) {
          expect(html).toContain(hearing.caseNumber);
        }
      });

      it("should handle different data source values", () => {
        const dataSources = ["Manual Upload", "Publications", "Automated Import"];

        for (const source of dataSources) {
          const html = env.render("family-division-high-court-daily-cause-list.njk", {
            header: mockHeader,
            listContent: mockListContent,
            common: mockCommon,
            hearings: [],
            dataSource: source
          });

          expect(html).toContain(source);
        }
      });
    });
  });
});
