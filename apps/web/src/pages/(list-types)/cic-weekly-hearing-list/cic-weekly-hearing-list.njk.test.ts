import path from "node:path";
import { fileURLToPath } from "node:url";
import { cicWeeklyHearingListCy as cy, cicWeeklyHearingListEn as en } from "@hmcts/cic-weekly-hearing-list";
import { moduleRoot as webCoreModuleRoot } from "@hmcts/web-core/config";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.join(webCoreModuleRoot, "views");
const govukFrontend = path.join(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

describe("cic-weekly-hearing-list.njk", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = nunjucks.configure([__dirname, webCoreViews, govukFrontend], {
      autoescape: true,
      noCache: true
    });
  });

  describe("Locale content", () => {
    describe("English locale", () => {
      it("should have all required properties", () => {
        expect(en.pageTitle).toBe("Criminal Injuries Compensation Weekly Hearing List");
        expect(en.listForWeekCommencing).toBe("List for week commencing");
        expect(en.lastUpdated).toBe("Last updated");
        expect(en.at).toBe("at");
        expect(en.factLinkText).toBeDefined();
        expect(en.factLinkUrl).toBeDefined();
        expect(en.factAdditionalText).toBeDefined();
        expect(en.importantInformationTitle).toBe("Important information");
        expect(en.restrictedReportingOrdersTitle).toBe("Restricted Reporting Orders");
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
        expect(en.tableHeaders.caseReferenceNumber).toBe("Case reference number");
        expect(en.tableHeaders.caseName).toBe("Case name");
        expect(en.tableHeaders.venuePlatform).toBe("Venue/Platform");
        expect(en.tableHeaders.judges).toBe("Judge(s)");
        expect(en.tableHeaders.members).toBe("Member(s)");
        expect(en.tableHeaders.additionalInformation).toBe("Additional information");
      });
    });

    describe("Welsh locale", () => {
      it("should have all required properties", () => {
        expect(cy.pageTitle).toBe("Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Digolledu am Anafiadau Troseddol");
        expect(cy.listForWeekCommencing).toBe("Rhestr ar gyfer yr wythnos yn dechrau ar");
        expect(cy.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(cy.at).toBe("am");
        expect(cy.factLinkText).toBeDefined();
        expect(cy.factLinkUrl).toBeDefined();
        expect(cy.factAdditionalText).toBeDefined();
        expect(cy.importantInformationTitle).toBe("Gwybodaeth bwysig");
        expect(cy.restrictedReportingOrdersTitle).toBe("Gorchymyn Adrodd Cyfyngedig");
        expect(cy.searchCasesTitle).toBe("Chwilio achosion");
        expect(cy.searchCasesLabel).toBeDefined();
        expect(cy.dataSource).toBe("Ffynhonnell Data");
        expect(cy.backToTop).toBe("Yn ôl i frig y dudalen");
      });

      it("should have important information paragraphs array", () => {
        expect(Array.isArray(cy.importantInformationParagraphs)).toBe(true);
        expect(cy.importantInformationParagraphs.length).toBeGreaterThan(0);
      });

      it("should have table headers", () => {
        expect(cy.tableHeaders.date).toBe("Dyddiad");
        expect(cy.tableHeaders.hearingTime).toBe("Amser y gwrandawiad");
        expect(cy.tableHeaders.caseReferenceNumber).toBe("Cyfeirnod yr achos");
        expect(cy.tableHeaders.caseName).toBe("Enw'r achos");
        expect(cy.tableHeaders.venuePlatform).toBe("Lleoliad/Platfform");
        expect(cy.tableHeaders.judges).toBe("Barnwyr");
        expect(cy.tableHeaders.members).toBe("Aelod(au)");
        expect(cy.tableHeaders.additionalInformation).toBe("Gwybodaeth ychwanegol");
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
    const createMockHeader = () => ({
      listTitle: "Criminal Injuries Compensation Weekly Hearing List",
      weekCommencingDate: "Monday 1 January 2024",
      lastUpdatedDate: "1 January 2024",
      lastUpdatedTime: "10:30am"
    });

    const createMockHearing = (overrides = {}) => ({
      date: "01/01/2024",
      hearingTime: "10:00am",
      caseReferenceNumber: "CIC/2024/001",
      caseName: "Smith v CICA",
      venuePlatform: "Video hearing",
      judges: "Judge Johnson",
      members: "Member A, Member B",
      additionalInformation: "Interpreter required",
      ...overrides
    });

    describe("with English locale", () => {
      it("should render template with all data", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing(), createMockHearing({ caseReferenceNumber: "CIC/2024/002" })];
        const dataSource = "CRIME";

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource });

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
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain('<h1 class="govuk-heading-l"');
        expect(html).toContain(en.listForWeekCommencing);
        expect(html).toContain(en.lastUpdated);
        expect(html).toContain(en.at);
      });

      it("should render FACT link section", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain(en.factLinkText);
        expect(html).toContain(en.factLinkUrl);
        expect(html).toContain(en.factAdditionalText);
      });

      it("should render important information details component", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain("govuk-details");
        expect(html).toContain(en.importantInformationTitle);
        expect(html).toContain(en.restrictedReportingOrdersTitle);
        expect(html).toContain(en.importantInformationLinkText);
        for (const paragraph of en.importantInformationParagraphs) {
          expect(html).toContain(paragraph);
        }
      });

      it("should render search input", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain(en.searchCasesTitle);
        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('type="text"');
      });

      it("should render table with all headers", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain('<table class="govuk-table"');
        expect(html).toContain(en.tableHeaders.date);
        expect(html).toContain(en.tableHeaders.hearingTime);
        expect(html).toContain(en.tableHeaders.caseReferenceNumber);
        expect(html).toContain(en.tableHeaders.caseName);
        expect(html).toContain(en.tableHeaders.venuePlatform);
        expect(html).toContain(en.tableHeaders.judges);
        expect(html).toContain(en.tableHeaders.members);
        expect(html).toContain(en.tableHeaders.additionalInformation);
      });

      it("should render back to top link", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain(en.backToTop);
        expect(html).toContain('href="#top"');
      });

      it("should render data source", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];
        const dataSource = "CRIME";

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource });

        // Assert
        expect(html).toContain(en.dataSource);
        expect(html).toContain(dataSource);
      });
    });

    describe("with Welsh locale", () => {
      it("should render template with Welsh translations", () => {
        // Arrange
        const header = {
          listTitle: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Digolledu am Anafiadau Troseddol",
          weekCommencingDate: "Dydd Llun 1 Ionawr 2024",
          lastUpdatedDate: "1 Ionawr 2024",
          lastUpdatedTime: "10:30yb"
        };
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: cy, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain(cy.listForWeekCommencing);
        expect(html).toContain(cy.lastUpdated);
        expect(html).toContain(cy.importantInformationTitle);
        expect(html).toContain(cy.searchCasesTitle);
        expect(html).toContain(cy.backToTop);
      });

      it("should render Welsh table headers", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: cy, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain(cy.tableHeaders.date);
        expect(html).toContain(cy.tableHeaders.hearingTime);
        expect(html).toContain(cy.tableHeaders.caseReferenceNumber);
        expect(html).toContain("Enw&#39;r achos");
        expect(html).toContain(cy.tableHeaders.venuePlatform);
        expect(html).toContain(cy.tableHeaders.judges);
        expect(html).toContain(cy.tableHeaders.members);
        expect(html).toContain(cy.tableHeaders.additionalInformation);
      });
    });

    describe("hearing data variations", () => {
      it("should render with empty hearings array", () => {
        // Arrange
        const header = createMockHeader();
        const hearings: unknown[] = [];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain('<tbody class="govuk-table__body">');
        expect(html).not.toContain("CIC/2024/001");
      });

      it("should render with single hearing", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain(hearings[0].caseReferenceNumber);
        expect(html).toContain(hearings[0].caseName);
        expect(html).toContain(hearings[0].date);
      });

      it("should render with multiple hearings", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [
          createMockHearing({ caseReferenceNumber: "CIC/2024/001" }),
          createMockHearing({ caseReferenceNumber: "CIC/2024/002" }),
          createMockHearing({ caseReferenceNumber: "CIC/2024/003" })
        ];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain("CIC/2024/001");
        expect(html).toContain("CIC/2024/002");
        expect(html).toContain("CIC/2024/003");
      });

      it("should render all hearing fields correctly", () => {
        // Arrange
        const header = createMockHeader();
        const hearing = createMockHearing({
          date: "15/03/2024",
          hearingTime: "2:30pm",
          caseReferenceNumber: "CIC/2024/999",
          caseName: "Jones v CICA",
          venuePlatform: "Court Room 5",
          judges: "Judge Smith, Judge Williams",
          members: "Member X, Member Y, Member Z",
          additionalInformation: "Special arrangements required"
        });
        const hearings = [hearing];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain("15/03/2024");
        expect(html).toContain("2:30pm");
        expect(html).toContain("CIC/2024/999");
        expect(html).toContain("Jones v CICA");
        expect(html).toContain("Court Room 5");
        expect(html).toContain("Judge Smith, Judge Williams");
        expect(html).toContain("Member X, Member Y, Member Z");
        expect(html).toContain("Special arrangements required");
      });

      it("should render with empty string fields", () => {
        // Arrange
        const header = createMockHeader();
        const hearing = createMockHearing({
          judges: "",
          members: "",
          additionalInformation: ""
        });
        const hearings = [hearing];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain('<tbody class="govuk-table__body">');
        expect(html).toContain(hearing.caseReferenceNumber);
      });
    });

    describe("accessibility attributes", () => {
      it("should have proper ARIA labels", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain('role="table"');
        expect(html).toContain("aria-label");
      });

      it("should have visually hidden label for search input", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain("govuk-visually-hidden");
        expect(html).toContain(en.searchCasesLabel);
      });

      it("should have proper table structure with scope attributes", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain('<thead class="govuk-table__head">');
        expect(html).toContain('scope="col"');
        expect(html).toContain("<th");
      });
    });

    describe("GOV.UK Design System compliance", () => {
      it("should use govuk-grid-row and govuk-grid-column classes", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain("govuk-grid-row");
        expect(html).toContain("govuk-grid-column-full");
      });

      it("should use govuk-heading classes", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain("govuk-heading-l");
        expect(html).toContain("govuk-heading-s");
      });

      it("should use govuk-body classes", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain("govuk-body");
      });

      it("should use govuk-link class", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain("govuk-link");
      });

      it("should use govuk-details component classes", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain("govuk-details");
        expect(html).toContain("govuk-details__summary");
        expect(html).toContain("govuk-details__text");
      });

      it("should use govuk-input class", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

        // Assert
        expect(html).toContain("govuk-input");
      });

      it("should use govuk-table classes", () => {
        // Arrange
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        // Act
        const html = env.render("cic-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "CRIME" });

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
