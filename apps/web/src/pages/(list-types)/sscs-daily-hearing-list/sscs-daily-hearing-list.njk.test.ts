import path from "node:path";
import { fileURLToPath } from "node:url";
import { sscsDailyHearingListCy, sscsDailyHearingListEn } from "@hmcts/sscs-daily-hearing-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");

describe("sscs-daily-hearing-list.njk", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([__dirname, webCoreViews]);
  });

  describe("Locale content", () => {
    describe("English locale", () => {
      it("should have all required keys", () => {
        const requiredKeys = [
          "listForDate",
          "lastUpdated",
          "at",
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText",
          "importantInformationTitle",
          "importantInformationLinkUrl",
          "searchCasesTitle",
          "searchCasesLabel",
          "tableHeaders",
          "dataSource",
          "backToTop",
          "provenanceLabels"
        ];

        requiredKeys.forEach((key) => {
          expect(sscsDailyHearingListEn).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(sscsDailyHearingListEn.listForDate).toBe("List for");
        expect(sscsDailyHearingListEn.lastUpdated).toBe("Last updated");
        expect(sscsDailyHearingListEn.at).toBe("at");
        expect(sscsDailyHearingListEn.searchCasesTitle).toBe("Search Cases");
        expect(sscsDailyHearingListEn.dataSource).toBe("Data source");
        expect(sscsDailyHearingListEn.backToTop).toBe("Back to top");
      });

      it("should have correct table header labels", () => {
        expect(sscsDailyHearingListEn.tableHeaders.venue).toBe("Venue");
        expect(sscsDailyHearingListEn.tableHeaders.appealReferenceNumber).toBe("Appeal reference number");
        expect(sscsDailyHearingListEn.tableHeaders.hearingType).toBe("Hearing type");
        expect(sscsDailyHearingListEn.tableHeaders.appellant).toBe("Appellant");
        expect(sscsDailyHearingListEn.tableHeaders.courtroom).toBe("Courtroom");
        expect(sscsDailyHearingListEn.tableHeaders.hearingTime).toBe("Hearing time");
        expect(sscsDailyHearingListEn.tableHeaders.tribunal).toBe("Tribunal");
        expect(sscsDailyHearingListEn.tableHeaders.respondent).toBe("FTA/Respondent");
        expect(sscsDailyHearingListEn.tableHeaders.additionalInformation).toBe("Additional information");
      });

      it("should have FACT link details", () => {
        expect(sscsDailyHearingListEn.factLinkText).toBe("Find contact details and other information about courts and tribunals");
        expect(sscsDailyHearingListEn.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(sscsDailyHearingListEn.factAdditionalText).toBe("in England and Wales, and some non-devolved tribunals in Scotland.");
      });
    });

    describe("Welsh locale", () => {
      it("should have all required keys", () => {
        const requiredKeys = [
          "listForDate",
          "lastUpdated",
          "at",
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText",
          "importantInformationTitle",
          "importantInformationLinkUrl",
          "searchCasesTitle",
          "searchCasesLabel",
          "tableHeaders",
          "dataSource",
          "backToTop",
          "provenanceLabels"
        ];

        requiredKeys.forEach((key) => {
          expect(sscsDailyHearingListCy).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(sscsDailyHearingListCy.listForDate).toBe("Rhestr ar gyfer");
        expect(sscsDailyHearingListCy.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(sscsDailyHearingListCy.at).toBe("am");
        expect(sscsDailyHearingListCy.searchCasesTitle).toBe("Chwilio Achosion");
        expect(sscsDailyHearingListCy.dataSource).toBe("Ffynhonnell data");
        expect(sscsDailyHearingListCy.backToTop).toBe("Yn ôl i frig y dudalen");
      });

      it("should have correct table header labels", () => {
        expect(sscsDailyHearingListCy.tableHeaders.venue).toBe("Lleoliad");
        expect(sscsDailyHearingListCy.tableHeaders.appealReferenceNumber).toBe("Cyfeirnod Apêl");
        expect(sscsDailyHearingListCy.tableHeaders.hearingType).toBe("Math o Wrandawiad");
        expect(sscsDailyHearingListCy.tableHeaders.appellant).toBe("Apellydd");
        expect(sscsDailyHearingListCy.tableHeaders.courtroom).toBe("Ystafell y Llys");
        expect(sscsDailyHearingListCy.tableHeaders.hearingTime).toBe("Amser y Gwrandawiad");
        expect(sscsDailyHearingListCy.tableHeaders.tribunal).toBe("Tribiwnlys");
        expect(sscsDailyHearingListCy.tableHeaders.respondent).toBe("ATC/Ymatebydd");
        expect(sscsDailyHearingListCy.tableHeaders.additionalInformation).toBe("Gwybodaeth Ychwanegol");
      });
    });

    describe("Locale consistency", () => {
      it("should have same structure in English and Welsh", () => {
        expect(Object.keys(sscsDailyHearingListEn).sort()).toEqual(Object.keys(sscsDailyHearingListCy).sort());
      });

      it("should have same types for each key", () => {
        Object.keys(sscsDailyHearingListEn).forEach((key) => {
          const enType = typeof sscsDailyHearingListEn[key as keyof typeof sscsDailyHearingListEn];
          const cyType = typeof sscsDailyHearingListCy[key as keyof typeof sscsDailyHearingListCy];
          expect(enType).toBe(cyType);
        });
      });

      it("should have same tableHeaders structure", () => {
        expect(Object.keys(sscsDailyHearingListEn.tableHeaders).sort()).toEqual(Object.keys(sscsDailyHearingListCy.tableHeaders).sort());
      });
    });
  });

  describe("Template rendering", () => {
    const baseData = {
      t: sscsDailyHearingListEn,
      header: {
        listTitle: "Upper Tribunal (Immigration and Asylum) Chamber Hearing List",
        listDate: "15 January 2026",
        lastUpdatedDate: "14 January 2026",
        lastUpdatedTime: "12:00pm"
      },
      importantInformationText:
        "Open justice is a fundamental principle of our justice system.\nFor more information, please visit https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing",
      dataSource: "Manual Upload",
      hearings: []
    };

    describe("Header section", () => {
      it("should render page title", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain("Upper Tribunal (Immigration and Asylum) Chamber Hearing List");
        expect(html).toContain("govuk-heading-l");
        expect(html).toContain('id="top"');
      });

      it("should render FACT link", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("https://www.find-court-tribunal.service.gov.uk/");
        expect(html).toContain("in England and Wales, and some non-devolved tribunals in Scotland.");
      });

      it("should render list date", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain("List for");
        expect(html).toContain("15 January 2026");
      });

      it("should render last updated date and time", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain("Last updated");
        expect(html).toContain("14 January 2026");
        expect(html).toContain("at");
        expect(html).toContain("12:00pm");
      });
    });

    describe("Important information section", () => {
      it("should render important information details element", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain("Important information");
        expect(html).toContain("govuk-details");
      });

      it("should render important information text with line breaks", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain("Open justice is a fundamental principle of our justice system.");
      });

      it("should render important information link as clickable", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener noreferrer"');
      });

      it("should skip empty lines in important information", () => {
        const dataWithEmptyLines = {
          ...baseData,
          importantInformationText: "First line\n\nThird line"
        };

        const { html } = render(env, "sscs-daily-hearing-list.njk", dataWithEmptyLines);
        expect(html).toContain("First line");
        expect(html).toContain("Third line");
      });

      it("should be open by default", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toMatch(/<details[^>]*\sopen/);
      });
    });

    describe("Search section", () => {
      it("should render search input", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain("Search Cases");
        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('type="text"');
      });

      it("should have accessible search label", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain('aria-label="Search by appeal reference, hearing type, appellant, or other details"');
        expect(html).toContain("govuk-visually-hidden");
      });

      it("should have correct input width", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain("govuk-!-width-one-half");
      });
    });

    describe("Hearings table", () => {
      it("should render table with correct headers", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain("Venue");
        expect(html).toContain("Appeal reference number");
        expect(html).toContain("Hearing type");
        expect(html).toContain("Appellant");
        expect(html).toContain("Courtroom");
        expect(html).toContain("Hearing time");
        expect(html).toContain("Tribunal");
        expect(html).toContain("FTA/Respondent");
        expect(html).toContain("Additional information");
      });

      it("should render table with accessible attributes", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain('role="table"');
        expect(html).toContain('aria-label="Upper Tribunal (Immigration and Asylum) Chamber Hearing List"');
        expect(html).toContain('id="hearings-table"');
      });

      it("should render empty table body when no hearings", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain("govuk-table__body");
        expect(html).toContain('id="hearings-table-container"');
      });
    });

    describe("Hearings data", () => {
      it("should render single hearing with all fields", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              venue: "Birmingham",
              appealReferenceNumber: "SC123/45/67890",
              hearingType: "Final Hearing",
              appellant: "John Smith",
              courtroom: "Court 1",
              hearingTime: "10:00am",
              tribunal: "Judge A Smith",
              respondent: "HMRC",
              additionalInformation: "Video hearing"
            }
          ]
        };

        const { html } = render(env, "sscs-daily-hearing-list.njk", data);
        expect(html).toContain("Birmingham");
        expect(html).toContain("SC123/45/67890");
        expect(html).toContain("Final Hearing");
        expect(html).toContain("John Smith");
        expect(html).toContain("Court 1");
        expect(html).toContain("10:00am");
        expect(html).toContain("Judge A Smith");
        expect(html).toContain("HMRC");
        expect(html).toContain("Video hearing");
      });

      it("should render multiple hearings", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              venue: "Birmingham",
              appealReferenceNumber: "SC123/45/67890",
              hearingType: "Final Hearing",
              appellant: "John Smith",
              courtroom: "Court 1",
              hearingTime: "10:00am",
              tribunal: "Judge A Smith",
              respondent: "HMRC",
              additionalInformation: "Video hearing"
            },
            {
              venue: "London",
              appealReferenceNumber: "SC987/65/43210",
              hearingType: "Preliminary Hearing",
              appellant: "Jane Doe",
              courtroom: "Court 2",
              hearingTime: "2:00pm",
              tribunal: "Judge B Jones",
              respondent: "DWP",
              additionalInformation: "In person"
            }
          ]
        };

        const { html } = render(env, "sscs-daily-hearing-list.njk", data);
        expect(html).toContain("SC123/45/67890");
        expect(html).toContain("John Smith");
        expect(html).toContain("SC987/65/43210");
        expect(html).toContain("Jane Doe");
      });

      it("should render hearing with empty optional fields", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              venue: "Birmingham",
              appealReferenceNumber: "SC123/45/67890",
              hearingType: "",
              appellant: "John Smith",
              courtroom: "",
              hearingTime: "10:00am",
              tribunal: "",
              respondent: "",
              additionalInformation: ""
            }
          ]
        };

        const { html } = render(env, "sscs-daily-hearing-list.njk", data);
        expect(html).toContain("Birmingham");
        expect(html).toContain("SC123/45/67890");
        expect(html).toContain("John Smith");
        expect(html).toContain("10:00am");
      });

      it("should preserve tribunal text formatting with new-line-wrap class", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              venue: "Birmingham",
              appealReferenceNumber: "SC123/45/67890",
              hearingType: "Final Hearing",
              appellant: "John Smith",
              courtroom: "Court 1",
              hearingTime: "10:00am",
              tribunal: "Judge A Smith\nJudge B Jones",
              respondent: "HMRC",
              additionalInformation: ""
            }
          ]
        };

        const { html } = render(env, "sscs-daily-hearing-list.njk", data);
        expect(html).toContain("new-line-wrap");
        expect(html).toContain("Judge A Smith\nJudge B Jones");
      });
    });

    describe("Footer section", () => {
      it("should render data source", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain("Data source");
        expect(html).toContain("Manual Upload");
      });

      it("should render back to top link", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain("Back to top");
        expect(html).toContain('href="#top"');
      });

      it("should have correct styling for back to top", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain("back-to-top");
      });
    });

    describe("Custom styles", () => {
      it("should include custom CSS for back-to-top", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain(".back-to-top");
        expect(html).toContain("margin-top: 40px");
      });

      it("should include custom CSS for new-line-wrap", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain(".new-line-wrap");
        expect(html).toContain("white-space: pre");
      });
    });

    describe("Welsh rendering", () => {
      it("should render with Welsh locale", () => {
        const welshData = {
          ...baseData,
          t: sscsDailyHearingListCy
        };

        const { html } = render(env, "sscs-daily-hearing-list.njk", welshData);
        expect(html).toContain("Rhestr ar gyfer");
        expect(html).toContain("Diweddarwyd ddiwethaf");
        expect(html).toContain("am");
        expect(html).toContain("Gwybodaeth bwysig");
        expect(html).toContain("Chwilio Achosion");
      });

      it("should render Welsh table headers", () => {
        const welshData = {
          ...baseData,
          t: sscsDailyHearingListCy
        };

        const { html } = render(env, "sscs-daily-hearing-list.njk", welshData);
        expect(html).toContain("Lleoliad");
        expect(html).toContain("Cyfeirnod Apêl");
        expect(html).toContain("Math o Wrandawiad");
        expect(html).toContain("Apellydd");
        expect(html).toContain("Ystafell y Llys");
        expect(html).toContain("Amser y Gwrandawiad");
        expect(html).toContain("Tribiwnlys");
        expect(html).toContain("ATC/Ymatebydd");
        expect(html).toContain("Gwybodaeth Ychwanegol");
      });

      it("should render Welsh FACT link", () => {
        const welshData = {
          ...baseData,
          t: sscsDailyHearingListCy
        };

        const { html } = render(env, "sscs-daily-hearing-list.njk", welshData);
        expect(html).toContain("Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd yng Nghymru a Lloegr");
        expect(html).toContain("a rhai tribiwnlysoedd heb eu datganoli yn yr Alban.");
      });

      it("should render Welsh footer", () => {
        const welshData = {
          ...baseData,
          t: sscsDailyHearingListCy
        };

        const { html } = render(env, "sscs-daily-hearing-list.njk", welshData);
        expect(html).toContain("Ffynhonnell data");
        expect(html).toContain("Yn ôl i frig y dudalen");
      });
    });

    describe("Layout and structure", () => {
      it("should use full-width column", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain("govuk-grid-column-full");
      });

      it("should use base template", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain("govuk-grid-row");
      });

      it("should have proper spacing classes", () => {
        const { html } = render(env, "sscs-daily-hearing-list.njk", baseData);
        expect(html).toContain("govuk-!-font-weight-bold");
        expect(html).toContain("govuk-!-margin-bottom-1");
        expect(html).toContain("govuk-!-margin-top-6");
      });
    });
  });
});
