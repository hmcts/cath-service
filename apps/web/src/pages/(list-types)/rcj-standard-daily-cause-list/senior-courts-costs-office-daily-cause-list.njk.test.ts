import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rcjStandardDailyCauseListCy as cy, rcjStandardDailyCauseListEn as en } from "@hmcts/rcj-standard-daily-cause-list";
import { moduleRoot as webCoreModuleRoot } from "@hmcts/web-core/config";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const govukFrontend = path.resolve("node_modules/govuk-frontend/dist");
const webCoreViews = path.join(webCoreModuleRoot, "views");

describe("senior-courts-costs-office-daily-cause-list.njk", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "senior-courts-costs-office-daily-cause-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Locale content", () => {
    describe("English locale", () => {
      it("should have SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST object", () => {
        expect(en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST).toBeDefined();
        expect(typeof en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST).toBe("object");
      });

      it("should have all required keys in SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST", () => {
        const requiredKeys = ["pageTitle", "locationLine1", "locationLine2", "locationLine3", "importantInfoText", "moreInfoLinkText", "moreInfoLinkUrl"];

        requiredKeys.forEach((key) => {
          expect(en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.pageTitle).toBe("Senior Courts Costs Office Daily Cause List");
        expect(en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.locationLine1).toBe("Royal Courts of Justice");
        expect(en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.locationLine2).toBe("Strand, London");
        expect(en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.locationLine3).toBe("WC2A 2LL");
      });

      it("should have importantInfoText with expected content", () => {
        const { importantInfoText } = en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST;
        expect(importantInfoText).toContain("Hearings in the Senior Courts Costs Office");
        expect(importantInfoText).toContain("Open justice is a fundamental principle");
        expect(importantInfoText).toContain("scco@justice.gov.uk");
      });

      it("should have correct URL values", () => {
        expect(en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.moreInfoLinkUrl).toBe("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
      });

      it("should have common object with required keys", () => {
        const commonRequiredKeys = [
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText",
          "importantInfoTitle",
          "searchCasesTitle",
          "searchCasesLabel",
          "tableHeaders",
          "dataSource",
          "backToTop",
          "listFor",
          "lastUpdated",
          "at"
        ];

        commonRequiredKeys.forEach((key) => {
          expect(en.common).toHaveProperty(key);
        });
      });

      it("should have correct common static text values", () => {
        expect(en.common.importantInfoTitle).toBe("Important information");
        expect(en.common.searchCasesTitle).toBe("Search Cases");
        expect(en.common.dataSource).toBe("Data source");
        expect(en.common.backToTop).toBe("Back to top");
        expect(en.common.listFor).toBe("List for");
        expect(en.common.lastUpdated).toBe("Last updated");
        expect(en.common.at).toBe("at");
      });

      it("should have correct table header labels", () => {
        expect(en.common.tableHeaders.venue).toBe("Venue");
        expect(en.common.tableHeaders.judge).toBe("Judge");
        expect(en.common.tableHeaders.time).toBe("Time");
        expect(en.common.tableHeaders.caseNumber).toBe("Case number");
        expect(en.common.tableHeaders.caseDetails).toBe("Case details");
        expect(en.common.tableHeaders.hearingType).toBe("Hearing type");
        expect(en.common.tableHeaders.additionalInformation).toBe("Additional information");
      });

      it("should have correct FACT URL values in common", () => {
        expect(en.common.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(en.common.factLinkText).toContain("Find contact details");
      });
    });

    describe("Welsh locale", () => {
      it("should have SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST object", () => {
        expect(cy.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST).toBeDefined();
        expect(typeof cy.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST).toBe("object");
      });

      it("should have all required keys in SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST", () => {
        const requiredKeys = ["pageTitle", "locationLine1", "locationLine2", "locationLine3", "importantInfoText", "moreInfoLinkText", "moreInfoLinkUrl"];

        requiredKeys.forEach((key) => {
          expect(cy.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(cy.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.pageTitle).toBe("Rhestr Achosion Dyddiol Swyddfa Costau'r Uwchlysoedd");
        expect(cy.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.locationLine1).toBe("Llysoedd Barn Brenhinol");
        expect(cy.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.locationLine2).toBe("Strand, London");
        expect(cy.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.locationLine3).toBe("WC2A 2LL");
      });

      it("should have importantInfoText with expected content", () => {
        const { importantInfoText } = cy.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST;
        expect(importantInfoText).toContain("Swyddfa Costau");
        expect(importantInfoText).toContain("cyfiawnder agored");
        expect(importantInfoText).toContain("scco@justice.gov.uk");
      });

      it("should have correct URL values", () => {
        expect(cy.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.moreInfoLinkUrl).toBe("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
      });

      it("should have common object with required keys", () => {
        const commonRequiredKeys = [
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText",
          "importantInfoTitle",
          "searchCasesTitle",
          "searchCasesLabel",
          "tableHeaders",
          "dataSource",
          "backToTop",
          "listFor",
          "lastUpdated",
          "at"
        ];

        commonRequiredKeys.forEach((key) => {
          expect(cy.common).toHaveProperty(key);
        });
      });

      it("should have correct common static text values", () => {
        expect(cy.common.importantInfoTitle).toBe("Gwybodaeth bwysig");
        expect(cy.common.searchCasesTitle).toBe("Chwilio Achosion");
        expect(cy.common.dataSource).toBe("Ffynhonnell data");
        expect(cy.common.backToTop).toBe("Yn ôl i frig y dudalen");
        expect(cy.common.listFor).toBe("Rhestr ar gyfer");
        expect(cy.common.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(cy.common.at).toBe("am");
      });

      it("should have correct table header labels", () => {
        expect(cy.common.tableHeaders.venue).toBe("Lleoliad");
        expect(cy.common.tableHeaders.judge).toBe("Barnwr");
        expect(cy.common.tableHeaders.time).toBe("Amser");
        expect(cy.common.tableHeaders.caseNumber).toBe("Rhif yr achos");
        expect(cy.common.tableHeaders.caseDetails).toBe("Manylion yr achos");
        expect(cy.common.tableHeaders.hearingType).toBe("Math o wrandawiad");
        expect(cy.common.tableHeaders.additionalInformation).toBe("Gwybodaeth ychwanegol");
      });

      it("should have correct FACT URL values in common", () => {
        expect(cy.common.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(cy.common.factLinkText).toContain("Dod o hyd i fanylion cyswllt");
      });
    });

    describe("Locale consistency", () => {
      it("should have same structure in SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST", () => {
        const enKeys = Object.keys(en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST).sort();
        const cyKeys = Object.keys(cy.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST).sort();
        expect(enKeys).toEqual(cyKeys);
      });

      it("should have same structure in common object", () => {
        const enKeys = Object.keys(en.common).sort();
        const cyKeys = Object.keys(cy.common).sort();
        expect(enKeys).toEqual(cyKeys);
      });

      it("should have same types for each key in SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST", () => {
        Object.keys(en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST).forEach((key) => {
          const enType = typeof en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST[key as keyof typeof en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST];
          const cyType = typeof cy.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST[key as keyof typeof cy.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST];
          expect(enType).toBe(cyType);
        });
      });

      it("should have same types for each key in common", () => {
        Object.keys(en.common).forEach((key) => {
          const enType = typeof en.common[key as keyof typeof en.common];
          const cyType = typeof cy.common[key as keyof typeof cy.common];
          expect(enType).toBe(cyType);
        });
      });
    });
  });

  describe("Template rendering", () => {
    let env: nunjucks.Environment;

    const createMockData = (overrides = {}) => ({
      listContent: en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST,
      common: en.common,
      header: {
        listTitle: "Senior Courts Costs Office Daily Cause List",
        listDate: "10 July 2026",
        lastUpdatedDate: "9 July 2026",
        lastUpdatedTime: "4:30pm"
      },
      hearings: [
        {
          venue: "Court Room 1",
          judge: "Master Smith",
          time: "10:00",
          caseNumber: "CA-2026-000001",
          caseDetails: "Smith v Jones",
          hearingType: "Detailed Assessment",
          additionalInformation: "Remote hearing"
        },
        {
          venue: "Court Room 2",
          judge: "Master Johnson",
          time: "14:00",
          caseNumber: "CA-2026-000002",
          caseDetails: "Brown v Green",
          hearingType: "Assessment Hearing",
          additionalInformation: ""
        }
      ],
      dataSource: "CPP",
      ...overrides
    });

    beforeEach(() => {
      env = nunjucks.configure([__dirname, webCoreViews, govukFrontend], {
        autoescape: true,
        throwOnUndefined: false,
        trimBlocks: true,
        lstripBlocks: true
      });
    });

    it("should render template successfully with complete data", () => {
      const mockData = createMockData();
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain("Senior Courts Costs Office Daily Cause List");
      expect(html).toContain("Royal Courts of Justice");
      expect(html).toContain("Strand, London");
      expect(html).toContain("WC2A 2LL");
    });

    it("should render header with list title and date", () => {
      const mockData = createMockData();
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain(mockData.header.listTitle);
      expect(html).toContain(`List for ${mockData.header.listDate}`);
      expect(html).toContain(`Last updated ${mockData.header.lastUpdatedDate}`);
      expect(html).toContain(`at ${mockData.header.lastUpdatedTime}`);
    });

    it("should render location details", () => {
      const mockData = createMockData();
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain(en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.locationLine1);
      expect(html).toContain(en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.locationLine2);
      expect(html).toContain(en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.locationLine3);
    });

    it("should render FACT link with correct text and URL", () => {
      const mockData = createMockData();
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain(en.common.factLinkUrl);
      expect(html).toContain(en.common.factLinkText);
      expect(html).toContain(en.common.factAdditionalText);
    });

    it("should render important information details component", () => {
      const mockData = createMockData();
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain(en.common.importantInfoTitle);
      expect(html).toContain("Hearings in the Senior Courts Costs Office");
      expect(html).toContain("Open justice is a fundamental principle");
      expect(html).toContain("scco@justice.gov.uk");
    });

    it("should render important information with multi-paragraph text", () => {
      const mockData = createMockData();
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      const paragraphCount = (html.match(/<p class="govuk-body">/g) || []).length;
      expect(paragraphCount).toBeGreaterThan(0);
    });

    it("should render more info link at end of important information", () => {
      const mockData = createMockData();
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain(en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.moreInfoLinkText);
      expect(html).toContain(en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.moreInfoLinkUrl);
    });

    it("should render search cases section", () => {
      const mockData = createMockData();
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain(en.common.searchCasesTitle);
      expect(html).toContain(en.common.searchCasesLabel);
      expect(html).toContain('id="case-search-input"');
    });

    it("should render table with correct headers", () => {
      const mockData = createMockData();
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain(en.common.tableHeaders.venue);
      expect(html).toContain(en.common.tableHeaders.judge);
      expect(html).toContain(en.common.tableHeaders.time);
      expect(html).toContain(en.common.tableHeaders.caseNumber);
      expect(html).toContain(en.common.tableHeaders.caseDetails);
      expect(html).toContain(en.common.tableHeaders.hearingType);
      expect(html).toContain(en.common.tableHeaders.additionalInformation);
    });

    it("should render hearings data in table rows", () => {
      const mockData = createMockData();
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain("Court Room 1");
      expect(html).toContain("Master Smith");
      expect(html).toContain("10:00");
      expect(html).toContain("CA-2026-000001");
      expect(html).toContain("Smith v Jones");
      expect(html).toContain("Detailed Assessment");
      expect(html).toContain("Remote hearing");

      expect(html).toContain("Court Room 2");
      expect(html).toContain("Master Johnson");
      expect(html).toContain("14:00");
      expect(html).toContain("CA-2026-000002");
      expect(html).toContain("Brown v Green");
      expect(html).toContain("Assessment Hearing");
    });

    it("should render with empty hearings array", () => {
      const mockData = createMockData({ hearings: [] });
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain("Senior Courts Costs Office Daily Cause List");
      expect(html).toContain(en.common.tableHeaders.venue);
    });

    it("should render with single hearing", () => {
      const mockData = createMockData({
        hearings: [
          {
            venue: "Court Room 3",
            judge: "Master Williams",
            time: "11:00",
            caseNumber: "CA-2026-000003",
            caseDetails: "White v Black",
            hearingType: "Provisional Assessment",
            additionalInformation: "In person"
          }
        ]
      });
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain("Court Room 3");
      expect(html).toContain("Master Williams");
      expect(html).toContain("CA-2026-000003");
    });

    it("should render hearings with empty additionalInformation field", () => {
      const mockData = createMockData({
        hearings: [
          {
            venue: "Court Room 1",
            judge: "Master Smith",
            time: "10:00",
            caseNumber: "CA-2026-000001",
            caseDetails: "Test Case",
            hearingType: "Assessment",
            additionalInformation: ""
          }
        ]
      });
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain("Test Case");
      expect(html).toContain("Assessment");
    });

    it("should render hearings with all empty string fields", () => {
      const mockData = createMockData({
        hearings: [
          {
            venue: "",
            judge: "",
            time: "",
            caseNumber: "CA-2026-000001",
            caseDetails: "",
            hearingType: "",
            additionalInformation: ""
          }
        ]
      });
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain("CA-2026-000001");
      expect(html).toContain('<td class="govuk-table__cell"></td>');
    });

    it("should render data source provenance", () => {
      const mockData = createMockData({ dataSource: "CPP" });
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain(en.common.dataSource);
      expect(html).toContain("CPP");
    });

    it("should render back to top link", () => {
      const mockData = createMockData();
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain(en.common.backToTop);
      expect(html).toContain('href="#top"');
    });

    it("should render with Welsh locale content", () => {
      const mockData = createMockData({
        listContent: cy.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST,
        common: cy.common,
        header: {
          listTitle: cy.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.pageTitle,
          listDate: "10 Gorffennaf 2026",
          lastUpdatedDate: "9 Gorffennaf 2026",
          lastUpdatedTime: "4:30pm"
        }
      });
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain("Swyddfa Costau");
      expect(html).toContain("Llysoedd Barn Brenhinol");
      expect(html).toContain(cy.common.importantInfoTitle);
      expect(html).toContain(cy.common.searchCasesTitle);
      expect(html).toContain(cy.common.tableHeaders.venue);
      expect(html).toContain(cy.common.backToTop);
    });

    it("should have accessible search input with aria-label", () => {
      const mockData = createMockData();
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain('aria-label="' + en.common.searchCasesLabel + '"');
      expect(html).toContain('class="govuk-visually-hidden"');
    });

    it("should have accessible table with role and aria-label", () => {
      const mockData = createMockData();
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain('role="table"');
      expect(html).toContain('aria-label="' + mockData.header.listTitle + '"');
    });

    it("should render with different data source values", () => {
      const dataSources = [
        { source: "Manual Upload", expected: "Manual Upload" },
        { source: "CPP", expected: "CPP" },
        { source: "P&I", expected: "P&amp;I" }
      ];

      dataSources.forEach(({ source, expected }) => {
        const mockData = createMockData({ dataSource: source });
        const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

        expect(html).toContain(expected);
      });
    });

    it("should render details component with open attribute", () => {
      const mockData = createMockData();
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain("govuk-details");
      expect(html).toContain("open");
    });

    it("should have proper heading hierarchy with h1", () => {
      const mockData = createMockData();
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain('<h1 class="govuk-heading-l"');
      expect(html).toContain('id="top"');
    });

    it("should render search heading as h2", () => {
      const mockData = createMockData();
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain('<h2 class="govuk-heading-s">' + en.common.searchCasesTitle);
    });

    it("should render with very long case details text", () => {
      const longText = "A".repeat(500);
      const mockData = createMockData({
        hearings: [
          {
            venue: "Court Room 1",
            judge: "Master Smith",
            time: "10:00",
            caseNumber: "CA-2026-000001",
            caseDetails: longText,
            hearingType: "Assessment",
            additionalInformation: "Note"
          }
        ]
      });
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain(longText);
    });

    it("should render with special characters in hearing data", () => {
      const mockData = createMockData({
        hearings: [
          {
            venue: "Court Room 1 & 2",
            judge: "Master O'Brien",
            time: "10:00",
            caseNumber: "CA-2026-000001",
            caseDetails: "Smith v Jones & Co <Ltd>",
            hearingType: 'Assessment "Final"',
            additionalInformation: "Remote - via MS Teams"
          }
        ]
      });
      const html = env.render("senior-courts-costs-office-daily-cause-list.njk", mockData);

      expect(html).toContain("Court Room 1 &amp; 2");
      expect(html).toContain("Master O&#39;Brien");
      expect(html).toContain("Smith v Jones &amp; Co &lt;Ltd&gt;");
    });
  });

  describe("Template data contract", () => {
    it("should document required template variables", () => {
      const templateContract = {
        description: "Senior Courts Costs Office Daily Cause List template requires the following variables",
        variables: {
          listContent: {
            type: "object",
            description: "Locale-specific content for SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST",
            properties: {
              locationLine1: { type: "string", example: "Royal Courts of Justice" },
              locationLine2: { type: "string", example: "Strand, London" },
              locationLine3: { type: "string", example: "WC2A 2LL" },
              importantInfoText: { type: "string", description: "Multi-paragraph text with \\n\\n separators" },
              moreInfoLinkText: { type: "string", example: "For more information, please visit" },
              moreInfoLinkUrl: {
                type: "string",
                example: "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing"
              }
            },
            required: true
          },
          common: {
            type: "object",
            description: "Common locale-specific content shared across list types",
            properties: {
              factLinkText: { type: "string" },
              factLinkUrl: { type: "string" },
              factAdditionalText: { type: "string" },
              importantInfoTitle: { type: "string" },
              searchCasesTitle: { type: "string" },
              searchCasesLabel: { type: "string" },
              tableHeaders: {
                type: "object",
                properties: {
                  venue: { type: "string" },
                  judge: { type: "string" },
                  time: { type: "string" },
                  caseNumber: { type: "string" },
                  caseDetails: { type: "string" },
                  hearingType: { type: "string" },
                  additionalInformation: { type: "string" }
                }
              },
              dataSource: { type: "string" },
              backToTop: { type: "string" },
              listFor: { type: "string" },
              lastUpdated: { type: "string" },
              at: { type: "string" }
            },
            required: true
          },
          header: {
            type: "object",
            properties: {
              listTitle: { type: "string", example: "Senior Courts Costs Office Daily Cause List" },
              listDate: { type: "string", example: "10 July 2026" },
              lastUpdatedDate: { type: "string", example: "9 July 2026" },
              lastUpdatedTime: { type: "string", example: "4:30pm" }
            },
            required: true
          },
          hearings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                venue: { type: "string", example: "Court Room 1" },
                judge: { type: "string", example: "Master Smith" },
                time: { type: "string", example: "10:00" },
                caseNumber: { type: "string", example: "CA-2026-000001" },
                caseDetails: { type: "string", example: "Smith v Jones" },
                hearingType: { type: "string", example: "Detailed Assessment" },
                additionalInformation: { type: "string", example: "Remote hearing" }
              }
            },
            description: "Array of StandardHearing objects",
            required: true
          },
          dataSource: {
            type: "string",
            description: "Provenance label for data source",
            example: "CPP"
          }
        },
        conditionalLogic: {
          importantInfoText: "Multi-paragraph text split by \\n\\n is rendered as separate <p> elements via .split() in template",
          additionalInformation: "Can be empty string, still rendered in table cell",
          emptyFields: "All hearing fields can be empty strings and are still rendered in table cells",
          detailsComponent: "Important information is rendered in govuk-details component with open=true",
          accessibility: "Search input has aria-label, table has role and aria-label attributes"
        }
      };

      expect(templateContract.description).toBeDefined();
      expect(templateContract.variables).toBeDefined();
      expect(templateContract.conditionalLogic).toBeDefined();
    });
  });
});
