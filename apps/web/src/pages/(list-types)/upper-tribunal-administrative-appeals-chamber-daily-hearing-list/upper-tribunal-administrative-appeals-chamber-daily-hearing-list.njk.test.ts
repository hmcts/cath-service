import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  upperTribunalAdministrativeAppealsChamberDailyHearingListCy as cy,
  upperTribunalAdministrativeAppealsChamberDailyHearingListEn as en
} from "@hmcts/upper-tribunal-administrative-appeals-chamber-daily-hearing-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("upper-tribunal-administrative-appeals-chamber-daily-hearing-list template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
    const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

    env = nunjucks.configure([__dirname, webCoreViews, govukFrontend], {
      autoescape: true,
      noCache: true
    });
  });

  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Template content", () => {
    const templatePath = path.join(__dirname, "upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk");
    const templateContent = readFileSync(templatePath, "utf-8");

    it("should extend base template", () => {
      expect(templateContent).toContain('{% extends "layouts/base-template.njk" %}');
    });

    it("should have custom styles in head block", () => {
      expect(templateContent).toContain("{% block head %}");
      expect(templateContent).toContain(".back-to-top");
    });

    it("should use page_content block", () => {
      expect(templateContent).toContain("{% block page_content %}");
    });

    it("should have main heading from header data", () => {
      expect(templateContent).toContain('<h1 class="govuk-heading-l" id="top">{{ header.listTitle }}</h1>');
    });

    it("should have fact link structure", () => {
      expect(templateContent).toContain('<a href="{{ t.factLinkUrl }}"');
      expect(templateContent).toContain("{{ t.factLinkText }}");
      expect(templateContent).toContain("{{ t.factAdditionalText }}");
    });

    it("should display header information", () => {
      expect(templateContent).toContain("{{ t.listForDate }} {{ header.hearingDate }}");
      expect(templateContent).toContain("{{ t.lastUpdated }} {{ header.lastUpdatedDate }}");
      expect(templateContent).toContain("{{ t.at }} {{ header.lastUpdatedTime }}");
    });

    it("should have opening statement details component", () => {
      expect(templateContent).toContain('<details class="govuk-details');
      expect(templateContent).toContain('data-module="govuk-details"');
      expect(templateContent).toContain("{{ t.openingStatementTitle }}");
    });

    it("should have opening statement content structure", () => {
      expect(templateContent).toContain("{{ t.openingStatement.detailsTitle }}");
      expect(templateContent).toContain("{{ t.openingStatement.listChangeNotice }}");
      expect(templateContent).toContain("{{ t.openingStatement.englandAndWalesTitle }}");
      expect(templateContent).toContain("{{ t.openingStatement.scotlandTitle }}");
    });

    it("should have search cases input", () => {
      expect(templateContent).toContain("{{ t.searchCasesTitle }}");
      expect(templateContent).toContain('<input class="govuk-input');
      expect(templateContent).toContain('id="case-search-input"');
      expect(templateContent).toContain('aria-label="{{ t.searchCasesLabel }}"');
    });

    it("should have hearings table structure", () => {
      expect(templateContent).toContain('<table class="govuk-table" id="hearings-table"');
      expect(templateContent).toContain('role="table"');
      expect(templateContent).toContain('aria-label="{{ t.pageTitle }}"');
    });

    it("should have table headers", () => {
      expect(templateContent).toContain("{{ t.tableHeaders.time }}");
      expect(templateContent).toContain("{{ t.tableHeaders.appellant }}");
      expect(templateContent).toContain("{{ t.tableHeaders.caseReferenceNumber }}");
      expect(templateContent).toContain("{{ t.tableHeaders.judges }}");
      expect(templateContent).toContain("{{ t.tableHeaders.members }}");
      expect(templateContent).toContain("{{ t.tableHeaders.modeOfHearing }}");
      expect(templateContent).toContain("{{ t.tableHeaders.venue }}");
      expect(templateContent).toContain("{{ t.tableHeaders.additionalInformation }}");
    });

    it("should loop through hearings", () => {
      expect(templateContent).toContain("{% for hearing in hearings %}");
      expect(templateContent).toContain("{{ hearing.time }}");
      expect(templateContent).toContain("{{ hearing.appellant }}");
      expect(templateContent).toContain("{{ hearing.caseReferenceNumber }}");
      expect(templateContent).toContain("{{ hearing.judges }}");
      expect(templateContent).toContain("{{ hearing.members }}");
      expect(templateContent).toContain("{{ hearing.modeOfHearing }}");
      expect(templateContent).toContain("{{ hearing.venue }}");
      expect(templateContent).toContain("{{ hearing.additionalInformation }}");
      expect(templateContent).toContain("{% endfor %}");
    });

    it("should have data source footer", () => {
      expect(templateContent).toContain("{{ t.dataSource }}: {{ dataSource }}");
    });

    it("should have back to top link", () => {
      expect(templateContent).toContain('<a href="#top"');
      expect(templateContent).toContain("{{ t.backToTop }}");
    });

    it("should use GOV.UK Design System classes", () => {
      expect(templateContent).toContain("govuk-grid-row");
      expect(templateContent).toContain("govuk-grid-column-full");
      expect(templateContent).toContain("govuk-heading-l");
      expect(templateContent).toContain("govuk-body");
      expect(templateContent).toContain("govuk-details");
      expect(templateContent).toContain("govuk-table");
      expect(templateContent).toContain("govuk-link");
    });
  });

  describe("English locale content", () => {
    it("should have page title", () => {
      expect(en.pageTitle).toBe("Upper Tribunal (Administrative Appeals Chamber) Daily Hearing List");
    });

    it("should have fact link content", () => {
      expect(en.factLinkText).toBe("Find contact details and other information about courts and tribunals");
      expect(en.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
      expect(en.factAdditionalText).toBe("in England and Wales, and some non-devolved tribunals in Scotland.");
    });

    it("should have header text labels", () => {
      expect(en.listForDate).toBe("List for");
      expect(en.lastUpdated).toBe("Last updated");
      expect(en.at).toBe("at");
    });

    it("should have opening statement structure", () => {
      expect(en.openingStatementTitle).toBe("Important information");
      expect(en.openingStatement).toBeDefined();
      expect(en.openingStatement.detailsTitle).toBe("Details");
      expect(en.openingStatement.listChangeNotice).toContain("Lists are subject to change");
    });

    it("should have England and Wales opening statement content", () => {
      expect(en.openingStatement.englandAndWalesTitle).toBe("England and Wales");
      expect(en.openingStatement.englandAndWalesRemoteText).toBe("Remote hearings via CVP");
      expect(en.openingStatement.englandAndWalesCvpText).toContain("Hearings will be available");
      expect(en.openingStatement.englandAndWalesAccessText).toContain("Any media representative");
      expect(en.openingStatement.englandAndWalesContactText).toBe("Please contact adminappeals@justice.gov.uk.");
    });

    it("should have Scotland opening statement content", () => {
      expect(en.openingStatement.scotlandTitle).toBe("Scotland");
      expect(en.openingStatement.scotlandRemoteText).toBe("Remote hearings");
      expect(en.openingStatement.scotlandCvpText).toContain("When hearings are listed for Scotland");
    });

    it("should have search cases content", () => {
      expect(en.searchCasesTitle).toBe("Search Cases");
      expect(en.searchCasesLabel).toContain("Search by case reference");
    });

    it("should have table headers", () => {
      expect(en.tableHeaders.time).toBe("Time");
      expect(en.tableHeaders.appellant).toBe("Appellant");
      expect(en.tableHeaders.caseReferenceNumber).toBe("Case reference number");
      expect(en.tableHeaders.judges).toBe("Judge(s)");
      expect(en.tableHeaders.members).toBe("Member(s)");
      expect(en.tableHeaders.modeOfHearing).toBe("Mode of hearing");
      expect(en.tableHeaders.venue).toBe("Venue");
      expect(en.tableHeaders.additionalInformation).toBe("Additional information");
    });

    it("should have footer content", () => {
      expect(en.dataSource).toBe("Data source");
      expect(en.backToTop).toBe("Back to top");
    });
  });

  describe("Welsh locale content", () => {
    it("should have page title", () => {
      expect(cy.pageTitle).toBe("Rhestr Gwrandawiadau Dyddiol Tribiwnlys Uwch (Siambr Apeliadau Gweinyddol)");
    });

    it("should have fact link content", () => {
      expect(cy.factLinkText).toBe("Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd");
      expect(cy.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
      expect(cy.factAdditionalText).toBe("yng Nghymru a Lloegr, a rhai tribiwnlysoedd sydd heb eu datganoli yn yr Alban.");
    });

    it("should have header text labels", () => {
      expect(cy.listForDate).toBe("Rhestr ar gyfer");
      expect(cy.lastUpdated).toBe("Diweddarwyd ddiwethaf");
      expect(cy.at).toBe("am");
    });

    it("should have opening statement structure", () => {
      expect(cy.openingStatementTitle).toBe("Gwybodaeth bwysig");
      expect(cy.openingStatement).toBeDefined();
      expect(cy.openingStatement.detailsTitle).toBe("Manylion");
      expect(cy.openingStatement.listChangeNotice).toContain("Mae'r rhestrau yn destun newid");
    });

    it("should have England and Wales opening statement content", () => {
      expect(cy.openingStatement.englandAndWalesTitle).toBe("Cymru a Lloegr");
      expect(cy.openingStatement.englandAndWalesRemoteText).toBe("Gwrandawiadau o bell drwy CVP");
      expect(cy.openingStatement.englandAndWalesCvpText).toContain("Bydd gwrandawiadau ar gael");
      expect(cy.openingStatement.englandAndWalesAccessText).toContain("Bydd angen i unrhyw gynrychiolydd");
      expect(cy.openingStatement.englandAndWalesContactText).toBe("Cysylltwch â adminappeals@justice.gov.uk.");
    });

    it("should have Scotland opening statement content", () => {
      expect(cy.openingStatement.scotlandTitle).toBe("Yr Alban");
      expect(cy.openingStatement.scotlandRemoteText).toBe("Gwrandawiadau o bell");
      expect(cy.openingStatement.scotlandCvpText).toContain("Pan restrir gwrandawiadau ar gyfer yr Alban");
    });

    it("should have search cases content", () => {
      expect(cy.searchCasesTitle).toBe("Chwilio Achosion");
      expect(cy.searchCasesLabel).toContain("Chwilio yn ôl cyfeirnod achos");
    });

    it("should have table headers", () => {
      expect(cy.tableHeaders.time).toBe("Amser");
      expect(cy.tableHeaders.appellant).toBe("Apelydd");
      expect(cy.tableHeaders.caseReferenceNumber).toBe("Rhif cyfeirnod achos");
      expect(cy.tableHeaders.judges).toBe("Barnwr/Barnwyr");
      expect(cy.tableHeaders.members).toBe("Aelod/Aelodau");
      expect(cy.tableHeaders.modeOfHearing).toBe("Dull gwrandawiad");
      expect(cy.tableHeaders.venue).toBe("Lleoliad");
      expect(cy.tableHeaders.additionalInformation).toBe("Gwybodaeth ychwanegol");
    });

    it("should have footer content", () => {
      expect(cy.dataSource).toBe("Ffynhonnell data");
      expect(cy.backToTop).toBe("Yn ôl i frig y dudalen");
    });
  });

  describe("Locale consistency", () => {
    it("should have same top-level keys in English and Welsh", () => {
      const enKeys = Object.keys(en).sort();
      const cyKeys = Object.keys(cy).sort();
      expect(enKeys).toEqual(cyKeys);
    });

    it("should have same openingStatement keys", () => {
      const enOpeningKeys = Object.keys(en.openingStatement).sort();
      const cyOpeningKeys = Object.keys(cy.openingStatement).sort();
      expect(enOpeningKeys).toEqual(cyOpeningKeys);
    });

    it("should have same tableHeaders keys", () => {
      const enHeaderKeys = Object.keys(en.tableHeaders).sort();
      const cyHeaderKeys = Object.keys(cy.tableHeaders).sort();
      expect(enHeaderKeys).toEqual(cyHeaderKeys);
    });

    it("should have all required top-level properties", () => {
      const requiredProperties = [
        "pageTitle",
        "downloadPdf",
        "factLinkText",
        "factLinkUrl",
        "factAdditionalText",
        "listForDate",
        "lastUpdated",
        "at",
        "openingStatement",
        "openingStatementTitle",
        "searchCasesTitle",
        "searchCasesLabel",
        "tableHeaders",
        "dataSource",
        "backToTop"
      ];

      requiredProperties.forEach((prop) => {
        expect(en).toHaveProperty(prop);
        expect(cy).toHaveProperty(prop);
      });
    });
  });

  describe("Template data structures", () => {
    it("should use header object with required properties", () => {
      const templatePath = path.join(__dirname, "upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk");
      const templateContent = readFileSync(templatePath, "utf-8");

      // Header should have these properties used in template
      expect(templateContent).toContain("header.listTitle");
      expect(templateContent).toContain("header.hearingDate");
      expect(templateContent).toContain("header.lastUpdatedDate");
      expect(templateContent).toContain("header.lastUpdatedTime");
    });

    it("should loop through hearings array with all properties", () => {
      const templatePath = path.join(__dirname, "upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk");
      const templateContent = readFileSync(templatePath, "utf-8");

      // All hearing properties should be rendered
      const hearingProperties = [
        "hearing.time",
        "hearing.appellant",
        "hearing.caseReferenceNumber",
        "hearing.judges",
        "hearing.members",
        "hearing.modeOfHearing",
        "hearing.venue",
        "hearing.additionalInformation"
      ];

      hearingProperties.forEach((prop) => {
        expect(templateContent).toContain(prop);
      });
    });

    it("should use dataSource variable", () => {
      const templatePath = path.join(__dirname, "upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk");
      const templateContent = readFileSync(templatePath, "utf-8");

      expect(templateContent).toContain("{{ dataSource }}");
    });
  });

  describe("Template rendering with data variations", () => {
    const baseTemplateData = {
      t: en,
      en,
      cy,
      header: {
        listTitle: "Upper Tribunal (Administrative Appeals Chamber) Daily Hearing List",
        hearingDate: "13 July 2026",
        lastUpdatedDate: "13 July 2026",
        lastUpdatedTime: "9:00am"
      },
      dataSource: "Manual Upload"
    };

    describe("Header rendering", () => {
      it("should render header with list title", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Upper Tribunal (Administrative Appeals Chamber) Daily Hearing List");
      });

      it("should render hearing date", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("List for");
        expect(html).toContain("13 July 2026");
      });

      it("should render last updated information", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Last updated");
        expect(html).toContain("9:00am");
      });
    });

    describe("Opening statement details", () => {
      it("should render opening statement with all sections", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Important information");
        expect(html).toContain("Details");
        expect(html).toContain("Lists are subject to change");
        expect(html).toContain("England and Wales");
        expect(html).toContain("Remote hearings via CVP");
        expect(html).toContain("Scotland");
      });

      it("should render contact email addresses", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("adminappeals@justice.gov.uk");
        expect(html).toContain("UTAACMailbox@justice.gov.uk");
      });
    });

    describe("Search functionality", () => {
      it("should render search input", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Search Cases");
        expect(html).toContain('id="case-search-input"');
      });

      it("should render search label with accessibility attributes", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain('aria-label="Search by case reference, appellant, case name, judge, venue, or other details"');
      });
    });

    describe("Hearings table", () => {
      it("should render table with all headers", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Time");
        expect(html).toContain("Appellant");
        expect(html).toContain("Case reference number");
        expect(html).toContain("Judge(s)");
        expect(html).toContain("Member(s)");
        expect(html).toContain("Mode of hearing");
        expect(html).toContain("Venue");
        expect(html).toContain("Additional information");
      });

      it("should render hearing with all fields populated", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              time: "10:00am",
              appellant: "John Smith",
              caseReferenceNumber: "UT/AAC/2026/001",
              judges: "Judge Wilson",
              members: "Member A, Member B",
              modeOfHearing: "Remote hearing via CVP",
              venue: "Field House, London",
              additionalInformation: "Public hearing"
            }
          ]
        });

        expect(html).toContain("10:00am");
        expect(html).toContain("John Smith");
        expect(html).toContain("UT/AAC/2026/001");
        expect(html).toContain("Judge Wilson");
        expect(html).toContain("Member A, Member B");
        expect(html).toContain("Remote hearing via CVP");
        expect(html).toContain("Field House, London");
        expect(html).toContain("Public hearing");
      });

      it("should render hearing with empty optional fields", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              time: "2:00pm",
              appellant: "Jane Doe",
              caseReferenceNumber: "UT/AAC/2026/002",
              judges: "Judge Brown",
              members: "",
              modeOfHearing: "In person",
              venue: "Glasgow Tribunals Centre",
              additionalInformation: ""
            }
          ]
        });

        expect(html).toContain("2:00pm");
        expect(html).toContain("Jane Doe");
        expect(html).toContain("UT/AAC/2026/002");
        expect(html).toContain("Judge Brown");
        expect(html).toContain("In person");
        expect(html).toContain("Glasgow Tribunals Centre");
      });

      it("should render multiple hearings", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              time: "9:30am",
              appellant: "Appellant One",
              caseReferenceNumber: "UT/AAC/2026/100",
              judges: "Judge Alpha",
              members: "Member X",
              modeOfHearing: "CVP",
              venue: "Manchester",
              additionalInformation: "Test info 1"
            },
            {
              time: "11:00am",
              appellant: "Appellant Two",
              caseReferenceNumber: "UT/AAC/2026/101",
              judges: "Judge Beta",
              members: "Member Y",
              modeOfHearing: "In person",
              venue: "Birmingham",
              additionalInformation: "Test info 2"
            },
            {
              time: "2:30pm",
              appellant: "Appellant Three",
              caseReferenceNumber: "UT/AAC/2026/102",
              judges: "Judge Gamma",
              members: "Member Z",
              modeOfHearing: "Telephone",
              venue: "Cardiff",
              additionalInformation: "Test info 3"
            }
          ]
        });

        expect(html).toContain("Appellant One");
        expect(html).toContain("Appellant Two");
        expect(html).toContain("Appellant Three");
        expect(html).toContain("UT/AAC/2026/100");
        expect(html).toContain("UT/AAC/2026/101");
        expect(html).toContain("UT/AAC/2026/102");
      });

      it("should render empty table when no hearings", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("<table");
        expect(html).toContain('id="hearings-table"');
        expect(html).toContain("<thead");
        expect(html).toContain("<tbody");
      });
    });

    describe("Footer elements", () => {
      it("should render data source", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          dataSource: "Manual Upload",
          hearings: []
        });

        expect(html).toContain("Data source");
        expect(html).toContain("Manual Upload");
      });

      it("should render back to top link", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("Back to top");
        expect(html).toContain('href="#top"');
      });

      it("should have anchor at top of page", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain('id="top"');
      });
    });

    describe("Welsh translation", () => {
      it("should render with Welsh locale", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          t: cy,
          en,
          cy,
          header: {
            listTitle: "Rhestr Gwrandawiadau Dyddiol Tribiwnlys Uwch (Siambr Apeliadau Gweinyddol)",
            hearingDate: "13 Gorffennaf 2026",
            lastUpdatedDate: "13 Gorffennaf 2026",
            lastUpdatedTime: "9:00am"
          },
          dataSource: "Llwytho â Llaw",
          hearings: []
        });

        expect(html).toContain("Rhestr Gwrandawiadau Dyddiol Tribiwnlys Uwch");
        expect(html).toContain("Gwybodaeth bwysig");
        expect(html).toContain("Chwilio Achosion");
        expect(html).toContain("Ffynhonnell data");
        expect(html).toContain("Yn ôl i frig y dudalen");
      });

      it("should render Welsh table headers", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          t: cy,
          en,
          cy,
          header: {
            listTitle: "Rhestr Gwrandawiadau",
            hearingDate: "13 Gorffennaf 2026",
            lastUpdatedDate: "13 Gorffennaf 2026",
            lastUpdatedTime: "9:00am"
          },
          dataSource: "Test",
          hearings: []
        });

        expect(html).toContain("Amser");
        expect(html).toContain("Apelydd");
        expect(html).toContain("Rhif cyfeirnod achos");
        expect(html).toContain("Barnwr/Barnwyr");
        expect(html).toContain("Aelod/Aelodau");
        expect(html).toContain("Dull gwrandawiad");
        expect(html).toContain("Lleoliad");
        expect(html).toContain("Gwybodaeth ychwanegol");
      });
    });

    describe("Accessibility features", () => {
      it("should have proper table aria-label", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain('role="table"');
        expect(html).toContain('aria-label="Upper Tribunal (Administrative Appeals Chamber) Daily Hearing List"');
      });

      it("should have proper heading structure", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("<h1");
        expect(html).toContain('class="govuk-heading-l"');
      });

      it("should have details element with module attribute", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("<details");
        expect(html).toContain('data-module="govuk-details"');
      });

      it("should have visually hidden search label", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain('class="govuk-label govuk-visually-hidden"');
      });
    });

    describe("Custom styling", () => {
      it("should include custom back-to-top styles", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain(".back-to-top");
        expect(html).toContain("margin-top: 40px");
      });
    });

    describe("Data variations", () => {
      it("should handle long appellant names", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              time: "10:00am",
              appellant: "Very Long Appellant Name With Multiple Parts And Additional Information",
              caseReferenceNumber: "UT/AAC/2026/001",
              judges: "Judge Wilson",
              members: "",
              modeOfHearing: "CVP",
              venue: "London",
              additionalInformation: ""
            }
          ]
        });

        expect(html).toContain("Very Long Appellant Name With Multiple Parts And Additional Information");
      });

      it("should handle multiple judges", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              time: "11:00am",
              appellant: "Test Appellant",
              caseReferenceNumber: "UT/AAC/2026/002",
              judges: "Judge A, Judge B, Judge C",
              members: "Member X, Member Y",
              modeOfHearing: "In person",
              venue: "Manchester",
              additionalInformation: ""
            }
          ]
        });

        expect(html).toContain("Judge A, Judge B, Judge C");
        expect(html).toContain("Member X, Member Y");
      });

      it("should handle special characters in data", () => {
        const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              time: "3:00pm",
              appellant: "O'Brien & Sons Ltd",
              caseReferenceNumber: "UT/AAC/2026/003",
              judges: "Judge Smith-Jones",
              members: "",
              modeOfHearing: "CVP",
              venue: "Cardiff",
              additionalInformation: "Section 39 applies"
            }
          ]
        });

        expect(html).toContain("O&#39;Brien &amp; Sons Ltd");
        expect(html).toContain("Smith-Jones");
      });

      it("should render with different data sources", () => {
        const dataSources = ["XHIBIT", "SNL", "Common Platform", "Manual Upload"];

        dataSources.forEach((source) => {
          const html = env.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list.njk", {
            ...baseTemplateData,
            dataSource: source,
            hearings: []
          });

          expect(html).toContain(source);
        });
      });
    });
  });
});
