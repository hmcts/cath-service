import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fttRptWeeklyHearingListCy as cy, fttRptWeeklyHearingListEn as en } from "@hmcts/ftt-rpt-weekly-hearing-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");

describe("ftt-rpt-weekly-hearing-list template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "ftt-rpt-weekly-hearing-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Locale content", () => {
    describe("English locale", () => {
      it("should have all required properties", () => {
        expect(en.listForWeekCommencing).toBe("List for week commencing");
        expect(en.lastUpdated).toBe("Last updated");
        expect(en.at).toBe("at");
        expect(en.factLinkText).toBeDefined();
        expect(en.factLinkUrl).toBeDefined();
        expect(en.factAdditionalText).toBeDefined();
        expect(en.importantInformationTitle).toBe("Important information");
        expect(en.importantInformationText).toBeDefined();
        expect(en.importantInformationLinkText).toBeDefined();
        expect(en.importantInformationLinkUrl).toBeDefined();
        expect(en.searchCasesTitle).toBe("Search Cases");
        expect(en.searchCasesLabel).toBeDefined();
        expect(en.dataSource).toBe("Data source");
        expect(en.backToTop).toBe("Back to top");
      });

      it("should have table headers", () => {
        expect(en.tableHeaders.date).toBe("Date");
        expect(en.tableHeaders.time).toBe("Time");
        expect(en.tableHeaders.venue).toBe("Venue");
        expect(en.tableHeaders.caseType).toBe("Case type");
        expect(en.tableHeaders.caseReferenceNumber).toBe("Case reference number");
        expect(en.tableHeaders.judges).toBe("Judge(s)");
        expect(en.tableHeaders.members).toBe("Member(s)");
        expect(en.tableHeaders.hearingMethod).toBe("Hearing method");
        expect(en.tableHeaders.additionalInformation).toBe("Additional information");
      });

      it("should have provenance labels", () => {
        expect(en.provenanceLabels).toBeDefined();
      });

      it("should have all regional court names", () => {
        expect(en.rptEasternCourtName).toBe("First-tier Tribunal (Residential Property Tribunal): Eastern region");
        expect(en.rptLondonCourtName).toBe("First-tier Tribunal (Residential Property Tribunal): London region");
        expect(en.rptMidlandsCourtName).toBe("First-tier Tribunal (Residential Property Tribunal): Midlands region");
        expect(en.rptNorthernCourtName).toBe("First-tier Tribunal (Residential Property Tribunal): Northern region");
        expect(en.rptSouthernCourtName).toBe("First-tier Tribunal (Residential Property Tribunal): Southern region");
      });

      it("should have all regional page titles", () => {
        expect(en.rptEasternPageTitle).toBe("First-tier Tribunal (Residential Property Tribunal): Eastern region Weekly Hearing List");
        expect(en.rptLondonPageTitle).toBe("First-tier Tribunal (Residential Property Tribunal): London region Weekly Hearing List");
        expect(en.rptMidlandsPageTitle).toBe("First-tier Tribunal (Residential Property Tribunal): Midlands region Weekly Hearing List");
        expect(en.rptNorthernPageTitle).toBe("First-tier Tribunal (Residential Property Tribunal): Northern region Weekly Hearing List");
        expect(en.rptSouthernPageTitle).toBe("First-tier Tribunal (Residential Property Tribunal): Southern region Weekly Hearing List");
      });
    });

    describe("Welsh locale", () => {
      it("should have all required properties", () => {
        expect(cy.listForWeekCommencing).toBeDefined();
        expect(cy.lastUpdated).toBeDefined();
        expect(cy.at).toBeDefined();
        expect(cy.factLinkText).toBeDefined();
        expect(cy.factLinkUrl).toBeDefined();
        expect(cy.factAdditionalText).toBeDefined();
        expect(cy.importantInformationTitle).toBeDefined();
        expect(cy.importantInformationText).toBeDefined();
        expect(cy.importantInformationLinkText).toBeDefined();
        expect(cy.importantInformationLinkUrl).toBeDefined();
        expect(cy.searchCasesTitle).toBeDefined();
        expect(cy.searchCasesLabel).toBeDefined();
        expect(cy.dataSource).toBeDefined();
        expect(cy.backToTop).toBeDefined();
      });

      it("should have table headers", () => {
        expect(cy.tableHeaders.date).toBeDefined();
        expect(cy.tableHeaders.time).toBeDefined();
        expect(cy.tableHeaders.venue).toBeDefined();
        expect(cy.tableHeaders.caseType).toBeDefined();
        expect(cy.tableHeaders.caseReferenceNumber).toBeDefined();
        expect(cy.tableHeaders.judges).toBeDefined();
        expect(cy.tableHeaders.members).toBeDefined();
        expect(cy.tableHeaders.hearingMethod).toBeDefined();
        expect(cy.tableHeaders.additionalInformation).toBeDefined();
      });

      it("should have provenance labels", () => {
        expect(cy.provenanceLabels).toBeDefined();
      });

      it("should have all regional court names", () => {
        expect(cy.rptEasternCourtName).toBeDefined();
        expect(cy.rptLondonCourtName).toBeDefined();
        expect(cy.rptMidlandsCourtName).toBeDefined();
        expect(cy.rptNorthernCourtName).toBeDefined();
        expect(cy.rptSouthernCourtName).toBeDefined();
      });

      it("should have all regional page titles", () => {
        expect(cy.rptEasternPageTitle).toBeDefined();
        expect(cy.rptLondonPageTitle).toBeDefined();
        expect(cy.rptMidlandsPageTitle).toBeDefined();
        expect(cy.rptNorthernPageTitle).toBeDefined();
        expect(cy.rptSouthernPageTitle).toBeDefined();
      });
    });

    describe("Locale consistency", () => {
      it("should have same structure in English and Welsh", () => {
        expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
      });

      it("should have same number of table headers", () => {
        expect(Object.keys(en.tableHeaders).length).toBe(Object.keys(cy.tableHeaders).length);
      });

      it("should have same table header keys", () => {
        expect(Object.keys(en.tableHeaders).sort()).toEqual(Object.keys(cy.tableHeaders).sort());
      });
    });
  });

  describe("Template rendering", () => {
    let env: nunjucks.Environment;

    const setupNunjucks = () => {
      const environment = createTestEnvironment([__dirname, webCoreViews], {
        trimBlocks: true,
        lstripBlocks: true
      });
      return environment;
    };

    const createMockHeader = () => ({
      listTitle: "First-tier Tribunal (Residential Property Tribunal): Eastern region Weekly Hearing List",
      weekCommencingDate: "Monday 1 January 2024",
      lastUpdatedDate: "1 January 2024",
      lastUpdatedTime: "10:30am"
    });

    const createMockHearing = (overrides = {}) => ({
      date: "01/01/2024",
      time: "10:00am",
      venue: "Tribunals Hearing Centre",
      caseType: "Leasehold",
      caseReferenceNumber: "RPT/2024/001",
      judges: "Judge Johnson",
      members: "Member A, Member B",
      hearingMethod: "Video hearing",
      additionalInformation: "Interpreter required",
      ...overrides
    });

    describe("with English locale", () => {
      it("should render template with all data", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing(), createMockHearing({ caseReferenceNumber: "RPT/2024/002" })];
        const dataSource = "RPT";

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource });

        expect(html).toContain(header.listTitle);
        expect(html).toContain(header.weekCommencingDate);
        expect(html).toContain(header.lastUpdatedDate);
        expect(html).toContain(header.lastUpdatedTime);
        expect(html).toContain(hearings[0].caseReferenceNumber);
        expect(html).toContain(hearings[1].caseReferenceNumber);
        expect(html).toContain(dataSource);
      });

      it("should render header section correctly", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain('<h1 class="govuk-heading-l"');
        expect(html).toContain(en.listForWeekCommencing);
        expect(html).toContain(en.lastUpdated);
        expect(html).toContain(en.at);
      });

      it("should render FACT link section", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain(en.factLinkText);
        expect(html).toContain(en.factLinkUrl);
        expect(html).toContain(en.factAdditionalText);
      });

      it("should render important information details component", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("govuk-details");
        expect(html).toContain(en.importantInformationTitle);
        expect(html).toContain("Members of the public wishing to observe");
        expect(html).toContain(en.importantInformationLinkText);
        expect(html).toContain(en.importantInformationLinkUrl);
      });

      it("should render details component with open attribute", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain('data-module="govuk-details"');
      });

      it("should render search input", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain(en.searchCasesTitle);
        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('type="text"');
      });

      it("should render table with all headers", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain('<table class="govuk-table"');
        expect(html).toContain(en.tableHeaders.date);
        expect(html).toContain(en.tableHeaders.time);
        expect(html).toContain(en.tableHeaders.venue);
        expect(html).toContain(en.tableHeaders.caseType);
        expect(html).toContain(en.tableHeaders.caseReferenceNumber);
        expect(html).toContain(en.tableHeaders.judges);
        expect(html).toContain(en.tableHeaders.members);
        expect(html).toContain(en.tableHeaders.hearingMethod);
        expect(html).toContain(en.tableHeaders.additionalInformation);
      });

      it("should render back to top link", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain(en.backToTop);
        expect(html).toContain('href="#top"');
      });

      it("should render data source", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];
        const dataSource = "RPT";

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource });

        expect(html).toContain(en.dataSource);
        expect(html).toContain(dataSource);
      });
    });

    describe("with Welsh locale", () => {
      it("should render template with Welsh translations", () => {
        env = setupNunjucks();
        const header = {
          listTitle: "First-tier Tribunal (Residential Property Tribunal): Eastern region Weekly Hearing List",
          weekCommencingDate: "Dydd Llun 1 Ionawr 2024",
          lastUpdatedDate: "1 Ionawr 2024",
          lastUpdatedTime: "10:30yb"
        };
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: cy, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain(header.listTitle);
        expect(html).toContain(header.weekCommencingDate);
      });

      it("should render Welsh table headers", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: cy, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain(cy.tableHeaders.date);
        expect(html).toContain(cy.tableHeaders.caseReferenceNumber);
      });
    });

    describe("hearing data variations", () => {
      it("should render with empty hearings array", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings: unknown[] = [];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain('<tbody class="govuk-table__body">');
        expect(html).not.toContain("RPT/2024/001");
      });

      it("should render with single hearing", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain(hearings[0].caseReferenceNumber);
        expect(html).toContain(hearings[0].venue);
        expect(html).toContain(hearings[0].date);
      });

      it("should render with multiple hearings", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [
          createMockHearing({ caseReferenceNumber: "RPT/2024/001" }),
          createMockHearing({ caseReferenceNumber: "RPT/2024/002" }),
          createMockHearing({ caseReferenceNumber: "RPT/2024/003" })
        ];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("RPT/2024/001");
        expect(html).toContain("RPT/2024/002");
        expect(html).toContain("RPT/2024/003");
      });

      it("should render all hearing fields correctly", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearing = createMockHearing({
          date: "15/03/2024",
          time: "2:30pm",
          venue: "Manchester Tribunals Centre",
          caseType: "Service Charge",
          caseReferenceNumber: "RPT/2024/999",
          judges: "Judge Smith, Judge Williams",
          members: "Member X, Member Y, Member Z",
          hearingMethod: "In person",
          additionalInformation: "Special arrangements required"
        });
        const hearings = [hearing];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("15/03/2024");
        expect(html).toContain("2:30pm");
        expect(html).toContain("Manchester Tribunals Centre");
        expect(html).toContain("Service Charge");
        expect(html).toContain("RPT/2024/999");
        expect(html).toContain("Judge Smith, Judge Williams");
        expect(html).toContain("Member X, Member Y, Member Z");
        expect(html).toContain("In person");
        expect(html).toContain("Special arrangements required");
      });

      it("should render with empty string fields", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearing = createMockHearing({
          judges: "",
          members: "",
          additionalInformation: ""
        });
        const hearings = [hearing];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain('<tbody class="govuk-table__body">');
        expect(html).toContain(hearing.caseReferenceNumber);
      });

      it("should render with different hearing method values", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [
          createMockHearing({ caseReferenceNumber: "RPT/2024/001", hearingMethod: "Video hearing" }),
          createMockHearing({ caseReferenceNumber: "RPT/2024/002", hearingMethod: "Telephone hearing" }),
          createMockHearing({ caseReferenceNumber: "RPT/2024/003", hearingMethod: "In person" }),
          createMockHearing({ caseReferenceNumber: "RPT/2024/004", hearingMethod: "Hybrid" })
        ];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("Video hearing");
        expect(html).toContain("Telephone hearing");
        expect(html).toContain("In person");
        expect(html).toContain("Hybrid");
      });

      it("should render with different venue values", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [
          createMockHearing({ caseReferenceNumber: "RPT/2024/001", venue: "Birmingham Tribunals Centre" }),
          createMockHearing({ caseReferenceNumber: "RPT/2024/002", venue: "Manchester Tribunals Centre" }),
          createMockHearing({ caseReferenceNumber: "RPT/2024/003", venue: "London Tribunals Centre" })
        ];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("Birmingham Tribunals Centre");
        expect(html).toContain("Manchester Tribunals Centre");
        expect(html).toContain("London Tribunals Centre");
      });

      it("should render with different case type values", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [
          createMockHearing({ caseReferenceNumber: "RPT/2024/001", caseType: "Leasehold" }),
          createMockHearing({ caseReferenceNumber: "RPT/2024/002", caseType: "Service Charge" }),
          createMockHearing({ caseReferenceNumber: "RPT/2024/003", caseType: "Right to Manage" }),
          createMockHearing({ caseReferenceNumber: "RPT/2024/004", caseType: "Lease Extension" })
        ];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("Leasehold");
        expect(html).toContain("Service Charge");
        expect(html).toContain("Right to Manage");
        expect(html).toContain("Lease Extension");
      });

      it("should render with different time formats", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [
          createMockHearing({ caseReferenceNumber: "RPT/2024/001", time: "9:00am" }),
          createMockHearing({ caseReferenceNumber: "RPT/2024/002", time: "2:30pm" }),
          createMockHearing({ caseReferenceNumber: "RPT/2024/003", time: "10:00am" }),
          createMockHearing({ caseReferenceNumber: "RPT/2024/004", time: "4:00pm" })
        ];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("9:00am");
        expect(html).toContain("2:30pm");
        expect(html).toContain("10:00am");
        expect(html).toContain("4:00pm");
      });

      it("should render with different date formats", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [
          createMockHearing({ caseReferenceNumber: "RPT/2024/001", date: "01/01/2024" }),
          createMockHearing({ caseReferenceNumber: "RPT/2024/002", date: "15/03/2024" }),
          createMockHearing({ caseReferenceNumber: "RPT/2024/003", date: "25/12/2024" })
        ];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("01/01/2024");
        expect(html).toContain("15/03/2024");
        expect(html).toContain("25/12/2024");
      });
    });

    describe("accessibility attributes", () => {
      it("should have proper ARIA labels", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain('role="table"');
        expect(html).toContain("aria-label");
      });

      it("should have visually hidden label for search input", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("govuk-visually-hidden");
        expect(html).toContain(en.searchCasesLabel);
      });

      it("should have proper table structure with scope attributes", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain('<thead class="govuk-table__head">');
        expect(html).toContain('scope="col"');
        expect(html).toContain("<th");
      });

      it("should have id anchor for back to top link", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain('id="top"');
      });
    });

    describe("GOV.UK Design System compliance", () => {
      it("should use govuk-grid-row and govuk-grid-column classes", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("govuk-grid-row");
        expect(html).toContain("govuk-grid-column-full");
      });

      it("should use govuk-heading classes", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("govuk-heading-l");
        expect(html).toContain("govuk-heading-s");
      });

      it("should use govuk-body classes", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("govuk-body");
      });

      it("should use govuk-link class", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("govuk-link");
      });

      it("should use govuk-details component classes", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("govuk-details");
        expect(html).toContain("govuk-details__summary");
        expect(html).toContain("govuk-details__text");
      });

      it("should use govuk-input class", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("govuk-input");
      });

      it("should use govuk-table classes", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("govuk-table");
        expect(html).toContain("govuk-table__head");
        expect(html).toContain("govuk-table__body");
        expect(html).toContain("govuk-table__row");
        expect(html).toContain("govuk-table__header");
        expect(html).toContain("govuk-table__cell");
      });

      it("should use govuk-form-group class", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("govuk-form-group");
      });

      it("should use govuk-label class", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain("govuk-label");
      });
    });

    describe("links and URLs", () => {
      it("should render external links with proper attributes", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener noreferrer"');
      });

      it("should render FACT link URL", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain(en.factLinkUrl);
      });

      it("should render important information link URL", () => {
        env = setupNunjucks();
        const header = createMockHeader();
        const hearings = [createMockHearing()];

        const { html } = render(env, "ftt-rpt-weekly-hearing-list.njk", { t: en, en, cy, header, hearings, dataSource: "RPT" });

        expect(html).toContain(en.importantInformationLinkUrl);
      });
    });
  });
});
