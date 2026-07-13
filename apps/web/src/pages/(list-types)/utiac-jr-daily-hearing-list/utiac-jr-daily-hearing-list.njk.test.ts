import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { utiacJrDailyHearingListCy, utiacJrDailyHearingListEn } from "@hmcts/utiac-jr-daily-hearing-list";
import nunjucks from "nunjucks";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

const env = nunjucks.configure([__dirname, webCoreViews, govukFrontend], {
  autoescape: true,
  noCache: true
});

describe("utiac-jr-daily-hearing-list.njk", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "utiac-jr-daily-hearing-list.njk");
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

      it("should have correct table header labels", () => {
        expect(utiacJrDailyHearingListEn.tableHeaders.venue).toBe("Venue");
        expect(utiacJrDailyHearingListEn.tableHeaders.judges).toBe("Judge(s)");
        expect(utiacJrDailyHearingListEn.tableHeaders.hearingTime).toBe("Hearing time");
        expect(utiacJrDailyHearingListEn.tableHeaders.caseReferenceNumber).toBe("Case reference number");
        expect(utiacJrDailyHearingListEn.tableHeaders.caseTitle).toBe("Case title");
        expect(utiacJrDailyHearingListEn.tableHeaders.hearingType).toBe("Hearing type");
        expect(utiacJrDailyHearingListEn.tableHeaders.additionalInformation).toBe("Additional information");
      });

      it("should have correct URL values", () => {
        expect(utiacJrDailyHearingListEn.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(utiacJrDailyHearingListEn.importantInformationLinkUrl).toBe("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
      });

      it("should have important information text", () => {
        expect(utiacJrDailyHearingListEn.importantInformationTitle).toBe("Important information");
        expect(utiacJrDailyHearingListEn.importantInformationText).toContain("subject to change until 4:30pm");
      });

      it("should have caution text for special category data", () => {
        expect(utiacJrDailyHearingListEn.cautionNote).toContain("Special Category Data");
        expect(utiacJrDailyHearingListEn.cautionReporting).toContain("reporting restrictions");
      });

      it("should have provenance labels", () => {
        expect(utiacJrDailyHearingListEn.provenanceLabels).toBeDefined();
        expect(typeof utiacJrDailyHearingListEn.provenanceLabels).toBe("object");
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

      it("should have correct table header labels", () => {
        expect(utiacJrDailyHearingListCy.tableHeaders.additionalInformation).toBe("Gwybodaeth ychwanegol");
      });

      it("should have correct URL values", () => {
        expect(utiacJrDailyHearingListCy.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(utiacJrDailyHearingListCy.importantInformationLinkUrl).toBe("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
      });

      it("should have important information text", () => {
        expect(utiacJrDailyHearingListCy.importantInformationTitle).toBe("Gwybodaeth bwysig");
        expect(utiacJrDailyHearingListCy.importantInformationLinkText).toContain("Arsylwi gwrandawiad");
      });

      it("should have caution text for special category data", () => {
        expect(utiacJrDailyHearingListCy.cautionNote).toContain("Data Categori Arbennig");
        expect(utiacJrDailyHearingListCy.cautionReporting).toContain("gyfyngiadau adrodd");
      });

      it("should have provenance labels", () => {
        expect(utiacJrDailyHearingListCy.provenanceLabels).toBeDefined();
        expect(typeof utiacJrDailyHearingListCy.provenanceLabels).toBe("object");
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

      it("should have same table header keys in both locales", () => {
        const enKeys = Object.keys(utiacJrDailyHearingListEn.tableHeaders).sort();
        const cyKeys = Object.keys(utiacJrDailyHearingListCy.tableHeaders).sort();
        expect(enKeys).toEqual(cyKeys);
      });
    });
  });

  describe("Template rendering", () => {
    const mockHeader = {
      listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List",
      listForDate: "15 January 2026",
      lastUpdatedDate: "15 January 2026",
      lastUpdatedTime: "09:30am"
    };

    const mockHearingFull = {
      venue: "Leeds Combined Court Centre",
      judges: "Upper Tribunal Judge Smith",
      hearingTime: "10:00",
      caseReferenceNumber: "JR/12345/2026",
      caseTitle: "Appellant v Respondent",
      hearingType: "Case Management Review Hearing",
      additionalInformation: "Video hearing"
    };

    const mockHearingMinimal = {
      venue: "Leeds Combined Court Centre",
      judges: "",
      hearingTime: "14:00",
      caseReferenceNumber: "JR/67890/2026",
      caseTitle: "Case Title",
      hearingType: "Hearing",
      additionalInformation: ""
    };

    const mockDataSource = "Manual Upload";

    describe("With multiple hearings", () => {
      it("should render template with full hearing data", () => {
        const html = env.render("utiac-jr-daily-hearing-list.njk", {
          t: utiacJrDailyHearingListEn,
          header: mockHeader,
          hearings: [mockHearingFull, mockHearingMinimal],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockHeader.listTitle);
        expect(html).toContain(mockHeader.listForDate);
        expect(html).toContain(mockHeader.lastUpdatedDate);
        expect(html).toContain(mockHeader.lastUpdatedTime);
        expect(html).toContain(mockHearingFull.venue);
        expect(html).toContain(mockHearingFull.judges);
        expect(html).toContain(mockHearingFull.hearingTime);
        expect(html).toContain(mockHearingFull.caseReferenceNumber);
        expect(html).toContain(mockHearingFull.caseTitle);
        expect(html).toContain(mockHearingFull.hearingType);
        expect(html).toContain(mockHearingFull.additionalInformation);
        expect(html).toContain(mockDataSource);
      });

      it("should render template with minimal hearing data", () => {
        const html = env.render("utiac-jr-daily-hearing-list.njk", {
          t: utiacJrDailyHearingListEn,
          header: mockHeader,
          hearings: [mockHearingMinimal],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockHearingMinimal.venue);
        expect(html).toContain(mockHearingMinimal.hearingTime);
        expect(html).toContain(mockHearingMinimal.caseReferenceNumber);
        expect(html).toContain(mockHearingMinimal.caseTitle);
        expect(html).toContain(mockHearingMinimal.hearingType);
      });

      it("should render correct number of table rows", () => {
        const html = env.render("utiac-jr-daily-hearing-list.njk", {
          t: utiacJrDailyHearingListEn,
          header: mockHeader,
          hearings: [mockHearingFull, mockHearingMinimal],
          dataSource: mockDataSource
        });

        const rowMatches = html.match(/<tr class="govuk-table__row">/g);
        expect(rowMatches?.length).toBe(3);
      });
    });

    describe("With empty hearings array", () => {
      it("should render template with no hearings", () => {
        const html = env.render("utiac-jr-daily-hearing-list.njk", {
          t: utiacJrDailyHearingListEn,
          header: mockHeader,
          hearings: [],
          dataSource: mockDataSource
        });

        expect(html).toContain(mockHeader.listTitle);
        expect(html).toContain("govuk-table");
        const rowMatches = html.match(/<tr class="govuk-table__row">/g);
        expect(rowMatches?.length).toBe(1);
      });
    });

    describe("Table headers rendering", () => {
      it("should render all table headers in correct order", () => {
        const html = env.render("utiac-jr-daily-hearing-list.njk", {
          t: utiacJrDailyHearingListEn,
          header: mockHeader,
          hearings: [mockHearingFull],
          dataSource: mockDataSource
        });

        expect(html).toContain(utiacJrDailyHearingListEn.tableHeaders.venue);
        expect(html).toContain(utiacJrDailyHearingListEn.tableHeaders.judges);
        expect(html).toContain(utiacJrDailyHearingListEn.tableHeaders.hearingTime);
        expect(html).toContain(utiacJrDailyHearingListEn.tableHeaders.caseReferenceNumber);
        expect(html).toContain(utiacJrDailyHearingListEn.tableHeaders.caseTitle);
        expect(html).toContain(utiacJrDailyHearingListEn.tableHeaders.hearingType);
        expect(html).toContain(utiacJrDailyHearingListEn.tableHeaders.additionalInformation);

        const venueIndex = html.indexOf(utiacJrDailyHearingListEn.tableHeaders.venue);
        const judgesIndex = html.indexOf(utiacJrDailyHearingListEn.tableHeaders.judges);
        const hearingTimeIndex = html.indexOf(utiacJrDailyHearingListEn.tableHeaders.hearingTime);
        const caseRefIndex = html.indexOf(utiacJrDailyHearingListEn.tableHeaders.caseReferenceNumber);

        expect(venueIndex).toBeLessThan(judgesIndex);
        expect(judgesIndex).toBeLessThan(hearingTimeIndex);
        expect(hearingTimeIndex).toBeLessThan(caseRefIndex);
      });
    });

    describe("Important information section", () => {
      it("should render important information details component", () => {
        const html = env.render("utiac-jr-daily-hearing-list.njk", {
          t: utiacJrDailyHearingListEn,
          header: mockHeader,
          hearings: [mockHearingFull],
          dataSource: mockDataSource
        });

        expect(html).toContain("govuk-details");
        expect(html).toContain(utiacJrDailyHearingListEn.importantInformationTitle);
        expect(html).toContain(utiacJrDailyHearingListEn.importantInformationText);
        expect(html).toContain(utiacJrDailyHearingListEn.importantInformationLinkText);
        expect(html).toContain(utiacJrDailyHearingListEn.importantInformationLinkUrl);
      });

      it("should render details component with open attribute", () => {
        const html = env.render("utiac-jr-daily-hearing-list.njk", {
          t: utiacJrDailyHearingListEn,
          header: mockHeader,
          hearings: [mockHearingFull],
          dataSource: mockDataSource
        });

        expect(html).toMatch(/<details[^>]*\sopen[>\s]/);
      });
    });

    describe("Search functionality", () => {
      it("should render search input with correct attributes", () => {
        const html = env.render("utiac-jr-daily-hearing-list.njk", {
          t: utiacJrDailyHearingListEn,
          header: mockHeader,
          hearings: [mockHearingFull],
          dataSource: mockDataSource
        });

        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('name="search"');
        expect(html).toContain('type="text"');
        expect(html).toContain(utiacJrDailyHearingListEn.searchCasesLabel);
      });
    });

    describe("Links and navigation", () => {
      it("should render FACT link correctly", () => {
        const html = env.render("utiac-jr-daily-hearing-list.njk", {
          t: utiacJrDailyHearingListEn,
          header: mockHeader,
          hearings: [mockHearingFull],
          dataSource: mockDataSource
        });

        expect(html).toContain(`href="${utiacJrDailyHearingListEn.factLinkUrl}"`);
        expect(html).toContain(utiacJrDailyHearingListEn.factLinkText);
        expect(html).toContain(utiacJrDailyHearingListEn.factAdditionalText);
      });

      it("should render back to top link", () => {
        const html = env.render("utiac-jr-daily-hearing-list.njk", {
          t: utiacJrDailyHearingListEn,
          header: mockHeader,
          hearings: [mockHearingFull],
          dataSource: mockDataSource
        });

        expect(html).toContain('href="#top"');
        expect(html).toContain(utiacJrDailyHearingListEn.backToTop);
      });

      it("should render top anchor", () => {
        const html = env.render("utiac-jr-daily-hearing-list.njk", {
          t: utiacJrDailyHearingListEn,
          header: mockHeader,
          hearings: [mockHearingFull],
          dataSource: mockDataSource
        });

        expect(html).toContain('id="top"');
      });
    });

    describe("Welsh translation rendering", () => {
      it("should render template with Welsh content", () => {
        const html = env.render("utiac-jr-daily-hearing-list.njk", {
          t: utiacJrDailyHearingListCy,
          header: mockHeader,
          hearings: [mockHearingFull],
          dataSource: mockDataSource
        });

        expect(html).toContain(utiacJrDailyHearingListCy.lastUpdated);
        expect(html).toContain(utiacJrDailyHearingListCy.at);
        expect(html).toContain(utiacJrDailyHearingListCy.searchCasesTitle);
        expect(html).toContain(utiacJrDailyHearingListCy.dataSource);
        expect(html).toContain(utiacJrDailyHearingListCy.backToTop);
        expect(html).toContain(utiacJrDailyHearingListCy.importantInformationTitle);
      });
    });

    describe("Data source rendering", () => {
      it("should render data source text", () => {
        const html = env.render("utiac-jr-daily-hearing-list.njk", {
          t: utiacJrDailyHearingListEn,
          header: mockHeader,
          hearings: [mockHearingFull],
          dataSource: mockDataSource
        });

        expect(html).toContain(`${utiacJrDailyHearingListEn.dataSource}: ${mockDataSource}`);
      });

      it("should render with different data sources", () => {
        const dataSources = ["Manual Upload", "Automated Import", "Court and Tribunal Hearings Service (CTHS)"];

        dataSources.forEach((source) => {
          const html = env.render("utiac-jr-daily-hearing-list.njk", {
            t: utiacJrDailyHearingListEn,
            header: mockHeader,
            hearings: [mockHearingFull],
            dataSource: source
          });

          expect(html).toContain(source);
        });
      });
    });

    describe("Accessibility attributes", () => {
      it("should render table with aria-label", () => {
        const html = env.render("utiac-jr-daily-hearing-list.njk", {
          t: utiacJrDailyHearingListEn,
          header: mockHeader,
          hearings: [mockHearingFull],
          dataSource: mockDataSource
        });

        expect(html).toContain('role="table"');
        expect(html).toContain(`aria-label="${mockHeader.listTitle}"`);
      });

      it("should render search input with aria-label", () => {
        const html = env.render("utiac-jr-daily-hearing-list.njk", {
          t: utiacJrDailyHearingListEn,
          header: mockHeader,
          hearings: [mockHearingFull],
          dataSource: mockDataSource
        });

        expect(html).toContain(`aria-label="${utiacJrDailyHearingListEn.searchCasesLabel}"`);
      });

      it("should render visually hidden label for search input", () => {
        const html = env.render("utiac-jr-daily-hearing-list.njk", {
          t: utiacJrDailyHearingListEn,
          header: mockHeader,
          hearings: [mockHearingFull],
          dataSource: mockDataSource
        });

        expect(html).toContain("govuk-visually-hidden");
      });
    });
  });

  describe("Template data contract", () => {
    it("should document required template variables", () => {
      const templateContract = {
        description: "UTIAC JR Daily Hearing List template requires the following variables",
        variables: {
          t: {
            type: "object",
            description: "Translation object (utiacJrDailyHearingListEn or utiacJrDailyHearingListCy)",
            required: true,
            properties: {
              courtName: { type: "string" },
              listForDate: { type: "string" },
              lastUpdated: { type: "string" },
              at: { type: "string" },
              factLinkText: { type: "string" },
              factLinkUrl: { type: "string" },
              factAdditionalText: { type: "string" },
              importantInformationTitle: { type: "string" },
              importantInformationText: { type: "string" },
              importantInformationLinkText: { type: "string" },
              importantInformationLinkUrl: { type: "string" },
              searchCasesTitle: { type: "string" },
              searchCasesLabel: { type: "string" },
              tableHeaders: {
                type: "object",
                properties: {
                  venue: { type: "string" },
                  judges: { type: "string" },
                  hearingTime: { type: "string" },
                  caseReferenceNumber: { type: "string" },
                  caseTitle: { type: "string" },
                  hearingType: { type: "string" },
                  additionalInformation: { type: "string" }
                }
              },
              dataSource: { type: "string" },
              backToTop: { type: "string" }
            }
          },
          header: {
            type: "object",
            description: "Header information for the list",
            required: true,
            properties: {
              listTitle: { type: "string", example: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List" },
              listForDate: { type: "string", example: "15 January 2026" },
              lastUpdatedDate: { type: "string", example: "15 January 2026" },
              lastUpdatedTime: { type: "string", example: "09:30am" }
            }
          },
          hearings: {
            type: "array",
            description: "Array of hearings for the day",
            required: true,
            items: {
              type: "object",
              properties: {
                venue: { type: "string", example: "Leeds Combined Court Centre" },
                judges: { type: "string", example: "Upper Tribunal Judge Smith" },
                hearingTime: { type: "string", example: "10:00" },
                caseReferenceNumber: { type: "string", example: "JR/12345/2026" },
                caseTitle: { type: "string", example: "Appellant v Respondent" },
                hearingType: { type: "string", example: "Case Management Review Hearing" },
                additionalInformation: { type: "string", example: "Video hearing" }
              }
            }
          },
          dataSource: {
            type: "string",
            description: "Provenance label for data source",
            example: "Manual Upload",
            required: true
          }
        },
        conditionalLogic: {
          emptyHearings: "When hearings array is empty, only table headers are rendered with no body rows",
          emptyFields: "Empty string fields (judges, additionalInformation) are rendered as empty table cells",
          searchInput: "Search input always rendered with visually hidden label",
          detailsComponent: "Important information details component rendered open by default",
          backToTop: "Back to top link always rendered at bottom of page",
          topAnchor: "Page heading has id='top' for back to top link navigation"
        }
      };

      expect(templateContract.description).toBeDefined();
      expect(templateContract.variables).toBeDefined();
      expect(templateContract.conditionalLogic).toBeDefined();
      expect(templateContract.variables.hearings.items.properties).toHaveProperty("venue");
      expect(templateContract.variables.hearings.items.properties).toHaveProperty("judges");
      expect(templateContract.variables.hearings.items.properties).toHaveProperty("hearingTime");
      expect(templateContract.variables.hearings.items.properties).toHaveProperty("caseReferenceNumber");
      expect(templateContract.variables.hearings.items.properties).toHaveProperty("caseTitle");
      expect(templateContract.variables.hearings.items.properties).toHaveProperty("hearingType");
      expect(templateContract.variables.hearings.items.properties).toHaveProperty("additionalInformation");
    });
  });
});
