import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import { wpafccWeeklyHearingListCy, wpafccWeeklyHearingListEn } from "@hmcts/wpafcc-weekly-hearing-list";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("wpafcc-weekly-hearing-list.njk", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");

    env = createTestEnvironment([__dirname, webCoreViews]);
  });

  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "wpafcc-weekly-hearing-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Locale content", () => {
    describe("English locale", () => {
      it("should have all required keys", () => {
        const requiredKeys = [
          "courtName",
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
          expect(wpafccWeeklyHearingListEn).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(wpafccWeeklyHearingListEn.courtName).toBe("First-tier Tribunal (War Pensions and Armed Forces Compensation)");
        expect(wpafccWeeklyHearingListEn.pageTitle).toBe("First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing List");
        expect(wpafccWeeklyHearingListEn.listForWeekCommencing).toBe("List for week commencing");
        expect(wpafccWeeklyHearingListEn.lastUpdated).toBe("Last updated");
        expect(wpafccWeeklyHearingListEn.at).toBe("at");
        expect(wpafccWeeklyHearingListEn.searchCasesTitle).toBe("Search Cases");
        expect(wpafccWeeklyHearingListEn.dataSource).toBe("Data source");
        expect(wpafccWeeklyHearingListEn.backToTop).toBe("Back to top");
      });

      it("should have correct table header labels", () => {
        expect(wpafccWeeklyHearingListEn.tableHeaders.date).toBe("Date");
        expect(wpafccWeeklyHearingListEn.tableHeaders.hearingTime).toBe("Hearing time");
        expect(wpafccWeeklyHearingListEn.tableHeaders.caseReferenceNumber).toBe("Case reference number");
        expect(wpafccWeeklyHearingListEn.tableHeaders.caseName).toBe("Case name");
        expect(wpafccWeeklyHearingListEn.tableHeaders.panel).toBe("Panel");
        expect(wpafccWeeklyHearingListEn.tableHeaders.modeOfHearing).toBe("Mode of hearing");
        expect(wpafccWeeklyHearingListEn.tableHeaders.venue).toBe("Venue");
        expect(wpafccWeeklyHearingListEn.tableHeaders.additionalInformation).toBe("Additional information");
      });

      it("should have correct URL values", () => {
        expect(wpafccWeeklyHearingListEn.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(wpafccWeeklyHearingListEn.importantInformationLinkUrl).toBe("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
      });

      it("should have correct link text", () => {
        expect(wpafccWeeklyHearingListEn.factLinkText).toBe("Find contact details and other information about courts and tribunals");
        expect(wpafccWeeklyHearingListEn.importantInformationLinkText).toBe(
          "Observe a court or tribunal hearing as a journalist, researcher or member of the public"
        );
      });

      it("should have correct caution text", () => {
        expect(wpafccWeeklyHearingListEn.cautionNote).toContain("Special Category Data");
        expect(wpafccWeeklyHearingListEn.cautionReporting).toContain("reporting restrictions");
      });

      it("should have provenanceLabels object", () => {
        expect(wpafccWeeklyHearingListEn.provenanceLabels).toBeDefined();
        expect(typeof wpafccWeeklyHearingListEn.provenanceLabels).toBe("object");
      });
    });

    describe("Welsh locale", () => {
      it("should have all required keys", () => {
        const requiredKeys = [
          "courtName",
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
          expect(wpafccWeeklyHearingListCy).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(wpafccWeeklyHearingListCy.listForWeekCommencing).toBe("Rhestr ar gyfer yr wythnos yn dechrau ar");
        expect(wpafccWeeklyHearingListCy.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(wpafccWeeklyHearingListCy.at).toBe("am");
        expect(wpafccWeeklyHearingListCy.searchCasesTitle).toBe("Chwilio Achosion");
        expect(wpafccWeeklyHearingListCy.dataSource).toBe("Ffynhonnell data");
        expect(wpafccWeeklyHearingListCy.backToTop).toBe("Yn ôl i frig y dudalen");
      });

      it("should have correct table header labels", () => {
        expect(wpafccWeeklyHearingListCy.tableHeaders.additionalInformation).toBe("Gwybodaeth ychwanegol");
      });

      it("should have correct URL values", () => {
        expect(wpafccWeeklyHearingListCy.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(wpafccWeeklyHearingListCy.importantInformationLinkUrl).toBe("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
      });

      it("should have correct link text", () => {
        expect(wpafccWeeklyHearingListCy.factLinkText).toContain("Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd");
        expect(wpafccWeeklyHearingListCy.importantInformationLinkText).toContain("Arsylwi gwrandawiad llys");
      });

      it("should have correct caution text", () => {
        expect(wpafccWeeklyHearingListCy.cautionNote).toContain("Data Categori Arbennig");
        expect(wpafccWeeklyHearingListCy.cautionReporting).toContain("gyfyngiadau adrodd");
      });

      it("should have provenanceLabels object", () => {
        expect(wpafccWeeklyHearingListCy.provenanceLabels).toBeDefined();
        expect(typeof wpafccWeeklyHearingListCy.provenanceLabels).toBe("object");
      });
    });

    describe("Locale consistency", () => {
      it("should have same structure in English and Welsh", () => {
        expect(Object.keys(wpafccWeeklyHearingListEn).sort()).toEqual(Object.keys(wpafccWeeklyHearingListCy).sort());
      });

      it("should have same types for each key", () => {
        Object.keys(wpafccWeeklyHearingListEn).forEach((key) => {
          const enType = typeof wpafccWeeklyHearingListEn[key as keyof typeof wpafccWeeklyHearingListEn];
          const cyType = typeof wpafccWeeklyHearingListCy[key as keyof typeof wpafccWeeklyHearingListCy];
          expect(enType).toBe(cyType);
        });
      });

      it("should have same table header keys in English and Welsh", () => {
        expect(Object.keys(wpafccWeeklyHearingListEn.tableHeaders).sort()).toEqual(Object.keys(wpafccWeeklyHearingListCy.tableHeaders).sort());
      });
    });
  });

  describe("Template data contract", () => {
    it("should document required template variables", () => {
      const templateContract = {
        description: "WPAFCC Weekly Hearing List template requires the following variables",
        variables: {
          t: {
            type: "object",
            description: "Translation object (wpafccWeeklyHearingListEn or wpafccWeeklyHearingListCy)",
            required: true
          },
          header: {
            type: "object",
            properties: {
              listTitle: { type: "string", example: "Weekly Hearing List" },
              weekCommencingDate: { type: "string", example: "Monday 1 January 2026" },
              lastUpdatedDate: { type: "string", example: "31 December 2025" },
              lastUpdatedTime: { type: "string", example: "2:00pm" }
            },
            required: true
          },
          hearings: {
            type: "array",
            items: {
              date: { type: "string", example: "Monday 6 January 2026" },
              hearingTime: { type: "string", example: "10:00am" },
              caseReferenceNumber: { type: "string", example: "WP/2026/001" },
              caseName: { type: "string", example: "Mr John Smith" },
              panel: { type: "string", example: "Judge A Smith" },
              modeOfHearing: { type: "string", example: "Video" },
              venue: { type: "string", example: "Tribunal Centre" },
              additionalInformation: { type: "string", example: "Additional notes" }
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
          emptyHearings: "Template renders empty table body when hearings array is empty",
          additionalInformation: "Additional information column renders empty cell when value is empty string",
          factLink: "FACT link opens in same window (no target attribute)",
          importantInformationLink: "Important information link opens in new tab with noopener noreferrer",
          detailsOpen: "Details component has open attribute to display content by default",
          topAnchor: "Page has id='top' on h1 for back-to-top link navigation"
        }
      };

      expect(templateContract.description).toBeDefined();
      expect(templateContract.variables).toBeDefined();
      expect(templateContract.conditionalLogic).toBeDefined();
    });
  });

  describe("Template rendering with data variations", () => {
    const baseTemplateData = {
      t: wpafccWeeklyHearingListEn,
      en: wpafccWeeklyHearingListEn,
      cy: wpafccWeeklyHearingListCy,
      header: {
        listTitle: "Test Tribunal Weekly Hearing List",
        weekCommencingDate: "14 July 2026",
        lastUpdatedDate: "13 July 2026",
        lastUpdatedTime: "10:00am"
      },
      dataSource: "Test Data Source"
    };

    describe("Basic rendering", () => {
      it("should render header with list title", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Test Tribunal Weekly Hearing List");
        expect(html).toContain('id="top"');
        expect(html).toContain('class="govuk-heading-l"');
      });

      it("should render week commencing date", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("List for week commencing");
        expect(html).toContain("14 July 2026");
      });

      it("should render last updated information", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Last updated");
        expect(html).toContain("13 July 2026");
        expect(html).toContain("at");
        expect(html).toContain("10:00am");
      });

      it("should render FACT link with correct URL and text", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("https://www.find-court-tribunal.service.gov.uk/");
        expect(html).toContain("in England and Wales, and some non-devolved tribunals in Scotland.");
      });

      it("should render important information details component", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("govuk-details");
        expect(html).toContain("Important information");
        expect(html).toContain('data-module="govuk-details"');
        expect(html).toContain("open");
      });

      it("should render important information link with target blank", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Observe a court or tribunal hearing");
        expect(html).toContain("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener noreferrer"');
      });

      it("should render search input with correct attributes", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Search Cases");
        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('name="search"');
        expect(html).toContain('type="text"');
        expect(html).toContain("govuk-input");
      });

      it("should render table with all headers", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Date");
        expect(html).toContain("Hearing time");
        expect(html).toContain("Case reference number");
        expect(html).toContain("Case name");
        expect(html).toContain("Panel");
        expect(html).toContain("Mode of hearing");
        expect(html).toContain("Venue");
        expect(html).toContain("Additional information");
      });

      it("should render data source footer", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Data source");
        expect(html).toContain("Test Data Source");
        expect(html).toContain("govuk-body-s");
      });

      it("should render back to top link", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Back to top");
        expect(html).toContain('href="#top"');
        expect(html).toContain("back-to-top");
      });
    });

    describe("Hearings table variations", () => {
      it("should render empty table when no hearings", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("<thead");
        expect(html).toContain("<tbody");
        expect(html).toContain("govuk-table");
        const tdMatches = html.match(/<td[^>]*>/g);
        expect(tdMatches).toBeNull();
      });

      it("should render single hearing with all fields populated", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              date: "Monday 14 July 2026",
              hearingTime: "10:00am",
              caseReferenceNumber: "WP/2026/0001",
              caseName: "Mr John Smith",
              panel: "Judge A Smith, Panel Member B Jones",
              modeOfHearing: "Video",
              venue: "First-tier Tribunal Centre",
              additionalInformation: "Interpreter required - Welsh"
            }
          ]
        });

        expect(html).toContain("Monday 14 July 2026");
        expect(html).toContain("10:00am");
        expect(html).toContain("WP/2026/0001");
        expect(html).toContain("Mr John Smith");
        expect(html).toContain("Judge A Smith, Panel Member B Jones");
        expect(html).toContain("Video");
        expect(html).toContain("First-tier Tribunal Centre");
        expect(html).toContain("Interpreter required - Welsh");
      });

      it("should render multiple hearings", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              date: "Monday 14 July 2026",
              hearingTime: "10:00am",
              caseReferenceNumber: "WP/2026/0001",
              caseName: "Mr John Smith",
              panel: "Judge A Smith",
              modeOfHearing: "Video",
              venue: "Tribunal Centre 1",
              additionalInformation: ""
            },
            {
              date: "Monday 14 July 2026",
              hearingTime: "2:00pm",
              caseReferenceNumber: "WP/2026/0002",
              caseName: "Ms Jane Doe",
              panel: "Judge B Jones",
              modeOfHearing: "Telephone",
              venue: "Remote",
              additionalInformation: "Special requirements"
            },
            {
              date: "Tuesday 15 July 2026",
              hearingTime: "9:30am",
              caseReferenceNumber: "WP/2026/0003",
              caseName: "Mr Bob Wilson",
              panel: "Judge C Brown",
              modeOfHearing: "In person",
              venue: "Tribunal Centre 2",
              additionalInformation: ""
            }
          ]
        });

        expect(html).toContain("WP/2026/0001");
        expect(html).toContain("Mr John Smith");
        expect(html).toContain("WP/2026/0002");
        expect(html).toContain("Ms Jane Doe");
        expect(html).toContain("WP/2026/0003");
        expect(html).toContain("Mr Bob Wilson");

        const tableRows = html.match(/<tr class="govuk-table__row">/g);
        expect(tableRows?.length).toBeGreaterThanOrEqual(3);
      });

      it("should render hearing with empty additional information", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              date: "Monday 14 July 2026",
              hearingTime: "10:00am",
              caseReferenceNumber: "WP/2026/0001",
              caseName: "Test Case",
              panel: "Judge Smith",
              modeOfHearing: "Video",
              venue: "Test Venue",
              additionalInformation: ""
            }
          ]
        });

        expect(html).toContain("Test Case");
        expect(html).toContain('<td class="govuk-table__cell"></td>');
      });

      it("should render different hearing modes correctly", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              date: "Monday 14 July 2026",
              hearingTime: "10:00am",
              caseReferenceNumber: "WP/2026/0001",
              caseName: "In Person Case",
              panel: "Judge A",
              modeOfHearing: "In person",
              venue: "Court Room 1",
              additionalInformation: ""
            },
            {
              date: "Monday 14 July 2026",
              hearingTime: "2:00pm",
              caseReferenceNumber: "WP/2026/0002",
              caseName: "Video Case",
              panel: "Judge B",
              modeOfHearing: "Video",
              venue: "Remote",
              additionalInformation: ""
            },
            {
              date: "Monday 14 July 2026",
              hearingTime: "4:00pm",
              caseReferenceNumber: "WP/2026/0003",
              caseName: "Telephone Case",
              panel: "Judge C",
              modeOfHearing: "Telephone",
              venue: "Telephone Hearing",
              additionalInformation: ""
            }
          ]
        });

        expect(html).toContain("In person");
        expect(html).toContain("Video");
        expect(html).toContain("Telephone");
      });

      it("should render panel with multiple members", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              date: "Monday 14 July 2026",
              hearingTime: "10:00am",
              caseReferenceNumber: "WP/2026/0001",
              caseName: "Test Case",
              panel: "Judge A Smith, Panel Member B Jones, Panel Member C Brown",
              modeOfHearing: "In person",
              venue: "Main Venue",
              additionalInformation: ""
            }
          ]
        });

        expect(html).toContain("Judge A Smith, Panel Member B Jones, Panel Member C Brown");
      });
    });

    describe("Welsh translation rendering", () => {
      it("should render in Welsh when t is cy", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          t: wpafccWeeklyHearingListCy,
          en: wpafccWeeklyHearingListEn,
          cy: wpafccWeeklyHearingListCy,
          header: {
            listTitle: "Rhestr Wythnosol Gwrandawiadau Tribiwnlys Prawf",
            weekCommencingDate: "14 Gorffennaf 2026",
            lastUpdatedDate: "13 Gorffennaf 2026",
            lastUpdatedTime: "10:00yb"
          },
          dataSource: "Ffynhonnell Data Prawf",
          hearings: []
        });

        expect(html).toContain("Rhestr ar gyfer yr wythnos yn dechrau ar");
        expect(html).toContain("Diweddarwyd ddiwethaf");
        expect(html).toContain("Gwybodaeth bwysig");
        expect(html).toContain("Chwilio Achosion");
        expect(html).toContain("Ffynhonnell data");
        expect(html).toContain("Yn ôl i frig y dudalen");
      });

      it("should render table header in Welsh", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          t: wpafccWeeklyHearingListCy,
          en: wpafccWeeklyHearingListEn,
          cy: wpafccWeeklyHearingListCy,
          header: {
            listTitle: "Prawf",
            weekCommencingDate: "14 Gorffennaf 2026",
            lastUpdatedDate: "13 Gorffennaf 2026",
            lastUpdatedTime: "10:00yb"
          },
          dataSource: "Prawf",
          hearings: []
        });

        expect(html).toContain("Gwybodaeth ychwanegol");
      });
    });

    describe("Accessibility features", () => {
      it("should have proper ARIA labels on search input", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain('aria-label="Search by case reference number');
      });

      it("should have proper table role and aria-label", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain('role="table"');
        expect(html).toContain(`aria-label="${wpafccWeeklyHearingListEn.pageTitle}"`);
      });

      it("should have proper heading structure", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("<h1");
        expect(html).toContain('class="govuk-heading-l"');
        expect(html).toContain("<h2");
        expect(html).toContain('class="govuk-heading-s"');
      });

      it("should have proper table structure with scope attributes", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("<thead");
        expect(html).toContain("<tbody");
        expect(html).toContain('<th scope="col"');
      });

      it("should have skip link target", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain('id="top"');
        expect(html).toContain('href="#top"');
      });

      it("should have visually hidden label for search input", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("govuk-visually-hidden");
        expect(html).toContain('<label class="govuk-label govuk-visually-hidden"');
      });

      it("should have proper link attributes for external important information link", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener noreferrer"');
      });
    });

    describe("GOV.UK Design System compliance", () => {
      it("should use govuk-grid-row and govuk-grid-column-full", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("govuk-grid-row");
        expect(html).toContain("govuk-grid-column-full");
      });

      it("should use govuk-table classes", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              date: "Monday 14 July 2026",
              hearingTime: "10:00am",
              caseReferenceNumber: "WP/2026/0001",
              caseName: "Test Case",
              panel: "Judge Smith",
              modeOfHearing: "Video",
              venue: "Test Venue",
              additionalInformation: "Note"
            }
          ]
        });

        expect(html).toContain("govuk-table");
        expect(html).toContain("govuk-table__head");
        expect(html).toContain("govuk-table__body");
        expect(html).toContain("govuk-table__row");
        expect(html).toContain("govuk-table__header");
        expect(html).toContain("govuk-table__cell");
      });

      it("should use govuk-body classes for paragraphs", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("govuk-body");
      });

      it("should use govuk-details component correctly", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("govuk-details");
        expect(html).toContain("govuk-details__summary");
        expect(html).toContain("govuk-details__summary-text");
        expect(html).toContain("govuk-details__text");
      });

      it("should use govuk-link class for links", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("govuk-link");
      });

      it("should use govuk-input with width modifier", () => {
        const { html } = render(env, "wpafcc-weekly-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("govuk-input");
        expect(html).toContain("govuk-!-width-one-half");
      });
    });
  });
});
