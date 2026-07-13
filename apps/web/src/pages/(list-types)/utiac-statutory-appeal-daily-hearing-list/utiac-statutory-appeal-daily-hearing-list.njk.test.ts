import path from "node:path";
import { fileURLToPath } from "node:url";
import { utiacStatutoryAppealDailyHearingListCy as cy, utiacStatutoryAppealDailyHearingListEn as en } from "@hmcts/utiac-statutory-appeal-daily-hearing-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

describe("UTIAC Statutory Appeal Daily Hearing List template", () => {
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
        expect(en.pageTitle).toBe("Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List");
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

      it("should have important information section", () => {
        expect(en.importantInformationTitle).toBe("Important information");
        expect(en.importantInformationText).toContain("We update this list by 5pm");
        expect(en.importantInformationEmailText).toContain("uppertribunallistingteam@justice.gov.uk");
        expect(en.importantInformationLinkText).toContain("Observe a court or tribunal hearing");
        expect(en.importantInformationLinkUrl).toContain("gov.uk/guidance/observe-a-court-or-tribunal-hearing");
      });

      it("should have search cases section", () => {
        expect(en.searchCasesTitle).toBe("Search Cases");
        expect(en.searchCasesLabel).toContain("Search by appeal reference number");
      });

      it("should have table headers", () => {
        expect(en.tableHeaders.hearingTime).toBe("Hearing time");
        expect(en.tableHeaders.appellant).toBe("Appellant");
        expect(en.tableHeaders.representative).toBe("Representative");
        expect(en.tableHeaders.appealReferenceNumber).toBe("Appeal reference number");
        expect(en.tableHeaders.judges).toBe("Judge(s)");
        expect(en.tableHeaders.hearingType).toBe("Hearing type");
        expect(en.tableHeaders.location).toBe("Location");
        expect(en.tableHeaders.additionalInformation).toBe("Additional information");
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
        expect(cy.pageTitle).toBe("Uwch Dribiwnlys (Siambr Mewnfudo a Lloches) - Rhestr o Wrandawiadau Dyddiol - Apeliadau Statudol");
      });

      it("should have date-related text", () => {
        expect(cy.listForDate).toBeDefined();
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
        expect(cy.importantInformationText).toBeDefined();
        expect(cy.importantInformationEmailText).toBeDefined();
        expect(cy.importantInformationLinkText).toContain("Arsylwi gwrandawiad llys neu dribiwnlys");
        expect(cy.importantInformationLinkUrl).toContain("gov.uk/guidance/observe-a-court-or-tribunal-hearing");
      });

      it("should have search cases section", () => {
        expect(cy.searchCasesTitle).toBe("Chwilio Achosion");
        expect(cy.searchCasesLabel).toBeDefined();
      });

      it("should have table headers", () => {
        expect(cy.tableHeaders.hearingTime).toBeDefined();
        expect(cy.tableHeaders.appellant).toBeDefined();
        expect(cy.tableHeaders.representative).toBeDefined();
        expect(cy.tableHeaders.appealReferenceNumber).toBeDefined();
        expect(cy.tableHeaders.judges).toBeDefined();
        expect(cy.tableHeaders.hearingType).toBeDefined();
        expect(cy.tableHeaders.location).toBeDefined();
        expect(cy.tableHeaders.additionalInformation).toBe("Gwybodaeth ychwanegol");
      });

      it("should have footer text", () => {
        expect(cy.dataSource).toBe("Ffynhonnell data");
        expect(cy.backToTop).toBe("Yn ôl i frig y dudalen");
      });

      it("should have caution text", () => {
        expect(cy.cautionNote).toContain("Data Categori Arbennig");
        expect(cy.cautionReporting).toContain("gwybodaeth");
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
      listTitle: "Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List",
      listForDate: "15 January 2026",
      lastUpdatedDate: "14 January 2026",
      lastUpdatedTime: "12:00pm"
    };

    const mockDataSource = "Manual Upload";

    describe("Header section", () => {
      it("should render title as h1 with anchor", () => {
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.listForDate);
        expect(html).toContain(mockHeader.listForDate);
      });

      it("should render last updated information", () => {
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        // Check that important information paragraph is rendered (content varies by locale)
        expect(html).toContain('class="govuk-details__text"');
        // Check for a distinctive part of the English text
        expect(html).toContain("We update this list by 5pm");
      });

      it("should render email text", () => {
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.importantInformationEmailText);
      });

      it("should render link to guidance", () => {
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.tableHeaders.hearingTime);
        expect(html).toContain(en.tableHeaders.appellant);
        expect(html).toContain(en.tableHeaders.representative);
        expect(html).toContain(en.tableHeaders.appealReferenceNumber);
        expect(html).toContain(en.tableHeaders.judges);
        expect(html).toContain(en.tableHeaders.hearingType);
        expect(html).toContain(en.tableHeaders.location);
        expect(html).toContain(en.tableHeaders.additionalInformation);
      });

      it("should use scope=col for header cells", () => {
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        const scopeColCount = (html.match(/scope="col"/g) || []).length;
        expect(scopeColCount).toBe(8); // 8 columns
      });
    });

    describe("Hearings data", () => {
      const mockHearings = [
        {
          hearingTime: "10:00am",
          appellant: "John Smith",
          representative: "ABC Solicitors",
          appealReferenceNumber: "IA/12345/2026",
          judges: "Judge A. Johnson",
          hearingType: "Remote - Video",
          location: "Field House",
          additionalInformation: "Interpreter required"
        },
        {
          hearingTime: "2:00pm",
          appellant: "Jane Doe",
          representative: "",
          appealReferenceNumber: "IA/67890/2026",
          judges: "Judge B. Williams, Judge C. Brown",
          hearingType: "In person",
          location: "Taylor House",
          additionalInformation: ""
        }
      ];

      it("should render single hearing row", () => {
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [mockHearings[0]],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockHearings[0].hearingTime);
        expect(html).toContain(mockHearings[0].appellant);
        expect(html).toContain(mockHearings[0].representative);
        expect(html).toContain(mockHearings[0].appealReferenceNumber);
        expect(html).toContain(mockHearings[0].judges);
        expect(html).toContain(mockHearings[0].hearingType);
        expect(html).toContain(mockHearings[0].location);
        expect(html).toContain(mockHearings[0].additionalInformation);
      });

      it("should render multiple hearing rows", () => {
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: mockHearings,
          dataSource: mockDataSource
        });

        // Check first hearing
        expect(html).toContain(mockHearings[0].hearingTime);
        expect(html).toContain(mockHearings[0].appellant);
        expect(html).toContain(mockHearings[0].appealReferenceNumber);

        // Check second hearing
        expect(html).toContain(mockHearings[1].hearingTime);
        expect(html).toContain(mockHearings[1].appellant);
        expect(html).toContain(mockHearings[1].appealReferenceNumber);
      });

      it("should render empty representative field", () => {
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [mockHearings[1]], // Has empty representative
          dataSource: mockDataSource
        });

        expect(html).toContain(mockHearings[1].appellant);
        const tableBodyMatch = html.match(/<tbody[^>]*>(.*?)<\/tbody>/s);
        expect(tableBodyMatch).toBeTruthy();
      });

      it("should render empty additional information", () => {
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [mockHearings[1]], // Has empty additionalInformation
          dataSource: mockDataSource
        });

        expect(html).toContain(mockHearings[1].appellant);
        const tableBodyMatch = html.match(/<tbody[^>]*>(.*?)<\/tbody>/s);
        expect(tableBodyMatch).toBeTruthy();
      });

      it("should render multiple judges", () => {
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [mockHearings[1]], // Has multiple judges
          dataSource: mockDataSource
        });

        expect(html).toContain("Judge B. Williams");
        expect(html).toContain("Judge C. Brown");
      });

      it("should render empty table when no hearings", () => {
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        expect(html).toContain(en.tableHeaders.appellant);
      });

      it("should render different hearing types", () => {
        const hearingsWithTypes = [
          { ...mockHearings[0], hearingType: "Remote - Video" },
          { ...mockHearings[1], hearingType: "In person" },
          {
            hearingTime: "4:00pm",
            appellant: "Test Person",
            representative: "Test Rep",
            appealReferenceNumber: "IA/11111/2026",
            judges: "Judge D. Smith",
            hearingType: "Remote - Telephone",
            location: "Field House",
            additionalInformation: ""
          }
        ];

        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: hearingsWithTypes,
          dataSource: mockDataSource
        });

        expect(html).toContain("Remote - Video");
        expect(html).toContain("In person");
        expect(html).toContain("Remote - Telephone");
      });

      it("should render different locations", () => {
        const hearingsWithLocations = [
          { ...mockHearings[0], location: "Field House" },
          { ...mockHearings[1], location: "Taylor House" }
        ];

        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: hearingsWithLocations,
          dataSource: mockDataSource
        });

        expect(html).toContain("Field House");
        expect(html).toContain("Taylor House");
      });
    });

    describe("Footer section", () => {
      it("should render data source", () => {
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
          listTitle: "Uwch Dribiwnlys (Siambr Mewnfudo a Lloches) - Rhestr o Wrandawiadau Dyddiol - Apeliadau Statudol",
          listForDate: "15 Ionawr 2026",
          lastUpdatedDate: "14 Ionawr 2026",
          lastUpdatedTime: "12:00pm"
        };

        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: cy,
          header: mockHeaderCy,
          hearings: [],
          dataSource: "Lanlwytho â Llaw"
        });

        expect(html).toContain(mockHeaderCy.listTitle);
        expect(html).toContain(cy.lastUpdated);
        expect(html).toContain(cy.at);
        expect(html).toContain(cy.searchCasesTitle);
        expect(html).toContain(cy.dataSource);
        expect(html).toContain(cy.backToTop);
      });

      it("should render Welsh important information", () => {
        const mockHeaderCy = {
          listTitle: "Uwch Dribiwnlys (Siambr Mewnfudo a Lloches) - Rhestr o Wrandawiadau Dyddiol - Apeliadau Statudol",
          listForDate: "15 Ionawr 2026",
          lastUpdatedDate: "14 Ionawr 2026",
          lastUpdatedTime: "12:00pm"
        };

        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: cy,
          header: mockHeaderCy,
          hearings: [],
          dataSource: "Lanlwytho â Llaw"
        });

        expect(html).toContain(cy.importantInformationTitle);
        // Important information text and email text may contain translation placeholders
        expect(html).toContain('class="govuk-details__text"');
      });
    });

    describe("Accessibility", () => {
      it("should have GOV.UK grid structure", () => {
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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
        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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

    describe("Data variations", () => {
      it("should handle different data source values", () => {
        const sources = [
          { input: "Manual Upload", expected: "Manual Upload" },
          { input: "P&I - Publication and Information", expected: "P&amp;I - Publication and Information" },
          { input: "SOAP API", expected: "SOAP API" }
        ];

        for (const { input, expected } of sources) {
          const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
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

      it("should handle long appellant names", () => {
        const hearings = [
          {
            hearingTime: "10:00am",
            appellant: "Mr John Alexander Smith-Jones-Williams",
            representative: "ABC Solicitors LLP",
            appealReferenceNumber: "IA/12345/2026",
            judges: "Judge A. Johnson",
            hearingType: "Remote - Video",
            location: "Field House",
            additionalInformation: ""
          }
        ];

        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings,
          dataSource: mockDataSource
        });

        expect(html).toContain("Mr John Alexander Smith-Jones-Williams");
      });

      it("should handle long additional information", () => {
        const hearings = [
          {
            hearingTime: "10:00am",
            appellant: "John Smith",
            representative: "ABC Solicitors",
            appealReferenceNumber: "IA/12345/2026",
            judges: "Judge A. Johnson",
            hearingType: "Remote - Video",
            location: "Field House",
            additionalInformation: "Interpreter required for Spanish, requires wheelchair access, documents to be provided in large print format"
          }
        ];

        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings,
          dataSource: mockDataSource
        });

        expect(html).toContain("Interpreter required for Spanish");
        expect(html).toContain("wheelchair access");
      });

      it("should handle special characters in names", () => {
        const hearings = [
          {
            hearingTime: "10:00am",
            appellant: "O'Brien & Associates",
            representative: "Müller & Schmidt",
            appealReferenceNumber: "IA/12345/2026",
            judges: "Judge Nuñez",
            hearingType: "In person",
            location: "Field House",
            additionalInformation: ""
          }
        ];

        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings,
          dataSource: mockDataSource
        });

        // Nunjucks autoescape converts & to &amp; but preserves apostrophes and special characters
        expect(html).toContain("O&#39;Brien &amp; Associates");
        expect(html).toContain("Müller &amp; Schmidt");
        expect(html).toContain("Judge Nuñez");
      });

      it("should handle different time formats", () => {
        const hearings = [
          {
            hearingTime: "9:30am",
            appellant: "John Smith",
            representative: "ABC Solicitors",
            appealReferenceNumber: "IA/12345/2026",
            judges: "Judge A. Johnson",
            hearingType: "Remote - Video",
            location: "Field House",
            additionalInformation: ""
          },
          {
            hearingTime: "1:45pm",
            appellant: "Jane Doe",
            representative: "XYZ Solicitors",
            appealReferenceNumber: "IA/67890/2026",
            judges: "Judge B. Williams",
            hearingType: "In person",
            location: "Taylor House",
            additionalInformation: ""
          }
        ];

        const html = env.render("utiac-statutory-appeal-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings,
          dataSource: mockDataSource
        });

        expect(html).toContain("9:30am");
        expect(html).toContain("1:45pm");
      });
    });
  });
});
