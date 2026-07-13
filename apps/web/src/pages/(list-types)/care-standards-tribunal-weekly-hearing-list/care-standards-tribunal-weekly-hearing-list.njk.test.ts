import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  careStandardsTribunalWeeklyHearingListCy as cy,
  careStandardsTribunalWeeklyHearingListEn as en
} from "@hmcts/care-standards-tribunal-weekly-hearing-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

describe("Care Standards Tribunal Weekly Hearing List template", () => {
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
        expect(en.pageTitle).toBe("Care Standards Tribunal Weekly Hearing List");
      });

      it("should have date-related text", () => {
        expect(en.listForWeekCommencing).toBe("List for week commencing");
        expect(en.lastUpdated).toBe("Last updated");
        expect(en.at).toBe("at");
      });

      it("should have FACT link information", () => {
        expect(en.factLinkText).toContain("Find contact details");
        expect(en.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(en.factAdditionalText).toContain("England and Wales");
      });

      it("should have important information section", () => {
        expect(en.importantInformationTitle).toBe("Important information");
        expect(en.importantInformationText).toContain("Care Standards Office");
        expect(en.importantInformationText).toContain("cst@justice.gov.uk");
        expect(en.importantInformationLinkText).toContain("Observe a court or tribunal hearing");
        expect(en.importantInformationLinkUrl).toContain("gov.uk/guidance/observe-a-court-or-tribunal-hearing");
      });

      it("should have search cases section", () => {
        expect(en.searchCasesTitle).toBe("Search Cases");
        expect(en.searchCasesLabel).toContain("Search by case name");
      });

      it("should have table headers", () => {
        expect(en.tableHeaders.date).toBe("Date");
        expect(en.tableHeaders.caseName).toBe("Case name");
        expect(en.tableHeaders.hearingLength).toBe("Hearing length");
        expect(en.tableHeaders.hearingType).toBe("Hearing type");
        expect(en.tableHeaders.venue).toBe("Venue");
        expect(en.tableHeaders.additionalInformation).toBe("Additional information");
      });

      it("should have footer text", () => {
        expect(en.dataSource).toBe("Data source");
        expect(en.backToTop).toBe("Back to top");
      });

      it("should have caution notes", () => {
        expect(en.cautionNote).toContain("Special Category Data");
        expect(en.cautionNote).toContain("Data Protection Act 2018");
        expect(en.cautionReporting).toContain("reporting restrictions");
        expect(en.cautionReporting).toContain("HMCTS");
      });

      it("should have provenance labels", () => {
        expect(en.provenanceLabels).toBeDefined();
        expect(typeof en.provenanceLabels).toBe("object");
      });
    });

    describe("Welsh locale", () => {
      it("should have page title", () => {
        expect(cy.pageTitle).toBe("Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal");
      });

      it("should have date-related text", () => {
        expect(cy.listForWeekCommencing).toBe("Rhestr ar gyfer yr wythnos yn dechrau ar");
        expect(cy.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(cy.at).toBe("am");
      });

      it("should have FACT link information", () => {
        expect(cy.factLinkText).toContain("Dod o hyd i fanylion cyswllt");
        expect(cy.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(cy.factAdditionalText).toContain("Alban");
      });

      it("should have important information section", () => {
        expect(cy.importantInformationTitle).toBe("Gwybodaeth bwysig");
        expect(cy.importantInformationText).toContain("Swyddfa Safonau Gofal");
        expect(cy.importantInformationText).toContain("cst@justice.gov.uk");
        expect(cy.importantInformationLinkText).toContain("Arsylwi gwrandawiad llys neu dribiwnlys");
        expect(cy.importantInformationLinkUrl).toContain("gov.uk/guidance/observe-a-court-or-tribunal-hearing");
      });

      it("should have search cases section", () => {
        expect(cy.searchCasesTitle).toBe("Chwilio Achosion");
        expect(cy.searchCasesLabel).toContain("Chwilio yn ôl");
      });

      it("should have table headers", () => {
        expect(cy.tableHeaders.date).toBe("Dyddiad");
        expect(cy.tableHeaders.caseName).toBe("Enw'r achos");
        expect(cy.tableHeaders.hearingLength).toBe("Hyd y gwrandawiad");
        expect(cy.tableHeaders.hearingType).toBe("Math o wrandawiad");
        expect(cy.tableHeaders.venue).toBe("Lleoliad");
        expect(cy.tableHeaders.additionalInformation).toBe("Gwybodaeth ychwanegol");
      });

      it("should have footer text", () => {
        expect(cy.dataSource).toBe("Ffynhonnell data");
        expect(cy.backToTop).toBe("Yn ôl i frig y dudalen");
      });

      it("should have caution notes", () => {
        expect(cy.cautionNote).toContain("Data Categori Arbennig");
        expect(cy.cautionNote).toContain("Neddf Gwarchod Data 2018");
        expect(cy.cautionReporting).toContain("adrodd");
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

      it("should have all required properties", () => {
        const requiredProperties = [
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

        for (const prop of requiredProperties) {
          expect(en).toHaveProperty(prop);
          expect(cy).toHaveProperty(prop);
        }
      });
    });
  });

  describe("Template rendering", () => {
    const mockHeader = {
      listTitle: "Care Standards Tribunal Weekly Hearing List",
      weekCommencingDate: "Monday 6 January 2026",
      lastUpdatedDate: "14 January 2026",
      lastUpdatedTime: "12:00pm"
    };

    const mockDataSource = "Manual Upload";

    describe("Header section", () => {
      it("should render title as h1 with anchor", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
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
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
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

      it("should render week commencing date", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.listForWeekCommencing);
        expect(html).toContain(mockHeader.weekCommencingDate);
      });

      it("should render last updated information", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
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

    describe("Important information section", () => {
      it("should render details component", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
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

      it("should render important information title", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.importantInformationTitle);
      });

      it("should render important information text", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.importantInformationText);
        expect(html).toContain("cst@justice.gov.uk");
      });

      it("should render link to guidance", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(`href="${en.importantInformationLinkUrl}"`);
        expect(html).toContain(en.importantInformationLinkText);
        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener noreferrer"');
      });
    });

    describe("Search section", () => {
      it("should render search input", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
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
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
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
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
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
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
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
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
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
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.tableHeaders.date);
        expect(html).toContain(en.tableHeaders.caseName);
        expect(html).toContain(en.tableHeaders.hearingLength);
        expect(html).toContain(en.tableHeaders.hearingType);
        expect(html).toContain(en.tableHeaders.venue);
        expect(html).toContain(en.tableHeaders.additionalInformation);
      });

      it("should use scope=col for header cells", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        const scopeColCount = (html.match(/scope="col"/g) || []).length;
        expect(scopeColCount).toBe(6);
      });
    });

    describe("Hearings data", () => {
      const mockHearings = [
        {
          date: "Monday 6 January 2026",
          caseName: "Smith v Care Quality Commission",
          hearingLength: "2 hours",
          hearingType: "Final Hearing",
          venue: "Remote - Video",
          additionalInformation: "Interpreter required: Spanish"
        },
        {
          date: "Tuesday 7 January 2026",
          caseName: "Jones v Ofsted",
          hearingLength: "1 hour 30 mins",
          hearingType: "Case Management",
          venue: "Pocock Street, London",
          additionalInformation: ""
        },
        {
          date: "Wednesday 8 January 2026",
          caseName: "Brown v Care Quality Commission",
          hearingLength: "3 hours 15 mins",
          hearingType: "Final Hearing",
          venue: "Remote - Video",
          additionalInformation: "Vulnerable witness"
        }
      ];

      it("should render single hearing row", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [mockHearings[0]],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockHearings[0].date);
        expect(html).toContain(mockHearings[0].caseName);
        expect(html).toContain(mockHearings[0].hearingLength);
        expect(html).toContain(mockHearings[0].hearingType);
        expect(html).toContain(mockHearings[0].venue);
        expect(html).toContain(mockHearings[0].additionalInformation);
      });

      it("should render multiple hearing rows", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: mockHearings,
          dataSource: mockDataSource
        });

        for (const hearing of mockHearings) {
          expect(html).toContain(hearing.caseName);
          expect(html).toContain(hearing.venue);
        }
      });

      it("should render empty additional information", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [mockHearings[1]],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockHearings[1].caseName);
        const tableBodyMatch = html.match(/<tbody[^>]*>(.*?)<\/tbody>/s);
        expect(tableBodyMatch).toBeTruthy();
      });

      it("should render empty table when no hearings", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('class="govuk-table"');
        expect(html).toContain('<tbody class="govuk-table__body">');
        expect(html).toContain(en.tableHeaders.caseName);
      });

      it("should render different hearing lengths", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: mockHearings,
          dataSource: mockDataSource
        });

        expect(html).toContain("2 hours");
        expect(html).toContain("1 hour 30 mins");
        expect(html).toContain("3 hours 15 mins");
      });

      it("should render different hearing types", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: mockHearings,
          dataSource: mockDataSource
        });

        expect(html).toContain("Final Hearing");
        expect(html).toContain("Case Management");
      });

      it("should render different venue types", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: mockHearings,
          dataSource: mockDataSource
        });

        expect(html).toContain("Remote - Video");
        expect(html).toContain("Pocock Street, London");
      });

      it("should render various additional information", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: mockHearings,
          dataSource: mockDataSource
        });

        expect(html).toContain("Interpreter required: Spanish");
        expect(html).toContain("Vulnerable witness");
      });
    });

    describe("Footer section", () => {
      it("should render data source", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
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
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
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
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
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
          listTitle: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal",
          weekCommencingDate: "Dydd Llun 6 Ionawr 2026",
          lastUpdatedDate: "14 Ionawr 2026",
          lastUpdatedTime: "12:00pm"
        };

        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: cy,
          header: mockHeaderCy,
          hearings: [],
          dataSource: "Lanlwytho â Llaw"
        });

        expect(html).toContain(cy.pageTitle);
        expect(html).toContain(cy.listForWeekCommencing);
        expect(html).toContain(cy.lastUpdated);
        expect(html).toContain(cy.at);
        expect(html).toContain(cy.searchCasesTitle);
        expect(html).toContain("Enw&#39;r achos");
        expect(html).toContain(cy.dataSource);
        expect(html).toContain(cy.backToTop);
      });

      it("should render Welsh important information", () => {
        const mockHeaderCy = {
          listTitle: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal",
          weekCommencingDate: "Dydd Llun 6 Ionawr 2026",
          lastUpdatedDate: "14 Ionawr 2026",
          lastUpdatedTime: "12:00pm"
        };

        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: cy,
          header: mockHeaderCy,
          hearings: [],
          dataSource: "Lanlwytho â Llaw"
        });

        expect(html).toContain(cy.importantInformationTitle);
        expect(html).toContain("Swyddfa Safonau Gofal");
      });

      it("should render all Welsh table headers", () => {
        const mockHeaderCy = {
          listTitle: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal",
          weekCommencingDate: "Dydd Llun 6 Ionawr 2026",
          lastUpdatedDate: "14 Ionawr 2026",
          lastUpdatedTime: "12:00pm"
        };

        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: cy,
          header: mockHeaderCy,
          hearings: [],
          dataSource: "Lanlwytho â Llaw"
        });

        expect(html).toContain(cy.tableHeaders.date);
        expect(html).toContain("Enw&#39;r achos");
        expect(html).toContain(cy.tableHeaders.hearingLength);
        expect(html).toContain(cy.tableHeaders.hearingType);
        expect(html).toContain(cy.tableHeaders.venue);
        expect(html).toContain(cy.tableHeaders.additionalInformation);
      });
    });

    describe("Accessibility", () => {
      it("should have GOV.UK grid structure", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
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
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain("<h1");
        expect(html).toContain("<h2");
      });

      it("should have table semantic structure", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
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
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
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

      it("should have external link security attributes", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener noreferrer"');
      });
    });

    describe("Custom styling", () => {
      it("should include back-to-top custom styles in head block", () => {
        const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
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

    describe("Data variations", () => {
      it("should handle different data source values", () => {
        const dataSources = [
          { input: "Manual Upload", expected: "Manual Upload" },
          { input: "CaTH", expected: "CaTH" },
          { input: "P&I", expected: "P&amp;I" },
          { input: "UNKNOWN_SOURCE", expected: "UNKNOWN_SOURCE" }
        ];

        for (const { input, expected } of dataSources) {
          const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
            en,
            cy,
            t: en,
            header: mockHeader,
            hearings: [],
            dataSource: input
          });

          expect(html).toContain(expected);
        }
      });

      it("should render with varying numbers of hearings", () => {
        const hearingCounts = [0, 1, 5, 10];

        for (const count of hearingCounts) {
          const hearings = Array.from({ length: count }, (_, i) => ({
            date: `Day ${i + 1}`,
            caseName: `Case ${i + 1}`,
            hearingLength: `${i + 1} hours`,
            hearingType: "Type",
            venue: "Venue",
            additionalInformation: ""
          }));

          const html = env.render("care-standards-tribunal-weekly-hearing-list.njk", {
            en,
            cy,
            t: en,
            header: mockHeader,
            hearings,
            dataSource: mockDataSource
          });

          expect(html).toContain('class="govuk-table"');
        }
      });
    });
  });
});
