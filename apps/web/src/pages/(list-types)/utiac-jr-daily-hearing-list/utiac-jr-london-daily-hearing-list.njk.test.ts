import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "@hmcts/test-support";
import { londonTableHeaders, londonTableHeadersCy, utiacJrDailyHearingListCy, utiacJrDailyHearingListEn } from "@hmcts/utiac-jr-daily-hearing-list";
import nunjucks from "nunjucks";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

describe("utiac-jr-london-daily-hearing-list.njk", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "utiac-jr-london-daily-hearing-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Locale content", () => {
    describe("English locale", () => {
      it("should have all required keys", () => {
        const requiredKeys = [
          "courtName",
          "listForDate",
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
          expect(utiacJrDailyHearingListEn).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(utiacJrDailyHearingListEn.courtName).toBe("Upper Tribunal (Immigration and Asylum) Chamber");
        expect(utiacJrDailyHearingListEn.listForDate).toBe("List for");
        expect(utiacJrDailyHearingListEn.lastUpdated).toBe("Last updated");
        expect(utiacJrDailyHearingListEn.at).toBe("at");
        expect(utiacJrDailyHearingListEn.searchCasesTitle).toBe("Search Cases");
        expect(utiacJrDailyHearingListEn.dataSource).toBe("Data source");
        expect(utiacJrDailyHearingListEn.backToTop).toBe("Back to top");
      });

      it("should have correct FACT link values", () => {
        expect(utiacJrDailyHearingListEn.factLinkText).toBe("Find contact details and other information about courts and tribunals");
        expect(utiacJrDailyHearingListEn.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(utiacJrDailyHearingListEn.factAdditionalText).toBe("in England and Wales, and some non-devolved tribunals in Scotland.");
      });

      it("should have correct important information values", () => {
        expect(utiacJrDailyHearingListEn.importantInformationTitle).toBe("Important information");
        expect(utiacJrDailyHearingListEn.importantInformationText).toContain("subject to change until 4:30pm");
        expect(utiacJrDailyHearingListEn.importantInformationLinkText).toBe(
          "Observe a court or tribunal hearing as a journalist, researcher or member of the public"
        );
        expect(utiacJrDailyHearingListEn.importantInformationLinkUrl).toBe("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
      });

      it("should have correct caution text values", () => {
        expect(utiacJrDailyHearingListEn.cautionNote).toContain("Special Category Data");
        expect(utiacJrDailyHearingListEn.cautionReporting).toContain("accurate reporting of court proceedings");
      });
    });

    describe("English London table headers", () => {
      it("should have all required table header keys", () => {
        const requiredHeaders = [
          "hearingTime",
          "caseTitle",
          "representative",
          "caseReferenceNumber",
          "judges",
          "hearingType",
          "location",
          "additionalInformation"
        ];

        requiredHeaders.forEach((header) => {
          expect(londonTableHeaders).toHaveProperty(header);
        });
      });

      it("should have correct table header labels", () => {
        expect(londonTableHeaders.hearingTime).toBe("Hearing time");
        expect(londonTableHeaders.caseTitle).toBe("Case title");
        expect(londonTableHeaders.representative).toBe("Representative");
        expect(londonTableHeaders.caseReferenceNumber).toBe("Case reference number");
        expect(londonTableHeaders.judges).toBe("Judge(s)");
        expect(londonTableHeaders.hearingType).toBe("Hearing type");
        expect(londonTableHeaders.location).toBe("Location");
        expect(londonTableHeaders.additionalInformation).toBe("Additional information");
      });
    });

    describe("Welsh locale", () => {
      it("should have all required keys", () => {
        const requiredKeys = [
          "courtName",
          "listForDate",
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
          expect(utiacJrDailyHearingListCy).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(utiacJrDailyHearingListCy.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(utiacJrDailyHearingListCy.at).toBe("am");
        expect(utiacJrDailyHearingListCy.searchCasesTitle).toBe("Chwilio Achosion");
        expect(utiacJrDailyHearingListCy.dataSource).toBe("Ffynhonnell data");
        expect(utiacJrDailyHearingListCy.backToTop).toBe("Yn ôl i frig y dudalen");
      });

      it("should have correct FACT link values", () => {
        expect(utiacJrDailyHearingListCy.factLinkText).toContain("Dod o hyd i fanylion cyswllt");
        expect(utiacJrDailyHearingListCy.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(utiacJrDailyHearingListCy.factAdditionalText).toContain("yn yr Alban");
      });

      it("should have correct important information values", () => {
        expect(utiacJrDailyHearingListCy.importantInformationTitle).toBe("Gwybodaeth bwysig");
        expect(utiacJrDailyHearingListCy.importantInformationLinkText).toContain("Arsylwi gwrandawiad llys");
        expect(utiacJrDailyHearingListCy.importantInformationLinkUrl).toBe("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
      });

      it("should have correct caution text values", () => {
        expect(utiacJrDailyHearingListCy.cautionNote).toContain("Data Categori Arbennig");
        expect(utiacJrDailyHearingListCy.cautionReporting).toContain("adroddiad manwl-gywir");
      });
    });

    describe("Welsh London table headers", () => {
      it("should have all required table header keys", () => {
        const requiredHeaders = [
          "hearingTime",
          "caseTitle",
          "representative",
          "caseReferenceNumber",
          "judges",
          "hearingType",
          "location",
          "additionalInformation"
        ];

        requiredHeaders.forEach((header) => {
          expect(londonTableHeadersCy).toHaveProperty(header);
        });
      });

      it("should have translated additional information header", () => {
        expect(londonTableHeadersCy.additionalInformation).toBe("Gwybodaeth ychwanegol");
      });
    });

    describe("Locale consistency", () => {
      it("should have same structure in English and Welsh", () => {
        expect(Object.keys(utiacJrDailyHearingListEn).sort()).toEqual(Object.keys(utiacJrDailyHearingListCy).sort());
      });

      it("should have same types for each key", () => {
        Object.keys(utiacJrDailyHearingListEn).forEach((key) => {
          const enType = typeof utiacJrDailyHearingListEn[key as keyof typeof utiacJrDailyHearingListEn];
          const cyType = typeof utiacJrDailyHearingListCy[key as keyof typeof utiacJrDailyHearingListCy];
          expect(enType).toBe(cyType);
        });
      });

      it("should have same structure in London table headers", () => {
        expect(Object.keys(londonTableHeaders).sort()).toEqual(Object.keys(londonTableHeadersCy).sort());
      });
    });
  });

  describe("Template rendering", () => {
    let env: nunjucks.Environment;

    function setup() {
      env = nunjucks.configure([__dirname, webCoreViews, govukFrontend], {
        autoescape: true,
        throwOnUndefined: false
      });
    }

    describe("with English content", () => {
      it("should render template with minimal data", () => {
        setup();

        const t = { ...utiacJrDailyHearingListEn, tableHeaders: londonTableHeaders };
        const templateData = {
          en: utiacJrDailyHearingListEn,
          cy: utiacJrDailyHearingListCy,
          t,
          header: {
            listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List",
            listForDate: "10 July 2026",
            lastUpdatedDate: "10 July 2026",
            lastUpdatedTime: "9:00am"
          },
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "utiac-jr-london-daily-hearing-list.njk", templateData);

        expect(html).toContain("Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List");
        expect(html).toContain("List for");
        expect(html).toContain("10 July 2026");
        expect(html).toContain("Last updated");
        expect(html).toContain("9:00am");
        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("Important information");
        expect(html).toContain("Search Cases");
        expect(html).toContain("Data source");
        expect(html).toContain("Manual Upload");
        expect(html).toContain("Back to top");
      });

      it("should render table headers correctly", () => {
        setup();

        const t = { ...utiacJrDailyHearingListEn, tableHeaders: londonTableHeaders };
        const templateData = {
          en: utiacJrDailyHearingListEn,
          cy: utiacJrDailyHearingListCy,
          t,
          header: {
            listTitle: "Test List",
            listForDate: "10 July 2026",
            lastUpdatedDate: "10 July 2026",
            lastUpdatedTime: "9:00am"
          },
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "utiac-jr-london-daily-hearing-list.njk", templateData);

        expect(html).toContain("Hearing time");
        expect(html).toContain("Case title");
        expect(html).toContain("Representative");
        expect(html).toContain("Case reference number");
        expect(html).toContain("Judge(s)");
        expect(html).toContain("Hearing type");
        expect(html).toContain("Location");
        expect(html).toContain("Additional information");
      });

      it("should render with single hearing", () => {
        setup();

        const t = { ...utiacJrDailyHearingListEn, tableHeaders: londonTableHeaders };
        const templateData = {
          en: utiacJrDailyHearingListEn,
          cy: utiacJrDailyHearingListCy,
          t,
          header: {
            listTitle: "Test List",
            listForDate: "10 July 2026",
            lastUpdatedDate: "10 July 2026",
            lastUpdatedTime: "9:00am"
          },
          hearings: [
            {
              hearingTime: "10:00am",
              caseTitle: "Smith v Secretary of State",
              representative: "J. Doe Solicitors",
              caseReferenceNumber: "JR/01234/2026",
              judges: "Upper Tribunal Judge Smith",
              hearingType: "Case Management Review",
              location: "Field House",
              additionalInformation: "Video hearing"
            }
          ],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "utiac-jr-london-daily-hearing-list.njk", templateData);

        expect(html).toContain("10:00am");
        expect(html).toContain("Smith v Secretary of State");
        expect(html).toContain("J. Doe Solicitors");
        expect(html).toContain("JR/01234/2026");
        expect(html).toContain("Upper Tribunal Judge Smith");
        expect(html).toContain("Case Management Review");
        expect(html).toContain("Field House");
        expect(html).toContain("Video hearing");
      });

      it("should render with multiple hearings", () => {
        setup();

        const t = { ...utiacJrDailyHearingListEn, tableHeaders: londonTableHeaders };
        const templateData = {
          en: utiacJrDailyHearingListEn,
          cy: utiacJrDailyHearingListCy,
          t,
          header: {
            listTitle: "Test List",
            listForDate: "10 July 2026",
            lastUpdatedDate: "10 July 2026",
            lastUpdatedTime: "9:00am"
          },
          hearings: [
            {
              hearingTime: "10:00am",
              caseTitle: "Smith v Secretary of State",
              representative: "J. Doe Solicitors",
              caseReferenceNumber: "JR/01234/2026",
              judges: "Upper Tribunal Judge Smith",
              hearingType: "Case Management Review",
              location: "Field House",
              additionalInformation: "Video hearing"
            },
            {
              hearingTime: "2:00pm",
              caseTitle: "Jones v Home Office",
              representative: "A. Lawyer Associates",
              caseReferenceNumber: "JR/56789/2026",
              judges: "Upper Tribunal Judge Jones",
              hearingType: "Substantive Hearing",
              location: "Taylor House",
              additionalInformation: "In person hearing"
            }
          ],
          dataSource: "XHIBIT"
        };

        const { html } = render(env, "utiac-jr-london-daily-hearing-list.njk", templateData);

        expect(html).toContain("10:00am");
        expect(html).toContain("Smith v Secretary of State");
        expect(html).toContain("JR/01234/2026");
        expect(html).toContain("2:00pm");
        expect(html).toContain("Jones v Home Office");
        expect(html).toContain("JR/56789/2026");
        expect(html).toContain("XHIBIT");
      });

      it("should render with empty optional fields", () => {
        setup();

        const t = { ...utiacJrDailyHearingListEn, tableHeaders: londonTableHeaders };
        const templateData = {
          en: utiacJrDailyHearingListEn,
          cy: utiacJrDailyHearingListCy,
          t,
          header: {
            listTitle: "Test List",
            listForDate: "10 July 2026",
            lastUpdatedDate: "10 July 2026",
            lastUpdatedTime: "9:00am"
          },
          hearings: [
            {
              hearingTime: "10:00am",
              caseTitle: "Smith v Secretary of State",
              representative: "",
              caseReferenceNumber: "JR/01234/2026",
              judges: "",
              hearingType: "Case Management Review",
              location: "",
              additionalInformation: ""
            }
          ],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "utiac-jr-london-daily-hearing-list.njk", templateData);

        expect(html).toContain("Smith v Secretary of State");
        expect(html).toContain("JR/01234/2026");
        expect(html).toContain("Case Management Review");
      });
    });

    describe("with Welsh content", () => {
      it("should render template with Welsh translations", () => {
        setup();

        const t = { ...utiacJrDailyHearingListCy, tableHeaders: londonTableHeadersCy };
        const templateData = {
          en: utiacJrDailyHearingListEn,
          cy: utiacJrDailyHearingListCy,
          t,
          header: {
            listTitle: "[WELSH TRANSLATION REQUIRED: 'Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List']",
            listForDate: "10 Gorffennaf 2026",
            lastUpdatedDate: "10 Gorffennaf 2026",
            lastUpdatedTime: "9:00am"
          },
          hearings: [],
          dataSource: "Llwytho â llaw"
        };

        const { html } = render(env, "utiac-jr-london-daily-hearing-list.njk", templateData);

        expect(html).toContain("Diweddarwyd ddiwethaf");
        expect(html).toContain("10 Gorffennaf 2026");
        expect(html).toContain("Gwybodaeth bwysig");
        expect(html).toContain("Chwilio Achosion");
        expect(html).toContain("Ffynhonnell data");
        expect(html).toContain("Llwytho â llaw");
        expect(html).toContain("Yn ôl i frig y dudalen");
      });

      it("should render Welsh table header for additional information", () => {
        setup();

        const t = { ...utiacJrDailyHearingListCy, tableHeaders: londonTableHeadersCy };
        const templateData = {
          en: utiacJrDailyHearingListEn,
          cy: utiacJrDailyHearingListCy,
          t,
          header: {
            listTitle: "Test List",
            listForDate: "10 Gorffennaf 2026",
            lastUpdatedDate: "10 Gorffennaf 2026",
            lastUpdatedTime: "9:00am"
          },
          hearings: [],
          dataSource: "Llwytho â llaw"
        };

        const { html } = render(env, "utiac-jr-london-daily-hearing-list.njk", templateData);

        expect(html).toContain("Gwybodaeth ychwanegol");
      });

      it("should render Welsh content with hearings", () => {
        setup();

        const t = { ...utiacJrDailyHearingListCy, tableHeaders: londonTableHeadersCy };
        const templateData = {
          en: utiacJrDailyHearingListEn,
          cy: utiacJrDailyHearingListCy,
          t,
          header: {
            listTitle: "Rhestr Prawf",
            listForDate: "10 Gorffennaf 2026",
            lastUpdatedDate: "10 Gorffennaf 2026",
            lastUpdatedTime: "9:00am"
          },
          hearings: [
            {
              hearingTime: "10:00am",
              caseTitle: "Smith v Secretary of State",
              representative: "J. Doe Solicitors",
              caseReferenceNumber: "JR/01234/2026",
              judges: "Upper Tribunal Judge Smith",
              hearingType: "Adolygiad Rheoli Achos",
              location: "Field House",
              additionalInformation: "Gwrandawiad fideo"
            }
          ],
          dataSource: "Llwytho â llaw"
        };

        const { html } = render(env, "utiac-jr-london-daily-hearing-list.njk", templateData);

        expect(html).toContain("10:00am");
        expect(html).toContain("Smith v Secretary of State");
        expect(html).toContain("JR/01234/2026");
        expect(html).toContain("Adolygiad Rheoli Achos");
        expect(html).toContain("Gwrandawiad fideo");
      });
    });

    describe("accessibility features", () => {
      it("should include skip link target", () => {
        setup();

        const t = { ...utiacJrDailyHearingListEn, tableHeaders: londonTableHeaders };
        const templateData = {
          en: utiacJrDailyHearingListEn,
          cy: utiacJrDailyHearingListCy,
          t,
          header: {
            listTitle: "Test List",
            listForDate: "10 July 2026",
            lastUpdatedDate: "10 July 2026",
            lastUpdatedTime: "9:00am"
          },
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "utiac-jr-london-daily-hearing-list.njk", templateData);

        expect(html).toContain('id="top"');
        expect(html).toContain('href="#top"');
      });

      it("should have aria-label on search input", () => {
        setup();

        const t = { ...utiacJrDailyHearingListEn, tableHeaders: londonTableHeaders };
        const templateData = {
          en: utiacJrDailyHearingListEn,
          cy: utiacJrDailyHearingListCy,
          t,
          header: {
            listTitle: "Test List",
            listForDate: "10 July 2026",
            lastUpdatedDate: "10 July 2026",
            lastUpdatedTime: "9:00am"
          },
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "utiac-jr-london-daily-hearing-list.njk", templateData);

        expect(html).toContain('aria-label="Search by case reference number, case title, judge, venue, or other details"');
        expect(html).toContain('id="case-search-input"');
      });

      it("should have aria-label on table", () => {
        setup();

        const t = { ...utiacJrDailyHearingListEn, tableHeaders: londonTableHeaders };
        const templateData = {
          en: utiacJrDailyHearingListEn,
          cy: utiacJrDailyHearingListCy,
          t,
          header: {
            listTitle: "Test List Title",
            listForDate: "10 July 2026",
            lastUpdatedDate: "10 July 2026",
            lastUpdatedTime: "9:00am"
          },
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "utiac-jr-london-daily-hearing-list.njk", templateData);

        expect(html).toContain('aria-label="Test List Title"');
      });

      it("should have proper table structure with thead and tbody", () => {
        setup();

        const t = { ...utiacJrDailyHearingListEn, tableHeaders: londonTableHeaders };
        const templateData = {
          en: utiacJrDailyHearingListEn,
          cy: utiacJrDailyHearingListCy,
          t,
          header: {
            listTitle: "Test List",
            listForDate: "10 July 2026",
            lastUpdatedDate: "10 July 2026",
            lastUpdatedTime: "9:00am"
          },
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "utiac-jr-london-daily-hearing-list.njk", templateData);

        expect(html).toContain('<thead class="govuk-table__head">');
        expect(html).toContain('<tbody class="govuk-table__body">');
        expect(html).toContain('scope="col"');
      });
    });

    describe("details component", () => {
      it("should render GOV.UK details component with important information", () => {
        setup();

        const t = { ...utiacJrDailyHearingListEn, tableHeaders: londonTableHeaders };
        const templateData = {
          en: utiacJrDailyHearingListEn,
          cy: utiacJrDailyHearingListCy,
          t,
          header: {
            listTitle: "Test List",
            listForDate: "10 July 2026",
            lastUpdatedDate: "10 July 2026",
            lastUpdatedTime: "9:00am"
          },
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "utiac-jr-london-daily-hearing-list.njk", templateData);

        expect(html).toContain('class="govuk-details');
        expect(html).toContain('data-module="govuk-details"');
        expect(html).toContain('class="govuk-details__summary"');
        expect(html).toContain('class="govuk-details__text"');
        expect(html).toContain("Important information");
        expect(html).toContain("subject to change until 4:30pm");
      });

      it("should include link to observe a hearing guidance", () => {
        setup();

        const t = { ...utiacJrDailyHearingListEn, tableHeaders: londonTableHeaders };
        const templateData = {
          en: utiacJrDailyHearingListEn,
          cy: utiacJrDailyHearingListCy,
          t,
          header: {
            listTitle: "Test List",
            listForDate: "10 July 2026",
            lastUpdatedDate: "10 July 2026",
            lastUpdatedTime: "9:00am"
          },
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "utiac-jr-london-daily-hearing-list.njk", templateData);

        expect(html).toContain("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener noreferrer"');
      });
    });

    describe("FACT link", () => {
      it("should render Find a Court or Tribunal link", () => {
        setup();

        const t = { ...utiacJrDailyHearingListEn, tableHeaders: londonTableHeaders };
        const templateData = {
          en: utiacJrDailyHearingListEn,
          cy: utiacJrDailyHearingListCy,
          t,
          header: {
            listTitle: "Test List",
            listForDate: "10 July 2026",
            lastUpdatedDate: "10 July 2026",
            lastUpdatedTime: "9:00am"
          },
          hearings: [],
          dataSource: "Manual Upload"
        };

        const { html } = render(env, "utiac-jr-london-daily-hearing-list.njk", templateData);

        expect(html).toContain("https://www.find-court-tribunal.service.gov.uk/");
        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("in England and Wales, and some non-devolved tribunals in Scotland.");
      });
    });
  });

  describe("Template data contract", () => {
    it("should document required template variables", () => {
      const templateContract = {
        description: "UTIAC JR London Daily Hearing List template requires the following variables",
        variables: {
          t: {
            type: "object",
            description: "Translation object with tableHeaders merged (utiacJrDailyHearingListEn/Cy + londonTableHeaders/Cy)",
            required: true
          },
          en: {
            type: "object",
            description: "English translations (utiacJrDailyHearingListEn)",
            required: true
          },
          cy: {
            type: "object",
            description: "Welsh translations (utiacJrDailyHearingListCy)",
            required: true
          },
          header: {
            type: "object",
            properties: {
              listTitle: { type: "string", example: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List" },
              listForDate: { type: "string", example: "10 July 2026" },
              lastUpdatedDate: { type: "string", example: "10 July 2026" },
              lastUpdatedTime: { type: "string", example: "9:00am" }
            },
            required: true
          },
          hearings: {
            type: "array",
            description: "Array of hearing objects",
            items: {
              hearingTime: { type: "string", example: "10:00am" },
              caseTitle: { type: "string", example: "Smith v Secretary of State" },
              representative: { type: "string", example: "J. Doe Solicitors" },
              caseReferenceNumber: { type: "string", example: "JR/01234/2026" },
              judges: { type: "string", example: "Upper Tribunal Judge Smith" },
              hearingType: { type: "string", example: "Case Management Review" },
              location: { type: "string", example: "Field House" },
              additionalInformation: { type: "string", example: "Video hearing" }
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
          emptyFields: "Empty strings are rendered as empty table cells",
          emptyHearings: "Empty hearings array results in table with headers only",
          searchInput: "Search input is always rendered regardless of hearings count",
          detailsComponent: "Important information details component is rendered open by default",
          backToTop: "Back to top link anchors to #top id on h1 heading"
        }
      };

      expect(templateContract.description).toBeDefined();
      expect(templateContract.variables).toBeDefined();
      expect(templateContract.conditionalLogic).toBeDefined();
    });
  });
});
