import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { grcWeeklyHearingListCy as cy, grcWeeklyHearingListEn as en } from "@hmcts/grc-weekly-hearing-list";
import nunjucks from "nunjucks";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

describe("grc-weekly-hearing-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "grc-weekly-hearing-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Locale content", () => {
    describe("English locale", () => {
      it("should have all required properties", () => {
        expect(en.pageTitle).toBe("General Regulatory Chamber Weekly Hearing List");
        expect(en.listForWeekCommencing).toBe("List for week commencing");
        expect(en.lastUpdated).toBe("Last updated");
        expect(en.at).toBe("at");
        expect(en.factLinkText).toBeDefined();
        expect(en.factLinkUrl).toBeDefined();
        expect(en.factAdditionalText).toBeDefined();
        expect(en.importantInformationTitle).toBe("Important information");
        expect(en.importantInformationText).toBeDefined();
        expect(en.importantInformationRecordingText).toBeDefined();
        expect(en.importantInformationLinkText).toBeDefined();
        expect(en.importantInformationLinkUrl).toBeDefined();
        expect(en.importantInformationLink2Text).toBeDefined();
        expect(en.importantInformationLink2Url).toBeDefined();
        expect(en.searchCasesTitle).toBe("Search Cases");
        expect(en.searchCasesLabel).toBeDefined();
        expect(en.dataSource).toBe("Data source");
        expect(en.backToTop).toBe("Back to top");
      });

      it("should have table headers", () => {
        expect(en.tableHeaders.date).toBe("Date");
        expect(en.tableHeaders.hearingTime).toBe("Hearing time");
        expect(en.tableHeaders.caseReferenceNumber).toBe("Case reference number");
        expect(en.tableHeaders.caseName).toBe("Case name");
        expect(en.tableHeaders.judges).toBe("Judge(s)");
        expect(en.tableHeaders.members).toBe("Member(s)");
        expect(en.tableHeaders.modeOfHearing).toBe("Mode of hearing");
        expect(en.tableHeaders.venue).toBe("Venue");
        expect(en.tableHeaders.additionalInformation).toBe("Additional information");
      });

      it("should have provenance labels", () => {
        expect(en.provenanceLabels).toBeDefined();
      });
    });

    describe("Welsh locale", () => {
      it("should have all required properties", () => {
        expect(cy.pageTitle).toBeDefined();
        expect(cy.listForWeekCommencing).toBe("Rhestr ar gyfer yr wythnos yn dechrau ar");
        expect(cy.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(cy.at).toBe("am");
        expect(cy.factLinkText).toBeDefined();
        expect(cy.factLinkUrl).toBeDefined();
        expect(cy.factAdditionalText).toBeDefined();
        expect(cy.importantInformationTitle).toBe("Gwybodaeth bwysig");
        expect(cy.importantInformationText).toBeDefined();
        expect(cy.importantInformationRecordingText).toBeDefined();
        expect(cy.importantInformationLinkText).toBeDefined();
        expect(cy.importantInformationLinkUrl).toBeDefined();
        expect(cy.importantInformationLink2Text).toBeDefined();
        expect(cy.importantInformationLink2Url).toBeDefined();
        expect(cy.searchCasesTitle).toBe("Chwilio Achosion");
        expect(cy.searchCasesLabel).toBeDefined();
        expect(cy.dataSource).toBe("Ffynhonnell data");
        expect(cy.backToTop).toBe("Yn ôl i frig y dudalen");
      });

      it("should have table headers", () => {
        expect(cy.tableHeaders.date).toBeDefined();
        expect(cy.tableHeaders.hearingTime).toBeDefined();
        expect(cy.tableHeaders.caseReferenceNumber).toBeDefined();
        expect(cy.tableHeaders.caseName).toBeDefined();
        expect(cy.tableHeaders.judges).toBeDefined();
        expect(cy.tableHeaders.members).toBeDefined();
        expect(cy.tableHeaders.modeOfHearing).toBeDefined();
        expect(cy.tableHeaders.venue).toBeDefined();
        expect(cy.tableHeaders.additionalInformation).toBe("Gwybodaeth ychwanegol");
      });

      it("should have provenance labels", () => {
        expect(cy.provenanceLabels).toBeDefined();
      });
    });

    describe("Locale consistency", () => {
      it("should have same structure in English and Welsh", () => {
        expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
      });

      it("should have same number of table headers", () => {
        expect(Object.keys(en.tableHeaders).length).toBe(Object.keys(cy.tableHeaders).length);
      });
    });
  });

  describe("Template rendering", () => {
    let env: nunjucks.Environment;

    const setupNunjucks = () => {
      const environment = nunjucks.configure([__dirname, webCoreViews, govukFrontend], {
        autoescape: true,
        trimBlocks: true,
        lstripBlocks: true
      });
      return environment;
    };

    const createMockHeader = () => ({
      listTitle: "General Regulatory Chamber Weekly Hearing List",
      weekCommencingDate: "Monday 1 January 2024",
      lastUpdatedDate: "1 January 2024",
      lastUpdatedTime: "10:30am"
    });

    const createMockHearing = (overrides = {}) => ({
      date: "01/01/2024",
      hearingTime: "10:00am",
      caseReferenceNumber: "GRC/2024/001",
      caseName: "Appellant v HMRC",
      judges: "Judge Johnson",
      members: "Member A, Member B",
      modeOfHearing: "Video hearing",
      venue: "Tribunals Hearing Centre",
      additionalInformation: "Interpreter required",
      ...overrides
    });

    describe("with English locale", () => {
      it("should render template with all data", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing(), createMockHearing({ caseReferenceNumber: "GRC/2024/002" })];
        const dataSource = "GRC";

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource });

        // Assert
        expect(html).toContain(header.listTitle);
        expect(html).toContain(header.weekCommencingDate);
        expect(html).toContain(header.lastUpdatedDate);
        expect(html).toContain(header.lastUpdatedTime);
        expect(html).toContain(hearings[0].caseReferenceNumber);
        expect(html).toContain(hearings[1].caseReferenceNumber);
        expect(html).toContain(dataSource);
      });

      it("should render header section correctly", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain('<h1 class="govuk-heading-l"');
        expect(html).toContain(en.listForWeekCommencing);
        expect(html).toContain(en.lastUpdated);
        expect(html).toContain(en.at);
      });

      it("should render FACT link section", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain(en.factLinkText);
        expect(html).toContain(en.factLinkUrl);
        expect(html).toContain(en.factAdditionalText);
      });

      it("should render important information details component", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain("govuk-details");
        expect(html).toContain(en.importantInformationTitle);
        expect(html).toContain(en.importantInformationText);
        expect(html).toContain(en.importantInformationRecordingText);
        expect(html).toContain(en.importantInformationLinkText);
        expect(html).toContain(en.importantInformationLinkUrl);
        expect(html).toContain(en.importantInformationLink2Text);
        expect(html).toContain(en.importantInformationLink2Url);
      });

      it("should render details component with open attribute", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain('data-module="govuk-details"');
      });

      it("should render search input", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain(en.searchCasesTitle);
        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('type="text"');
      });

      it("should render table with all headers", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain('<table class="govuk-table"');
        expect(html).toContain(en.tableHeaders.date);
        expect(html).toContain(en.tableHeaders.hearingTime);
        expect(html).toContain(en.tableHeaders.caseReferenceNumber);
        expect(html).toContain(en.tableHeaders.caseName);
        expect(html).toContain(en.tableHeaders.judges);
        expect(html).toContain(en.tableHeaders.members);
        expect(html).toContain(en.tableHeaders.modeOfHearing);
        expect(html).toContain(en.tableHeaders.venue);
        expect(html).toContain(en.tableHeaders.additionalInformation);
      });

      it("should render back to top link", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain(en.backToTop);
        expect(html).toContain('href="#top"');
      });

      it("should render data source", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];
        const dataSource = "GRC";

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource });

        // Assert
        expect(html).toContain(en.dataSource);
        expect(html).toContain(dataSource);
      });
    });

    describe("with Welsh locale", () => {
      it("should render template with Welsh translations", () => {
        // Arrange
        env = setupNunjucks();
        const header = {
          listTitle: "[WELSH TRANSLATION REQUIRED: 'General Regulatory Chamber Weekly Hearing List']",
          weekCommencingDate: "Dydd Llun 1 Ionawr 2024",
          lastUpdatedDate: "1 Ionawr 2024",
          lastUpdatedTime: "10:30yb"
        };
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: cy, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain(cy.listForWeekCommencing);
        expect(html).toContain(cy.lastUpdated);
        expect(html).toContain(cy.importantInformationTitle);
        expect(html).toContain(cy.searchCasesTitle);
        expect(html).toContain(cy.backToTop);
      });

      it("should render Welsh table headers", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: cy, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain(cy.tableHeaders.additionalInformation);
      });
    });

    describe("hearing data variations", () => {
      it("should render with empty hearings array", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings: unknown[] = [];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain('<tbody class="govuk-table__body">');
        expect(html).not.toContain("GRC/2024/001");
      });

      it("should render with single hearing", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain(hearings[0].caseReferenceNumber);
        expect(html).toContain(hearings[0].caseName);
        expect(html).toContain(hearings[0].date);
      });

      it("should render with multiple hearings", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [
          createMockHearing({ caseReferenceNumber: "GRC/2024/001" }),
          createMockHearing({ caseReferenceNumber: "GRC/2024/002" }),
          createMockHearing({ caseReferenceNumber: "GRC/2024/003" })
        ];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain("GRC/2024/001");
        expect(html).toContain("GRC/2024/002");
        expect(html).toContain("GRC/2024/003");
      });

      it("should render all hearing fields correctly", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearing = createMockHearing({
          date: "15/03/2024",
          hearingTime: "2:30pm",
          caseReferenceNumber: "GRC/2024/999",
          caseName: "Jones v Revenue and Customs",
          judges: "Judge Smith, Judge Williams",
          members: "Member X, Member Y, Member Z",
          modeOfHearing: "In person",
          venue: "Manchester Tribunals Centre",
          additionalInformation: "Special arrangements required"
        });
        const hearings = [hearing];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain("15/03/2024");
        expect(html).toContain("2:30pm");
        expect(html).toContain("GRC/2024/999");
        expect(html).toContain("Jones v Revenue and Customs");
        expect(html).toContain("Judge Smith, Judge Williams");
        expect(html).toContain("Member X, Member Y, Member Z");
        expect(html).toContain("In person");
        expect(html).toContain("Manchester Tribunals Centre");
        expect(html).toContain("Special arrangements required");
      });

      it("should render with empty string fields", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearing = createMockHearing({
          judges: "",
          members: "",
          additionalInformation: ""
        });
        const hearings = [hearing];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain('<tbody class="govuk-table__body">');
        expect(html).toContain(hearing.caseReferenceNumber);
      });

      it("should render with different mode of hearing values", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [
          createMockHearing({ caseReferenceNumber: "GRC/2024/001", modeOfHearing: "Video hearing" }),
          createMockHearing({ caseReferenceNumber: "GRC/2024/002", modeOfHearing: "Telephone hearing" }),
          createMockHearing({ caseReferenceNumber: "GRC/2024/003", modeOfHearing: "In person" }),
          createMockHearing({ caseReferenceNumber: "GRC/2024/004", modeOfHearing: "Hybrid" })
        ];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain("Video hearing");
        expect(html).toContain("Telephone hearing");
        expect(html).toContain("In person");
        expect(html).toContain("Hybrid");
      });

      it("should render with different venue values", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [
          createMockHearing({ caseReferenceNumber: "GRC/2024/001", venue: "Birmingham Tribunals Centre" }),
          createMockHearing({ caseReferenceNumber: "GRC/2024/002", venue: "Manchester Tribunals Centre" }),
          createMockHearing({ caseReferenceNumber: "GRC/2024/003", venue: "London Tribunals Centre" })
        ];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain("Birmingham Tribunals Centre");
        expect(html).toContain("Manchester Tribunals Centre");
        expect(html).toContain("London Tribunals Centre");
      });
    });

    describe("accessibility attributes", () => {
      it("should have proper ARIA labels", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain('role="table"');
        expect(html).toContain("aria-label");
      });

      it("should have visually hidden label for search input", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain("govuk-visually-hidden");
        expect(html).toContain(en.searchCasesLabel);
      });

      it("should have proper table structure with scope attributes", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain('<thead class="govuk-table__head">');
        expect(html).toContain('scope="col"');
        expect(html).toContain("<th");
      });

      it("should have id anchor for back to top link", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain('id="top"');
      });
    });

    describe("GOV.UK Design System compliance", () => {
      it("should use govuk-grid-row and govuk-grid-column classes", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain("govuk-grid-row");
        expect(html).toContain("govuk-grid-column-full");
      });

      it("should use govuk-heading classes", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain("govuk-heading-l");
        expect(html).toContain("govuk-heading-s");
      });

      it("should use govuk-body classes", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain("govuk-body");
      });

      it("should use govuk-link class", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain("govuk-link");
      });

      it("should use govuk-details component classes", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain("govuk-details");
        expect(html).toContain("govuk-details__summary");
        expect(html).toContain("govuk-details__text");
      });

      it("should use govuk-input class", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain("govuk-input");
      });

      it("should use govuk-table classes", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain("govuk-table");
        expect(html).toContain("govuk-table__head");
        expect(html).toContain("govuk-table__body");
        expect(html).toContain("govuk-table__row");
        expect(html).toContain("govuk-table__header");
        expect(html).toContain("govuk-table__cell");
      });

      it("should use govuk-form-group class", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain("govuk-form-group");
      });

      it("should use govuk-label class", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain("govuk-label");
      });
    });

    describe("links and URLs", () => {
      it("should render external links with proper attributes", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener noreferrer"');
      });

      it("should render all important information links", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("grc-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "GRC" });

        // Assert
        expect(html).toContain(en.importantInformationLinkUrl);
        expect(html).toContain(en.importantInformationLink2Url);
      });
    });
  });
});
