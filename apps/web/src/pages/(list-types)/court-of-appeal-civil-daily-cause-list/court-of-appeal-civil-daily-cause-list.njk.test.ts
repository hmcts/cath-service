import path from "node:path";
import { fileURLToPath } from "node:url";
import { courtOfAppealCivilDailyCauseListCy as cy, courtOfAppealCivilDailyCauseListEn as en } from "@hmcts/court-of-appeal-civil-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");

describe("court-of-appeal-civil-daily-cause-list.njk", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([__dirname, webCoreViews]);
  });

  describe("Locale content", () => {
    describe("English locale (en)", () => {
      it("should have page title", () => {
        expect(en.pageTitle).toBe("Court of Appeal (Civil Division) Daily Cause List");
      });

      it("should have fact link information", () => {
        expect(en.factLinkText).toBeDefined();
        expect(en.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(en.factAdditionalText).toBeDefined();
      });

      it("should have location details", () => {
        expect(en.locationLine1).toBe("Royal Courts of Justice");
        expect(en.locationLine2).toBe("Strand, London");
        expect(en.locationLine3).toBe("WC2A 2LL");
      });

      it("should have important information section", () => {
        expect(en.importantInfoTitle).toBe("Important information");
        expect(en.liveStreamingTitle).toBeDefined();
        expect(en.liveStreamingText1).toBeDefined();
        expect(en.liveStreamingLinkText).toBeDefined();
        expect(en.liveStreamingLinkUrl).toBeDefined();
        expect(en.liveStreamingText2a).toBeDefined();
        expect(en.liveStreamingText2b).toBeDefined();
        expect(en.judgmentsTitle).toBe("Handing down of judgments");
        expect(en.judgmentsText).toBeDefined();
      });

      it("should have search section", () => {
        expect(en.searchCasesTitle).toBe("Search Cases");
        expect(en.searchCasesLabel).toBeDefined();
      });

      it("should have table headers", () => {
        expect(en.tableHeaders.date).toBe("Date");
        expect(en.tableHeaders.venue).toBe("Venue");
        expect(en.tableHeaders.judge).toBe("Judge");
        expect(en.tableHeaders.time).toBe("Time");
        expect(en.tableHeaders.caseNumber).toBe("Case Number");
        expect(en.tableHeaders.caseDetails).toBe("Case Details");
        expect(en.tableHeaders.hearingType).toBe("Hearing Type");
        expect(en.tableHeaders.additionalInformation).toBe("Additional Information");
      });

      it("should have section titles", () => {
        expect(en.dailyHearingsTitle).toBe("Daily hearings");
        expect(en.futureJudgmentsTitle).toBe("Notice for future judgments");
      });

      it("should have empty state message", () => {
        expect(en.noHearingsMessage).toBe("No hearings scheduled for this section");
      });

      it("should have metadata labels", () => {
        expect(en.dataSource).toBe("Data source");
        expect(en.backToTop).toBe("Back to top");
        expect(en.listFor).toBe("List for");
        expect(en.lastUpdated).toBe("Last updated");
        expect(en.at).toBe("at");
      });

      it("should have provenance labels", () => {
        expect(en.provenanceLabels).toBeDefined();
      });
    });

    describe("Welsh locale (cy)", () => {
      it("should have page title", () => {
        expect(cy.pageTitle).toBe("Rhestr Achosion Dyddiol y Llys Apêl (Adran Sifil)");
      });

      it("should have fact link information", () => {
        expect(cy.factLinkText).toBeDefined();
        expect(cy.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(cy.factAdditionalText).toBeDefined();
      });

      it("should have location details", () => {
        expect(cy.locationLine1).toBe("Llysoedd Barn Brenhinol");
        expect(cy.locationLine2).toBe("Strand, London");
        expect(cy.locationLine3).toBe("WC2A 2LL");
      });

      it("should have important information section", () => {
        expect(cy.importantInfoTitle).toBe("Gwybodaeth bwysig");
        expect(cy.liveStreamingTitle).toBeDefined();
        expect(cy.liveStreamingText1).toBeDefined();
        expect(cy.liveStreamingLinkText).toBeDefined();
        expect(cy.liveStreamingLinkUrl).toBeDefined();
        expect(cy.liveStreamingText2a).toBeDefined();
        expect(cy.liveStreamingText2b).toBeDefined();
        expect(cy.judgmentsTitle).toBe("Traddodi dyfarniadau");
        expect(cy.judgmentsText).toBeDefined();
      });

      it("should have search section", () => {
        expect(cy.searchCasesTitle).toBe("Chwilio Achosion");
        expect(cy.searchCasesLabel).toBeDefined();
      });

      it("should have table headers", () => {
        expect(cy.tableHeaders.date).toBe("Dyddiad");
        expect(cy.tableHeaders.venue).toBe("Lleoliad");
        expect(cy.tableHeaders.judge).toBe("Barnwr");
        expect(cy.tableHeaders.time).toBe("Amser");
        expect(cy.tableHeaders.caseNumber).toBe("Rhif yr achos");
        expect(cy.tableHeaders.caseDetails).toBe("Manylion yr achos");
        expect(cy.tableHeaders.hearingType).toBe("Math o wrandawiad");
        expect(cy.tableHeaders.additionalInformation).toBe("Gwybodaeth ychwanegol");
      });

      it("should have section titles", () => {
        expect(cy.dailyHearingsTitle).toBe("Gwrandawiadau dyddiol");
        expect(cy.futureJudgmentsTitle).toBe("Hysbysiad o ddyfarniadau eraill yr wythnos hon");
      });

      it("should have empty state message", () => {
        expect(cy.noHearingsMessage).toBe("Dim gwrandawiadau wedi'u trefnu ar gyfer yr adran hon");
      });

      it("should have metadata labels", () => {
        expect(cy.dataSource).toBe("Ffynhonnell data");
        expect(cy.backToTop).toBe("Yn ôl i frig y dudalen");
        expect(cy.listFor).toBe("Rhestr ar gyfer");
        expect(cy.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(cy.at).toBe("am");
      });

      it("should have provenance labels", () => {
        expect(cy.provenanceLabels).toBeDefined();
      });
    });

    describe("Locale consistency", () => {
      it("should have matching keys between English and Welsh", () => {
        const enKeys = Object.keys(en).sort();
        const cyKeys = Object.keys(cy).sort();
        expect(cyKeys).toEqual(enKeys);
      });

      it("should have matching table header keys", () => {
        const enHeaderKeys = Object.keys(en.tableHeaders).sort();
        const cyHeaderKeys = Object.keys(cy.tableHeaders).sort();
        expect(cyHeaderKeys).toEqual(enHeaderKeys);
      });
    });
  });

  describe("Template rendering", () => {
    const mockHeader = {
      listTitle: "Court of Appeal (Civil Division) Daily Cause List",
      listDate: "10 July 2026",
      lastUpdatedDate: "10 July 2026",
      lastUpdatedTime: "10:30am"
    };

    describe("Header section", () => {
      it("should render header with list title", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain('<h1 class="govuk-heading-l" id="top">');
        expect(html).toContain(mockHeader.listTitle);
      });

      it("should render fact link with URL", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain('<a href="https://www.find-court-tribunal.service.gov.uk/" class="govuk-link">');
        expect(html).toContain(en.factLinkText);
      });

      it("should render location details", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain(en.locationLine1);
        expect(html).toContain(en.locationLine2);
        expect(html).toContain(en.locationLine3);
      });

      it("should render list date and last updated information", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain(en.listFor);
        expect(html).toContain(mockHeader.listDate);
        expect(html).toContain(en.lastUpdated);
        expect(html).toContain(mockHeader.lastUpdatedDate);
        expect(html).toContain(mockHeader.lastUpdatedTime);
      });
    });

    describe("Important information section", () => {
      it("should render govukDetails component with important information", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain(en.importantInfoTitle);
        expect(html).toContain(en.liveStreamingTitle);
        expect(html).toContain(en.liveStreamingText1);
        expect(html).toContain(en.liveStreamingLinkText);
        expect(html).toContain(en.judgmentsTitle);
        expect(html).toContain(en.judgmentsText);
      });

      it("should render live streaming link in important information", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain('href="https://www.judiciary.uk/the-court-of-appeal-civil-division-live-streaming-of-court-hearings/"');
      });
    });

    describe("Search section", () => {
      it("should render search input with label", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain('<h2 class="govuk-heading-s">');
        expect(html).toContain(en.searchCasesTitle);
        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('type="text"');
        expect(html).toContain(`aria-label="${en.searchCasesLabel}"`);
      });

      it("should have visually hidden label for screen readers", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain('class="govuk-label govuk-visually-hidden"');
        expect(html).toContain(`for="case-search-input"`);
      });
    });

    describe("Daily hearings section", () => {
      it("should render daily hearings table with single hearing", () => {
        const dailyHearings = [
          {
            venue: "Court 1",
            judge: "Lady Justice Smith",
            time: "10:30am",
            caseNumber: "A1/2026/0001",
            caseDetails: "Smith v Jones",
            hearingType: "Application",
            additionalInformation: "Remote hearing"
          }
        ];

        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings,
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain('<table class="govuk-table hearings-table"');
        expect(html).toContain(`aria-label="${en.dailyHearingsTitle}"`);
        expect(html).toContain(dailyHearings[0].venue);
        expect(html).toContain(dailyHearings[0].judge);
        expect(html).toContain(dailyHearings[0].time);
        expect(html).toContain(dailyHearings[0].caseNumber);
        expect(html).toContain(dailyHearings[0].caseDetails);
        expect(html).toContain(dailyHearings[0].hearingType);
        expect(html).toContain(dailyHearings[0].additionalInformation);
      });

      it("should render daily hearings table with multiple hearings", () => {
        const dailyHearings = [
          {
            venue: "Court 1",
            judge: "Lady Justice Smith",
            time: "10:30am",
            caseNumber: "A1/2026/0001",
            caseDetails: "Smith v Jones",
            hearingType: "Application",
            additionalInformation: "Remote hearing"
          },
          {
            venue: "Court 2",
            judge: "Lord Justice Brown",
            time: "2:00pm",
            caseNumber: "A1/2026/0002",
            caseDetails: "Johnson v Williams",
            hearingType: "Appeal",
            additionalInformation: "In person"
          }
        ];

        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings,
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain(dailyHearings[0].caseNumber);
        expect(html).toContain(dailyHearings[1].caseNumber);
        expect(html).toContain(dailyHearings[0].judge);
        expect(html).toContain(dailyHearings[1].judge);
      });

      it("should render table headers for daily hearings", () => {
        const dailyHearings = [
          {
            venue: "Court 1",
            judge: "Lady Justice Smith",
            time: "10:30am",
            caseNumber: "A1/2026/0001",
            caseDetails: "Smith v Jones",
            hearingType: "Application",
            additionalInformation: "Remote hearing"
          }
        ];

        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings,
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain(en.tableHeaders.venue);
        expect(html).toContain(en.tableHeaders.judge);
        expect(html).toContain(en.tableHeaders.time);
        expect(html).toContain(en.tableHeaders.caseNumber);
        expect(html).toContain(en.tableHeaders.caseDetails);
        expect(html).toContain(en.tableHeaders.hearingType);
        expect(html).toContain(en.tableHeaders.additionalInformation);
      });

      it("should render empty state when no daily hearings", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain(en.noHearingsMessage);
        expect(html).not.toContain('<table class="govuk-table hearings-table"');
      });

      it("should render empty strings in hearing fields", () => {
        const dailyHearings = [
          {
            venue: "",
            judge: "",
            time: "",
            caseNumber: "A1/2026/0001",
            caseDetails: "",
            hearingType: "",
            additionalInformation: ""
          }
        ];

        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings,
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain(dailyHearings[0].caseNumber);
        expect(html).toContain('<td class="govuk-table__cell"></td>');
      });
    });

    describe("Future judgments section", () => {
      it("should render future judgments table with single judgment", () => {
        const futureJudgments = [
          {
            date: "15 July 2026",
            venue: "Court 3",
            judge: "Lord Justice Davis",
            time: "9:30am",
            caseNumber: "A1/2026/0003",
            caseDetails: "Taylor v Anderson",
            hearingType: "Judgment",
            additionalInformation: "Reserved judgment"
          }
        ];

        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments,
          dataSource: "Test Source"
        });

        expect(html).toContain('<h2 class="govuk-heading-m">');
        expect(html).toContain(en.futureJudgmentsTitle);
        expect(html).toContain(`aria-label="${en.futureJudgmentsTitle}"`);
        expect(html).toContain(futureJudgments[0].date);
        expect(html).toContain(futureJudgments[0].venue);
        expect(html).toContain(futureJudgments[0].judge);
        expect(html).toContain(futureJudgments[0].time);
        expect(html).toContain(futureJudgments[0].caseNumber);
        expect(html).toContain(futureJudgments[0].caseDetails);
        expect(html).toContain(futureJudgments[0].hearingType);
        expect(html).toContain(futureJudgments[0].additionalInformation);
      });

      it("should render future judgments table with multiple judgments", () => {
        const futureJudgments = [
          {
            date: "15 July 2026",
            venue: "Court 3",
            judge: "Lord Justice Davis",
            time: "9:30am",
            caseNumber: "A1/2026/0003",
            caseDetails: "Taylor v Anderson",
            hearingType: "Judgment",
            additionalInformation: "Reserved judgment"
          },
          {
            date: "16 July 2026",
            venue: "Court 4",
            judge: "Lady Justice Wilson",
            time: "10:00am",
            caseNumber: "A1/2026/0004",
            caseDetails: "Martin v Thomas",
            hearingType: "Judgment",
            additionalInformation: "To be handed down"
          }
        ];

        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments,
          dataSource: "Test Source"
        });

        expect(html).toContain(futureJudgments[0].caseNumber);
        expect(html).toContain(futureJudgments[1].caseNumber);
        expect(html).toContain(futureJudgments[0].date);
        expect(html).toContain(futureJudgments[1].date);
      });

      it("should render date column header for future judgments", () => {
        const futureJudgments = [
          {
            date: "15 July 2026",
            venue: "Court 3",
            judge: "Lord Justice Davis",
            time: "9:30am",
            caseNumber: "A1/2026/0003",
            caseDetails: "Taylor v Anderson",
            hearingType: "Judgment",
            additionalInformation: "Reserved judgment"
          }
        ];

        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments,
          dataSource: "Test Source"
        });

        expect(html).toContain(en.tableHeaders.date);
        expect(html).toContain(en.tableHeaders.venue);
        expect(html).toContain(en.tableHeaders.judge);
      });

      it("should render empty state when no future judgments", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        const futureJudgmentsSection = html.match(/<h2 class="govuk-heading-m">Notice for future judgments<\/h2>[\s\S]*?(?=<p class="govuk-body-s|$)/);
        expect(futureJudgmentsSection).toBeTruthy();
        expect(futureJudgmentsSection?.[0]).toContain(en.noHearingsMessage);
      });

      it("should have section divider class for future judgments", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain('class="hearings-section section-divider"');
      });
    });

    describe("Footer section", () => {
      it("should render data source", () => {
        const dataSource = "HMCTS Publishing Service";

        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource
        });

        expect(html).toContain(en.dataSource);
        expect(html).toContain(dataSource);
      });

      it("should render back to top link", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain('<a href="#top" class="govuk-link">');
        expect(html).toContain(en.backToTop);
      });
    });

    describe("Welsh language rendering", () => {
      it("should render all Welsh text correctly", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: cy,
          header: {
            listTitle: cy.pageTitle,
            listDate: "10 Gorffennaf 2026",
            lastUpdatedDate: "10 Gorffennaf 2026",
            lastUpdatedTime: "10:30am"
          },
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Gwasanaeth Cyhoeddi GLlTEF"
        });

        expect(html).toContain(cy.pageTitle);
        expect(html).toContain(cy.locationLine1);
        expect(html).toContain(cy.searchCasesTitle);
        expect(html).toContain(cy.futureJudgmentsTitle);
        expect(html).toContain(cy.backToTop);
      });

      it("should render Welsh table headers", () => {
        const dailyHearings = [
          {
            venue: "Llys 1",
            judge: "Yr Arglwyddes Gyfiawnder Smith",
            time: "10:30am",
            caseNumber: "A1/2026/0001",
            caseDetails: "Smith v Jones",
            hearingType: "Cais",
            additionalInformation: "Gwrandawiad o bell"
          }
        ];

        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: cy,
          header: {
            listTitle: cy.pageTitle,
            listDate: "10 Gorffennaf 2026",
            lastUpdatedDate: "10 Gorffennaf 2026",
            lastUpdatedTime: "10:30am"
          },
          dailyHearings,
          futureJudgments: [],
          dataSource: "Gwasanaeth Cyhoeddi GLlTEF"
        });

        expect(html).toContain(cy.tableHeaders.venue);
        expect(html).toContain(cy.tableHeaders.judge);
        expect(html).toContain(cy.tableHeaders.time);
        expect(html).toContain(cy.tableHeaders.caseNumber);
      });
    });

    describe("GOV.UK Design System compliance", () => {
      it("should use GOV.UK grid classes", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain('class="govuk-grid-row"');
        expect(html).toContain('class="govuk-grid-column-full"');
      });

      it("should use GOV.UK typography classes", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain("govuk-heading-l");
        expect(html).toContain("govuk-heading-m");
        expect(html).toContain("govuk-heading-s");
        expect(html).toContain("govuk-body");
        expect(html).toContain("govuk-body-s");
      });

      it("should use GOV.UK spacing utilities", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain("govuk-!-font-weight-bold");
        expect(html).toContain("govuk-!-margin-bottom-0");
        expect(html).toContain("govuk-!-margin-bottom-1");
        expect(html).toContain("govuk-!-margin-top-6");
      });

      it("should use GOV.UK table component", () => {
        const dailyHearings = [
          {
            venue: "Court 1",
            judge: "Lady Justice Smith",
            time: "10:30am",
            caseNumber: "A1/2026/0001",
            caseDetails: "Smith v Jones",
            hearingType: "Application",
            additionalInformation: "Remote hearing"
          }
        ];

        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings,
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain('class="govuk-table');
        expect(html).toContain('class="govuk-table__head"');
        expect(html).toContain('class="govuk-table__body"');
        expect(html).toContain('class="govuk-table__row"');
        expect(html).toContain('class="govuk-table__header"');
        expect(html).toContain('class="govuk-table__cell"');
      });

      it("should use GOV.UK input component classes", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain('class="govuk-input');
        expect(html).toContain("govuk-!-width-one-half");
      });
    });

    describe("Accessibility", () => {
      it("should have aria-label on tables", () => {
        const dailyHearings = [
          {
            venue: "Court 1",
            judge: "Lady Justice Smith",
            time: "10:30am",
            caseNumber: "A1/2026/0001",
            caseDetails: "Smith v Jones",
            hearingType: "Application",
            additionalInformation: "Remote hearing"
          }
        ];

        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings,
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain('role="table"');
        expect(html).toContain(`aria-label="${en.dailyHearingsTitle}"`);
      });

      it("should have proper heading hierarchy", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain('<h1 class="govuk-heading-l"');
        expect(html).toContain('<h2 class="govuk-heading-m">');
        expect(html).toContain('<h2 class="govuk-heading-s">');
      });

      it("should have visually hidden label for search input", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain('class="govuk-label govuk-visually-hidden"');
        expect(html).toContain('for="case-search-input"');
      });

      it("should have proper table structure with scope attributes", () => {
        const dailyHearings = [
          {
            venue: "Court 1",
            judge: "Lady Justice Smith",
            time: "10:30am",
            caseNumber: "A1/2026/0001",
            caseDetails: "Smith v Jones",
            hearingType: "Application",
            additionalInformation: "Remote hearing"
          }
        ];

        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings,
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain('scope="col"');
      });

      it("should have anchor with id for back to top functionality", () => {
        const { html } = render(env, "court-of-appeal-civil-daily-cause-list.njk", {
          t: en,
          header: mockHeader,
          dailyHearings: [],
          futureJudgments: [],
          dataSource: "Test Source"
        });

        expect(html).toContain('id="top"');
        expect(html).toContain('href="#top"');
      });
    });
  });
});
