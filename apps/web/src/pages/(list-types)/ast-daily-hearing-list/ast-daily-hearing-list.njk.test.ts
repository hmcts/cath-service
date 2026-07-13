import path from "node:path";
import { fileURLToPath } from "node:url";
import { astDailyHearingListCy as cy, astDailyHearingListEn as en } from "@hmcts/ast-daily-hearing-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

describe("AST Daily Hearing List template", () => {
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
        expect(en.pageTitle).toBe("Asylum Support Tribunal Daily Hearing List");
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

      it("should have venue address lines", () => {
        expect(en.venueAddressLines).toHaveLength(3);
        expect(en.venueAddressLines[0]).toBe("2nd Floor, Import Building");
        expect(en.venueAddressLines[1]).toBe("2 Clove Crescent");
        expect(en.venueAddressLines[2]).toBe("London E14 2BE");
      });

      it("should have important information section", () => {
        expect(en.importantInformationTitle).toBe("Important information");
        expect(en.importantInformationParagraphs).toHaveLength(2);
        expect(en.importantInformationParagraphs[0]).toContain("Open justice");
        expect(en.importantInformationParagraphs[1]).toContain("Asylum Support Tribunal parties");
        expect(en.importantInformationLinkPrefix).toContain("For more information");
        expect(en.importantInformationLinkText).toContain("gov.uk/guidance/observe-a-court-or-tribunal-hearing");
        expect(en.importantInformationLinkUrl).toContain("gov.uk/guidance/observe-a-court-or-tribunal-hearing");
      });

      it("should have search cases section", () => {
        expect(en.searchCasesTitle).toBe("Search Cases");
        expect(en.searchCasesLabel).toContain("Search by appellant");
      });

      it("should have table headers", () => {
        expect(en.tableHeaders.appellant).toBe("Appellant");
        expect(en.tableHeaders.appealReferenceNumber).toBe("Appeal reference number");
        expect(en.tableHeaders.caseType).toBe("Case type");
        expect(en.tableHeaders.hearingType).toBe("Hearing type");
        expect(en.tableHeaders.hearingTime).toBe("Hearing time");
        expect(en.tableHeaders.additionalInformation).toBe("Additional information");
      });

      it("should have footer text", () => {
        expect(en.dataSource).toBe("Data source");
        expect(en.backToTop).toBe("Back to top");
      });

      it("should have provenance labels", () => {
        expect(en.provenanceLabels).toBeDefined();
        expect(typeof en.provenanceLabels).toBe("object");
      });
    });

    describe("Welsh locale", () => {
      it("should have page title", () => {
        expect(cy.pageTitle).toBe("Rhestr o Wrandawiadau Dyddiol Tribiwnlys Cefnogi Ceiswyr Lloches");
      });

      it("should have date-related text", () => {
        expect(cy.listForDate).toBe("Rhestr ar gyfer");
        expect(cy.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(cy.at).toBe("am");
      });

      it("should have FACT link information", () => {
        expect(cy.factLinkText).toContain("Dod o hyd i fanylion cyswllt");
        expect(cy.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(cy.factAdditionalText).toContain("Alban");
      });

      it("should have venue address lines", () => {
        expect(cy.venueAddressLines).toHaveLength(3);
        expect(cy.venueAddressLines[0]).toBe("Ail Lawr, Adeilad Mewnforio");
        expect(cy.venueAddressLines[1]).toBe("2 Clove Crescent");
        expect(cy.venueAddressLines[2]).toBe("Llundain E14 2BE");
      });

      it("should have important information section", () => {
        expect(cy.importantInformationTitle).toBe("Gwybodaeth bwysig");
        expect(cy.importantInformationParagraphs).toHaveLength(2);
        expect(cy.importantInformationParagraphs[0]).toContain("cyfiawnder agored");
        expect(cy.importantInformationParagraphs[1]).toContain("Tribiwnlys Cymorth i Geiswyr Lloches");
        expect(cy.importantInformationLinkPrefix).toContain("Am fwy o wybodaeth");
        expect(cy.importantInformationLinkText).toContain("gov.uk/guidance/observe-a-court-or-tribunal-hearing");
        expect(cy.importantInformationLinkUrl).toContain("gov.uk/guidance/observe-a-court-or-tribunal-hearing");
      });

      it("should have search cases section", () => {
        expect(cy.searchCasesTitle).toBe("Chwilio achosion");
        expect(cy.searchCasesLabel).toContain("Chwilio yn ôl apelydd");
      });

      it("should have table headers", () => {
        expect(cy.tableHeaders.appellant).toBe("Apelydd");
        expect(cy.tableHeaders.appealReferenceNumber).toBe("Cyfeirnod apêl");
        expect(cy.tableHeaders.caseType).toBe("Math o achos");
        expect(cy.tableHeaders.hearingType).toBe("Math o wrandawiad");
        expect(cy.tableHeaders.hearingTime).toBe("Amser y gwrandawiad");
        expect(cy.tableHeaders.additionalInformation).toBe("Gwybodaeth ychwanegol");
      });

      it("should have footer text", () => {
        expect(cy.dataSource).toBe("Ffynhonnell Data");
        expect(cy.backToTop).toBe("Yn ôl i frig y dudalen");
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

      it("should have same number of venue address lines", () => {
        expect(en.venueAddressLines.length).toBe(cy.venueAddressLines.length);
      });

      it("should have same number of important information paragraphs", () => {
        expect(en.importantInformationParagraphs.length).toBe(cy.importantInformationParagraphs.length);
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
      listTitle: "Asylum Support Tribunal Daily Hearing List",
      listForDate: "15 January 2026",
      lastUpdatedDate: "14 January 2026",
      lastUpdatedTime: "12:00pm"
    };

    const mockDataSource = "Manual Upload";

    describe("Header section", () => {
      it("should render title as h1 with anchor", () => {
        const html = env.render("ast-daily-hearing-list.njk", {
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
        const html = env.render("ast-daily-hearing-list.njk", {
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

      it("should render venue address with line breaks", () => {
        const html = env.render("ast-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain("2nd Floor, Import Building");
        expect(html).toContain("2 Clove Crescent");
        expect(html).toContain("London E14 2BE");
      });

      it("should render list date", () => {
        const html = env.render("ast-daily-hearing-list.njk", {
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
        const html = env.render("ast-daily-hearing-list.njk", {
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
        const html = env.render("ast-daily-hearing-list.njk", {
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
        const html = env.render("ast-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.importantInformationTitle);
      });

      it("should render all paragraphs", () => {
        const html = env.render("ast-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        for (const paragraph of en.importantInformationParagraphs) {
          expect(html).toContain(paragraph);
        }
      });

      it("should render link to guidance", () => {
        const html = env.render("ast-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.importantInformationLinkPrefix);
        expect(html).toContain(`href="${en.importantInformationLinkUrl}"`);
        expect(html).toContain(en.importantInformationLinkText);
      });
    });

    describe("Search section", () => {
      it("should render search input", () => {
        const html = env.render("ast-daily-hearing-list.njk", {
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
        const html = env.render("ast-daily-hearing-list.njk", {
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
        const html = env.render("ast-daily-hearing-list.njk", {
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
        const html = env.render("ast-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain('class="govuk-label govuk-visually-hidden"');
        expect(html).toContain(`for="case-search-input"`);
      });
    });

    describe("Table structure", () => {
      it("should render table with correct role and aria-label", () => {
        const html = env.render("ast-daily-hearing-list.njk", {
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
        const html = env.render("ast-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(en.tableHeaders.appellant);
        expect(html).toContain(en.tableHeaders.appealReferenceNumber);
        expect(html).toContain(en.tableHeaders.caseType);
        expect(html).toContain(en.tableHeaders.hearingType);
        expect(html).toContain(en.tableHeaders.hearingTime);
        expect(html).toContain(en.tableHeaders.additionalInformation);
      });

      it("should use scope=col for header cells", () => {
        const html = env.render("ast-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        const scopeColCount = (html.match(/scope="col"/g) || []).length;
        expect(scopeColCount).toBe(6); // 6 columns
      });
    });

    describe("Hearings data", () => {
      const mockHearings = [
        {
          appellant: "John Smith",
          appealReferenceNumber: "AST/2026/001",
          caseType: "Section 95",
          hearingType: "Remote - Video",
          hearingTime: "10:00am",
          additionalInformation: "Interpreter required"
        },
        {
          appellant: "Jane Doe",
          appealReferenceNumber: "AST/2026/002",
          caseType: "Section 4",
          hearingType: "In person",
          hearingTime: "2:00pm",
          additionalInformation: ""
        }
      ];

      it("should render single hearing row", () => {
        const html = env.render("ast-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [mockHearings[0]],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockHearings[0].appellant);
        expect(html).toContain(mockHearings[0].appealReferenceNumber);
        expect(html).toContain(mockHearings[0].caseType);
        expect(html).toContain(mockHearings[0].hearingType);
        expect(html).toContain(mockHearings[0].hearingTime);
        expect(html).toContain(mockHearings[0].additionalInformation);
      });

      it("should render multiple hearing rows", () => {
        const html = env.render("ast-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: mockHearings,
          dataSource: mockDataSource
        });

        // Check first hearing
        expect(html).toContain(mockHearings[0].appellant);
        expect(html).toContain(mockHearings[0].appealReferenceNumber);

        // Check second hearing
        expect(html).toContain(mockHearings[1].appellant);
        expect(html).toContain(mockHearings[1].appealReferenceNumber);
      });

      it("should render empty additional information", () => {
        const html = env.render("ast-daily-hearing-list.njk", {
          en,
          cy,
          t: en,
          header: mockHeader,
          hearings: [mockHearings[1]], // Has empty additionalInformation
          dataSource: mockDataSource
        });

        expect(html).toContain(mockHearings[1].appellant);
        // Empty string should render but not cause errors
        const tableBodyMatch = html.match(/<tbody[^>]*>(.*?)<\/tbody>/s);
        expect(tableBodyMatch).toBeTruthy();
      });

      it("should render empty table when no hearings", () => {
        const html = env.render("ast-daily-hearing-list.njk", {
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
    });

    describe("Footer section", () => {
      it("should render data source", () => {
        const html = env.render("ast-daily-hearing-list.njk", {
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
        const html = env.render("ast-daily-hearing-list.njk", {
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
        const html = env.render("ast-daily-hearing-list.njk", {
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
          listTitle: "Rhestr o Wrandawiadau Dyddiol Tribiwnlys Cefnogi Ceiswyr Lloches",
          listForDate: "15 Ionawr 2026",
          lastUpdatedDate: "14 Ionawr 2026",
          lastUpdatedTime: "12:00pm"
        };

        const html = env.render("ast-daily-hearing-list.njk", {
          en,
          cy,
          t: cy,
          header: mockHeaderCy,
          hearings: [],
          dataSource: "Lanlwytho â Llaw"
        });

        expect(html).toContain(cy.pageTitle);
        expect(html).toContain(cy.listForDate);
        expect(html).toContain(cy.lastUpdated);
        expect(html).toContain(cy.at);
        expect(html).toContain(cy.searchCasesTitle);
        expect(html).toContain(cy.tableHeaders.appellant);
        expect(html).toContain(cy.dataSource);
        expect(html).toContain(cy.backToTop);
      });

      it("should render Welsh venue address", () => {
        const mockHeaderCy = {
          listTitle: "Rhestr o Wrandawiadau Dyddiol Tribiwnlys Cefnogi Ceiswyr Lloches",
          listForDate: "15 Ionawr 2026",
          lastUpdatedDate: "14 Ionawr 2026",
          lastUpdatedTime: "12:00pm"
        };

        const html = env.render("ast-daily-hearing-list.njk", {
          en,
          cy,
          t: cy,
          header: mockHeaderCy,
          hearings: [],
          dataSource: "Lanlwytho â Llaw"
        });

        expect(html).toContain("Ail Lawr, Adeilad Mewnforio");
        expect(html).toContain("Llundain E14 2BE");
      });
    });

    describe("Accessibility", () => {
      it("should have GOV.UK grid structure", () => {
        const html = env.render("ast-daily-hearing-list.njk", {
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
        const html = env.render("ast-daily-hearing-list.njk", {
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
        const html = env.render("ast-daily-hearing-list.njk", {
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
        const html = env.render("ast-daily-hearing-list.njk", {
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
        const html = env.render("ast-daily-hearing-list.njk", {
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
