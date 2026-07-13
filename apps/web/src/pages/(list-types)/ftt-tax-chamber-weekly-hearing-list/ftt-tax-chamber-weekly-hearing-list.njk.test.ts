import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fttTaxChamberWeeklyHearingListCy as cy, fttTaxChamberWeeklyHearingListEn as en } from "@hmcts/ftt-tax-chamber-weekly-hearing-list";
import nunjucks from "nunjucks";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

describe("ftt-tax-chamber-weekly-hearing-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "ftt-tax-chamber-weekly-hearing-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Locale content", () => {
    describe("English locale", () => {
      it("should have all required properties", () => {
        expect(en.pageTitle).toBe("First-tier Tribunal (Tax Chamber) Weekly Hearing List");
        expect(en.listForWeekCommencing).toBe("List for week commencing");
        expect(en.lastUpdated).toBe("Last updated");
        expect(en.at).toBe("at");
        expect(en.factLinkText).toBeDefined();
        expect(en.factLinkUrl).toBeDefined();
        expect(en.factAdditionalText).toBeDefined();
        expect(en.importantInformationTitle).toBe("Important information");
        expect(en.searchCasesTitle).toBe("Search Cases");
        expect(en.searchCasesLabel).toBeDefined();
        expect(en.dataSource).toBe("Data source");
        expect(en.backToTop).toBe("Back to top");
      });

      it("should have important information paragraphs array", () => {
        expect(Array.isArray(en.importantInformationParagraphs)).toBe(true);
        expect(en.importantInformationParagraphs.length).toBeGreaterThan(0);
      });

      it("should have table headers", () => {
        expect(en.tableHeaders.date).toBe("Date");
        expect(en.tableHeaders.hearingTime).toBe("Hearing time");
        expect(en.tableHeaders.caseName).toBe("Case name");
        expect(en.tableHeaders.caseReferenceNumber).toBe("Case reference number");
        expect(en.tableHeaders.judges).toBe("Judge(s)");
        expect(en.tableHeaders.members).toBe("Member(s)");
        expect(en.tableHeaders.venuePlatform).toBe("Venue/Platform");
      });
    });

    describe("Welsh locale", () => {
      it("should have all required properties", () => {
        expect(cy.pageTitle).toBe("First-tier Tribunal (Tax Chamber) Weekly Hearing List");
        expect(cy.listForWeekCommencing).toBe("List for week commencing");
        expect(cy.lastUpdated).toBe("Last updated");
        expect(cy.at).toBe("at");
        expect(cy.factLinkText).toBeDefined();
        expect(cy.factLinkUrl).toBeDefined();
        expect(cy.factAdditionalText).toBeDefined();
        expect(cy.importantInformationTitle).toBe("Important information");
        expect(cy.searchCasesTitle).toBe("Search Cases");
        expect(cy.searchCasesLabel).toBeDefined();
        expect(cy.dataSource).toBe("Data source");
        expect(cy.backToTop).toBe("Back to top");
      });

      it("should have important information paragraphs array", () => {
        expect(Array.isArray(cy.importantInformationParagraphs)).toBe(true);
        expect(cy.importantInformationParagraphs.length).toBeGreaterThan(0);
      });

      it("should have table headers", () => {
        expect(cy.tableHeaders.date).toBe("Date");
        expect(cy.tableHeaders.hearingTime).toBe("Hearing time");
        expect(cy.tableHeaders.caseName).toBe("Case name");
        expect(cy.tableHeaders.caseReferenceNumber).toBe("Case reference number");
        expect(cy.tableHeaders.judges).toBe("Judge(s)");
        expect(cy.tableHeaders.members).toBe("Member(s)");
        expect(cy.tableHeaders.venuePlatform).toBe("Venue/Platform");
      });
    });

    describe("Locale consistency", () => {
      it("should have same structure in English and Welsh", () => {
        expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
      });

      it("should have same number of table headers", () => {
        expect(Object.keys(en.tableHeaders).length).toBe(Object.keys(cy.tableHeaders).length);
      });

      it("should have same number of important information paragraphs", () => {
        expect(en.importantInformationParagraphs.length).toBe(cy.importantInformationParagraphs.length);
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
      listTitle: "First-tier Tribunal (Tax Chamber) Weekly Hearing List",
      weekCommencingDate: "Monday 1 January 2024",
      lastUpdatedDate: "1 January 2024",
      lastUpdatedTime: "10:30am"
    });

    const createMockHearing = (overrides = {}) => ({
      date: "01/01/2024",
      hearingTime: "10:00am",
      caseReferenceNumber: "TC/2024/001",
      caseName: "Appellant v HMRC",
      venuePlatform: "Video hearing",
      judges: "Judge Johnson",
      members: "Member A, Member B",
      ...overrides
    });

    describe("with English locale", () => {
      it("should render template with all data", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing(), createMockHearing({ caseReferenceNumber: "TC/2024/002" })];
        const dataSource = "TAX";

        // Act
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource });

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
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

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
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

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
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

        // Assert
        expect(html).toContain("govuk-details");
        expect(html).toContain(en.importantInformationTitle);
        expect(html).toContain(en.importantInformationLinkText);
        // Check each paragraph exists (accounting for HTML entity encoding)
        expect(html).toContain("Open justice is a fundamental principle");
        expect(html).toContain("Members of the public and the media");
        expect(html).toContain("The subject line for the email should contain");
        expect(html).toContain("The judge may refuse a request");
      });

      it("should render search input", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

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
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

        // Assert
        expect(html).toContain('<table class="govuk-table"');
        expect(html).toContain(en.tableHeaders.date);
        expect(html).toContain(en.tableHeaders.hearingTime);
        expect(html).toContain(en.tableHeaders.caseName);
        expect(html).toContain(en.tableHeaders.caseReferenceNumber);
        expect(html).toContain(en.tableHeaders.judges);
        expect(html).toContain(en.tableHeaders.members);
        expect(html).toContain(en.tableHeaders.venuePlatform);
      });

      it("should render back to top link", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

        // Assert
        expect(html).toContain(en.backToTop);
        expect(html).toContain('href="#top"');
      });

      it("should render data source", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];
        const dataSource = "TAX";

        // Act
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource });

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
          listTitle: "First-tier Tribunal (Tax Chamber) Weekly Hearing List",
          weekCommencingDate: "Dydd Llun 1 Ionawr 2024",
          lastUpdatedDate: "1 Ionawr 2024",
          lastUpdatedTime: "10:30yb"
        };
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: cy, en, cy, header, hearings, dataSource: "TAX" });

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
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: cy, en, cy, header, hearings, dataSource: "TAX" });

        // Assert
        expect(html).toContain(cy.tableHeaders.date);
        expect(html).toContain(cy.tableHeaders.hearingTime);
        expect(html).toContain(cy.tableHeaders.caseName);
        expect(html).toContain(cy.tableHeaders.caseReferenceNumber);
        expect(html).toContain(cy.tableHeaders.judges);
        expect(html).toContain(cy.tableHeaders.members);
        expect(html).toContain(cy.tableHeaders.venuePlatform);
      });
    });

    describe("hearing data variations", () => {
      it("should render with empty hearings array", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings: unknown[] = [];

        // Act
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

        // Assert
        expect(html).toContain('<tbody class="govuk-table__body">');
        expect(html).not.toContain("TC/2024/001");
      });

      it("should render with single hearing", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

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
          createMockHearing({ caseReferenceNumber: "TC/2024/001" }),
          createMockHearing({ caseReferenceNumber: "TC/2024/002" }),
          createMockHearing({ caseReferenceNumber: "TC/2024/003" })
        ];

        // Act
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

        // Assert
        expect(html).toContain("TC/2024/001");
        expect(html).toContain("TC/2024/002");
        expect(html).toContain("TC/2024/003");
      });

      it("should render all hearing fields correctly", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearing = createMockHearing({
          date: "15/03/2024",
          hearingTime: "2:30pm",
          caseReferenceNumber: "TC/2024/999",
          caseName: "Jones v HMRC",
          venuePlatform: "Court Room 5",
          judges: "Judge Smith, Judge Williams",
          members: "Member X, Member Y, Member Z"
        });
        const hearings = [hearing];

        // Act
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

        // Assert
        expect(html).toContain("15/03/2024");
        expect(html).toContain("2:30pm");
        expect(html).toContain("TC/2024/999");
        expect(html).toContain("Jones v HMRC");
        expect(html).toContain("Court Room 5");
        expect(html).toContain("Judge Smith, Judge Williams");
        expect(html).toContain("Member X, Member Y, Member Z");
      });

      it("should render with empty string fields", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearing = createMockHearing({
          judges: "",
          members: ""
        });
        const hearings = [hearing];

        // Act
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

        // Assert
        expect(html).toContain('<tbody class="govuk-table__body">');
        expect(html).toContain(hearing.caseReferenceNumber);
      });
    });

    describe("accessibility attributes", () => {
      it("should have proper ARIA labels", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

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
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

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
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

        // Assert
        expect(html).toContain('<thead class="govuk-table__head">');
        expect(html).toContain('scope="col"');
        expect(html).toContain("<th");
      });
    });

    describe("GOV.UK Design System compliance", () => {
      it("should use govuk-grid-row and govuk-grid-column classes", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

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
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

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
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

        // Assert
        expect(html).toContain("govuk-body");
      });

      it("should use govuk-link class", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

        // Assert
        expect(html).toContain("govuk-link");
      });

      it("should use govuk-details component classes", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

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
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

        // Assert
        expect(html).toContain("govuk-input");
      });

      it("should use govuk-table classes", () => {
        // Arrange
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("ftt-tax-chamber-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "TAX" });

        // Assert
        expect(html).toContain("govuk-table");
        expect(html).toContain("govuk-table__head");
        expect(html).toContain("govuk-table__body");
        expect(html).toContain("govuk-table__row");
        expect(html).toContain("govuk-table__header");
        expect(html).toContain("govuk-table__cell");
      });
    });
  });
});
