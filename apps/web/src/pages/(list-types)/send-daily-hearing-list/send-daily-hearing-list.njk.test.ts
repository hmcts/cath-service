import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendDailyHearingListCy, sendDailyHearingListEn } from "@hmcts/send-daily-hearing-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

describe("send-daily-hearing-list.njk", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = nunjucks.configure([__dirname, webCoreViews, govukFrontend], {
      autoescape: true,
      noCache: true
    });
  });

  describe("Locale content", () => {
    describe("English locale", () => {
      it("should have all required keys", () => {
        const requiredKeys = [
          "pageTitle",
          "listForDate",
          "lastUpdated",
          "at",
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText",
          "importantInformationTitle",
          "importantInformationParagraphs",
          "searchCasesTitle",
          "searchCasesLabel",
          "tableHeaders",
          "dataSource",
          "backToTop",
          "provenanceLabels"
        ];

        requiredKeys.forEach((key) => {
          expect(sendDailyHearingListEn).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(sendDailyHearingListEn.pageTitle).toBe("First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List");
        expect(sendDailyHearingListEn.listForDate).toBe("List for");
        expect(sendDailyHearingListEn.lastUpdated).toBe("Last updated");
        expect(sendDailyHearingListEn.at).toBe("at");
        expect(sendDailyHearingListEn.searchCasesTitle).toBe("Search Cases");
        expect(sendDailyHearingListEn.dataSource).toBe("Data source");
        expect(sendDailyHearingListEn.backToTop).toBe("Back to top");
      });

      it("should have correct table header labels", () => {
        expect(sendDailyHearingListEn.tableHeaders.time).toBe("Time");
        expect(sendDailyHearingListEn.tableHeaders.caseReferenceNumber).toBe("Case reference number");
        expect(sendDailyHearingListEn.tableHeaders.respondent).toBe("Respondent");
        expect(sendDailyHearingListEn.tableHeaders.hearingType).toBe("Hearing type");
        expect(sendDailyHearingListEn.tableHeaders.venue).toBe("Venue");
        expect(sendDailyHearingListEn.tableHeaders.timeEstimate).toBe("Time estimate");
      });

      it("should have importantInformationParagraphs array", () => {
        expect(Array.isArray(sendDailyHearingListEn.importantInformationParagraphs)).toBe(true);
        expect(sendDailyHearingListEn.importantInformationParagraphs.length).toBeGreaterThan(0);
      });

      it("should have FACT link URL", () => {
        expect(sendDailyHearingListEn.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
      });
    });

    describe("Welsh locale", () => {
      it("should have all required keys", () => {
        const requiredKeys = [
          "pageTitle",
          "listForDate",
          "lastUpdated",
          "at",
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText",
          "importantInformationTitle",
          "importantInformationParagraphs",
          "searchCasesTitle",
          "searchCasesLabel",
          "tableHeaders",
          "dataSource",
          "backToTop",
          "provenanceLabels"
        ];

        requiredKeys.forEach((key) => {
          expect(sendDailyHearingListCy).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(sendDailyHearingListCy.pageTitle).toBe("Rhestr o Wrandawiadau Dyddiol y Tribiwnlys Haen Gyntaf (Anghenion Addysgol Arbennig ac Anabledd)");
        expect(sendDailyHearingListCy.listForDate).toBe("Rhestr ar gyfer");
        expect(sendDailyHearingListCy.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(sendDailyHearingListCy.at).toBe("am");
        expect(sendDailyHearingListCy.searchCasesTitle).toBe("Chwilio achosion");
        expect(sendDailyHearingListCy.dataSource).toBe("Ffynhonnell Data");
        expect(sendDailyHearingListCy.backToTop).toBe("Yn ôl i frig y dudalen");
      });

      it("should have correct table header labels", () => {
        expect(sendDailyHearingListCy.tableHeaders.time).toBe("Amser");
        expect(sendDailyHearingListCy.tableHeaders.caseReferenceNumber).toBe("Cyfeirnod yr achos");
        expect(sendDailyHearingListCy.tableHeaders.respondent).toBe("Atebydd");
        expect(sendDailyHearingListCy.tableHeaders.hearingType).toBe("Math o wrandawiad");
        expect(sendDailyHearingListCy.tableHeaders.venue).toBe("Lleoliad");
        expect(sendDailyHearingListCy.tableHeaders.timeEstimate).toBe("Amcangyfrif o'r amser");
      });

      it("should have importantInformationParagraphs array", () => {
        expect(Array.isArray(sendDailyHearingListCy.importantInformationParagraphs)).toBe(true);
        expect(sendDailyHearingListCy.importantInformationParagraphs.length).toBeGreaterThan(0);
      });
    });

    describe("Locale consistency", () => {
      it("should have same structure in English and Welsh", () => {
        expect(Object.keys(sendDailyHearingListEn).sort()).toEqual(Object.keys(sendDailyHearingListCy).sort());
      });

      it("should have same types for each key", () => {
        Object.keys(sendDailyHearingListEn).forEach((key) => {
          const enType = typeof sendDailyHearingListEn[key as keyof typeof sendDailyHearingListEn];
          const cyType = typeof sendDailyHearingListCy[key as keyof typeof sendDailyHearingListCy];
          expect(enType).toBe(cyType);
        });
      });

      it("should have same number of paragraphs in important information", () => {
        expect(sendDailyHearingListEn.importantInformationParagraphs.length).toBe(sendDailyHearingListCy.importantInformationParagraphs.length);
      });

      it("should have same table header keys", () => {
        expect(Object.keys(sendDailyHearingListEn.tableHeaders).sort()).toEqual(Object.keys(sendDailyHearingListCy.tableHeaders).sort());
      });
    });
  });

  describe("Template rendering", () => {
    const baseData = {
      t: sendDailyHearingListEn,
      header: {
        listTitle: "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List",
        listForDate: "15 January 2026",
        lastUpdatedDate: "14 January 2026",
        lastUpdatedTime: "12:00pm"
      },
      hearings: [],
      dataSource: "Manual Upload"
    };

    describe("Header section", () => {
      it("should render page title", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain("First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List");
        expect(html).toContain('id="top"');
      });

      it("should render FACT link", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("https://www.find-court-tribunal.service.gov.uk/");
        expect(html).toContain("in England and Wales, and some non-devolved tribunals in Scotland.");
      });

      it("should render list for date", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain("List for");
        expect(html).toContain("15 January 2026");
      });

      it("should render last updated date and time", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain("Last updated");
        expect(html).toContain("14 January 2026");
        expect(html).toContain("at");
        expect(html).toContain("12:00pm");
      });
    });

    describe("Important information section", () => {
      it("should render important information details element", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain("Important information");
        expect(html).toContain("govuk-details");
      });

      it("should render details with open attribute", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain("open");
      });

      it("should render all important information paragraphs", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);

        sendDailyHearingListEn.importantInformationParagraphs.forEach((paragraph) => {
          expect(html).toContain(paragraph);
        });
      });

      it("should render SEND email address in important information", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain("send@justice.gov.uk");
      });
    });

    describe("Search section", () => {
      it("should render search input", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain("Search Cases");
        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('type="text"');
      });

      it("should render search input with aria-label", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain('aria-label="Search by case reference, respondent, venue, or other details"');
      });

      it("should render search label as visually hidden", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain("govuk-visually-hidden");
      });
    });

    describe("Hearings table", () => {
      it("should render table with hearings-table id", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain('id="hearings-table"');
      });

      it("should render table with role attribute", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain('role="table"');
      });

      it("should render table headers", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain("Time");
        expect(html).toContain("Case reference number");
        expect(html).toContain("Respondent");
        expect(html).toContain("Hearing type");
        expect(html).toContain("Venue");
        expect(html).toContain("Time estimate");
      });

      it("should render empty table when no hearings", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain("govuk-table__body");
      });
    });

    describe("Hearings data", () => {
      it("should render hearing with all fields populated", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              time: "10:00am",
              caseReferenceNumber: "SEND/2026/001",
              respondent: "Sample Local Authority",
              hearingType: "Final Hearing",
              venue: "Video Hearing",
              timeEstimate: "2 hours"
            }
          ]
        };

        const html = env.render("send-daily-hearing-list.njk", data);
        expect(html).toContain("10:00am");
        expect(html).toContain("SEND/2026/001");
        expect(html).toContain("Sample Local Authority");
        expect(html).toContain("Final Hearing");
        expect(html).toContain("Video Hearing");
        expect(html).toContain("2 hours");
      });

      it("should render multiple hearings", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              time: "10:00am",
              caseReferenceNumber: "SEND/2026/001",
              respondent: "First Authority",
              hearingType: "Preliminary Hearing",
              venue: "In Person",
              timeEstimate: "1 hour"
            },
            {
              time: "2:00pm",
              caseReferenceNumber: "SEND/2026/002",
              respondent: "Second Authority",
              hearingType: "Final Hearing",
              venue: "Video Hearing",
              timeEstimate: "3 hours"
            }
          ]
        };

        const html = env.render("send-daily-hearing-list.njk", data);
        expect(html).toContain("SEND/2026/001");
        expect(html).toContain("First Authority");
        expect(html).toContain("SEND/2026/002");
        expect(html).toContain("Second Authority");
      });

      it("should render hearing with empty time estimate", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              time: "10:00am",
              caseReferenceNumber: "SEND/2026/001",
              respondent: "Sample Authority",
              hearingType: "Hearing",
              venue: "In Person",
              timeEstimate: ""
            }
          ]
        };

        const html = env.render("send-daily-hearing-list.njk", data);
        expect(html).toContain("SEND/2026/001");
        expect(html).toContain("Sample Authority");
      });

      it("should render hearing with long respondent name", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              time: "10:00am",
              caseReferenceNumber: "SEND/2026/001",
              respondent: "Very Long Local Authority Name For Testing Purposes",
              hearingType: "Final Hearing",
              venue: "Video Hearing",
              timeEstimate: "2 hours"
            }
          ]
        };

        const html = env.render("send-daily-hearing-list.njk", data);
        expect(html).toContain("Very Long Local Authority Name For Testing Purposes");
      });

      it("should handle special characters in case data", () => {
        const data = {
          ...baseData,
          hearings: [
            {
              time: "10:00am",
              caseReferenceNumber: "SEND/2026/001",
              respondent: "Authority & Partner",
              hearingType: "Pre-hearing Review",
              venue: "Room 1 - Building A",
              timeEstimate: "1.5 hours"
            }
          ]
        };

        const html = env.render("send-daily-hearing-list.njk", data);
        expect(html).toContain("Authority &amp; Partner");
        expect(html).toContain("Room 1 - Building A");
      });
    });

    describe("Footer section", () => {
      it("should render data source label and value", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain("Data source");
        expect(html).toContain("Manual Upload");
      });

      it("should render data source with govuk-body-s class", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain("govuk-body-s");
      });

      it("should render back to top link", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain("Back to top");
        expect(html).toContain('href="#top"');
      });

      it("should render back to top with correct CSS class", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain("back-to-top");
      });
    });

    describe("Data source variations", () => {
      it("should render with P&I data source", () => {
        const data = {
          ...baseData,
          dataSource: "P&I"
        };

        const html = env.render("send-daily-hearing-list.njk", data);
        expect(html).toContain("P&amp;I");
      });

      it("should render with empty data source", () => {
        const data = {
          ...baseData,
          dataSource: ""
        };

        const html = env.render("send-daily-hearing-list.njk", data);
        expect(html).toContain("Data source");
      });

      it("should render with long data source name", () => {
        const data = {
          ...baseData,
          dataSource: "Publications and Information Directorate"
        };

        const html = env.render("send-daily-hearing-list.njk", data);
        expect(html).toContain("Publications and Information Directorate");
      });
    });

    describe("Welsh rendering", () => {
      it("should render with Welsh locale", () => {
        const welshData = {
          ...baseData,
          t: sendDailyHearingListCy,
          header: {
            listTitle: "Rhestr o Wrandawiadau Dyddiol y Tribiwnlys Haen Gyntaf (Anghenion Addysgol Arbennig ac Anabledd)",
            listForDate: "15 Ionawr 2026",
            lastUpdatedDate: "14 Ionawr 2026",
            lastUpdatedTime: "12:00yp"
          }
        };

        const html = env.render("send-daily-hearing-list.njk", welshData);
        expect(html).toContain("Rhestr o Wrandawiadau Dyddiol y Tribiwnlys Haen Gyntaf (Anghenion Addysgol Arbennig ac Anabledd)");
        expect(html).toContain("Rhestr ar gyfer");
        expect(html).toContain("Diweddarwyd ddiwethaf");
        expect(html).toContain("Gwybodaeth bwysig");
      });

      it("should render Welsh table headers", () => {
        const welshData = {
          ...baseData,
          t: sendDailyHearingListCy,
          header: {
            listTitle: "Rhestr",
            listForDate: "15 Ionawr 2026",
            lastUpdatedDate: "14 Ionawr 2026",
            lastUpdatedTime: "12:00yp"
          },
          hearings: [
            {
              time: "10:00am",
              caseReferenceNumber: "SEND/2026/001",
              respondent: "Awdurdod Lleol Enghreifftiol",
              hearingType: "Gwrandawiad Terfynol",
              venue: "Gwrandawiad Fideo",
              timeEstimate: "2 awr"
            }
          ]
        };

        const html = env.render("send-daily-hearing-list.njk", welshData);
        expect(html).toContain("Amser");
        expect(html).toContain("Cyfeirnod yr achos");
        expect(html).toContain("Atebydd");
        expect(html).toContain("Math o wrandawiad");
        expect(html).toContain("Lleoliad");
        expect(html).toContain("Amcangyfrif o&#39;r amser");
      });

      it("should render Welsh search section", () => {
        const welshData = {
          ...baseData,
          t: sendDailyHearingListCy,
          header: {
            listTitle: "Rhestr",
            listForDate: "15 Ionawr 2026",
            lastUpdatedDate: "14 Ionawr 2026",
            lastUpdatedTime: "12:00yp"
          }
        };

        const html = env.render("send-daily-hearing-list.njk", welshData);
        expect(html).toContain("Chwilio achosion");
      });

      it("should render Welsh important information paragraphs", () => {
        const welshData = {
          ...baseData,
          t: sendDailyHearingListCy,
          header: {
            listTitle: "Rhestr",
            listForDate: "15 Ionawr 2026",
            lastUpdatedDate: "14 Ionawr 2026",
            lastUpdatedTime: "12:00yp"
          }
        };

        const html = env.render("send-daily-hearing-list.njk", welshData);
        // Check that at least one paragraph is rendered (accounts for HTML encoding)
        expect(html).toContain("Gwybodaeth bwysig");
        expect(html).toContain("send@justice.gov.uk");
        expect(sendDailyHearingListCy.importantInformationParagraphs.length).toBeGreaterThan(0);
      });

      it("should render Welsh footer", () => {
        const welshData = {
          ...baseData,
          t: sendDailyHearingListCy,
          header: {
            listTitle: "Rhestr",
            listForDate: "15 Ionawr 2026",
            lastUpdatedDate: "14 Ionawr 2026",
            lastUpdatedTime: "12:00yp"
          }
        };

        const html = env.render("send-daily-hearing-list.njk", welshData);
        expect(html).toContain("Ffynhonnell Data");
        expect(html).toContain("Yn ôl i frig y dudalen");
      });
    });

    describe("Custom CSS styles", () => {
      it("should include custom back-to-top styling in head block", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain("back-to-top");
        expect(html).toContain("margin-top: 40px");
      });
    });

    describe("Accessibility attributes", () => {
      it("should have aria-label on table", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain("aria-label=");
      });

      it("should have proper heading hierarchy", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain('class="govuk-heading-l"');
        expect(html).toContain('class="govuk-heading-s"');
      });

      it("should have scope attributes on table headers", () => {
        const html = env.render("send-daily-hearing-list.njk", baseData);
        expect(html).toContain('scope="col"');
      });
    });
  });
});
