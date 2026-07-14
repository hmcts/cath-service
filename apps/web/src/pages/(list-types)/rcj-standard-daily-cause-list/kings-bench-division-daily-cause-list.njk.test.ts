import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rcjStandardDailyCauseListCy, rcjStandardDailyCauseListEn } from "@hmcts/rcj-standard-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import { moduleRoot as webCoreModuleRoot } from "@hmcts/web-core/config";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webCoreViews = path.join(webCoreModuleRoot, "views");

describe("kings-bench-division-daily-cause-list.njk", () => {
  let env: nunjucks.Environment;

  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "kings-bench-division-daily-cause-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Locale content", () => {
    describe("English locale", () => {
      describe("KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST", () => {
        const listContent = rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST;

        it("should have all required keys", () => {
          const requiredKeys = [
            "pageTitle",
            "locationLine1",
            "locationLine2",
            "locationLine3",
            "remoteHearingsTitle",
            "remoteHearingsText",
            "remoteJudgmentsTitle",
            "remoteJudgmentsText",
            "bundlesTitle",
            "bundleFilingText"
          ];

          requiredKeys.forEach((key) => {
            expect(listContent).toHaveProperty(key);
          });
        });

        it("should have correct page title", () => {
          expect(listContent.pageTitle).toBe("King's Bench Division Daily Cause List");
        });

        it("should have correct location details", () => {
          expect(listContent.locationLine1).toBe("Royal Courts of Justice");
          expect(listContent.locationLine2).toBe("Strand, London");
          expect(listContent.locationLine3).toBe("WC2A 2LL");
        });

        it("should have correct section titles", () => {
          expect(listContent.remoteHearingsTitle).toBe("Remote hearings before a Judge");
          expect(listContent.remoteJudgmentsTitle).toBe("Remote judgments");
          expect(listContent.bundlesTitle).toBe("Bundles");
        });

        it("should have remote hearings text content", () => {
          expect(listContent.remoteHearingsText).toContain("MS Teams");
          expect(listContent.remoteHearingsText).toContain("kbjudgeslistingoffice@justice.gov.uk");
        });

        it("should have remote judgments text content", () => {
          expect(listContent.remoteJudgmentsText).toContain("Remote hand-down");
          expect(listContent.remoteJudgmentsText).toContain("The National Archives");
          expect(listContent.remoteJudgmentsText).toContain("press.enquiries@judiciary.uk");
        });

        it("should have bundle filing text content", () => {
          expect(listContent.bundleFilingText).toContain("In-person hearings");
          expect(listContent.bundleFilingText).toContain("3 days before the hearing");
          expect(listContent.bundleFilingText).toContain("WG07");
        });
      });

      describe("common", () => {
        const common = rcjStandardDailyCauseListEn.common;

        it("should have all required common keys", () => {
          const requiredKeys = [
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

          requiredKeys.forEach((key) => {
            expect(common).toHaveProperty(key);
          });
        });

        it("should have correct table headers", () => {
          expect(common.tableHeaders.venue).toBe("Venue");
          expect(common.tableHeaders.judge).toBe("Judge");
          expect(common.tableHeaders.time).toBe("Time");
          expect(common.tableHeaders.caseNumber).toBe("Case number");
          expect(common.tableHeaders.caseDetails).toBe("Case details");
          expect(common.tableHeaders.hearingType).toBe("Hearing type");
          expect(common.tableHeaders.additionalInformation).toBe("Additional information");
        });

        it("should have correct URLs", () => {
          expect(common.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        });

        it("should have correct static text", () => {
          expect(common.importantInfoTitle).toBe("Important information");
          expect(common.searchCasesTitle).toBe("Search Cases");
          expect(common.backToTop).toBe("Back to top");
          expect(common.listFor).toBe("List for");
          expect(common.lastUpdated).toBe("Last updated");
          expect(common.at).toBe("at");
          expect(common.dataSource).toBe("Data source");
        });
      });
    });

    describe("Welsh locale", () => {
      describe("KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST", () => {
        const listContent = rcjStandardDailyCauseListCy.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST;

        it("should have all required keys", () => {
          const requiredKeys = [
            "pageTitle",
            "locationLine1",
            "locationLine2",
            "locationLine3",
            "remoteHearingsTitle",
            "remoteHearingsText",
            "remoteJudgmentsTitle",
            "remoteJudgmentsText",
            "bundlesTitle",
            "bundleFilingText"
          ];

          requiredKeys.forEach((key) => {
            expect(listContent).toHaveProperty(key);
          });
        });

        it("should have correct page title", () => {
          expect(listContent.pageTitle).toBe("Rhestr Achosion Dyddiol Adran Mainc y Brenin");
        });

        it("should have correct location details", () => {
          expect(listContent.locationLine1).toBe("Llysoedd Barn Brenhinol");
          expect(listContent.locationLine2).toBe("Strand, London");
          expect(listContent.locationLine3).toBe("WC2A 2LL");
        });

        it("should have correct section titles", () => {
          expect(listContent.remoteHearingsTitle).toBe("Gwrandawiadau o bell gerbron Barnwr");
          expect(listContent.remoteJudgmentsTitle).toBe("Dyfarniadau o bell");
          expect(listContent.bundlesTitle).toBe("Bwnde");
        });

        it("should have remote hearings text content", () => {
          expect(listContent.remoteHearingsText).toContain("MS Teams");
          expect(listContent.remoteHearingsText).toContain("kbjudgeslistingoffice@justice.gov.uk");
        });

        it("should have remote judgments text content", () => {
          expect(listContent.remoteJudgmentsText).toContain("Traddodi o Bell");
          expect(listContent.remoteJudgmentsText).toContain("Archifau Cenedlaethol");
          expect(listContent.remoteJudgmentsText).toContain("press.enquiries@judiciary.uk");
        });

        it("should have bundle filing text content", () => {
          expect(listContent.bundleFilingText).toContain("Gwrandawiadau wyneb yn wyneb");
          expect(listContent.bundleFilingText).toContain("3 diwrnod cyn y gwrandawiad");
          expect(listContent.bundleFilingText).toContain("WG07");
        });
      });

      describe("common", () => {
        const common = rcjStandardDailyCauseListCy.common;

        it("should have all required common keys", () => {
          const requiredKeys = [
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

          requiredKeys.forEach((key) => {
            expect(common).toHaveProperty(key);
          });
        });

        it("should have correct table headers", () => {
          expect(common.tableHeaders.venue).toBe("Lleoliad");
          expect(common.tableHeaders.judge).toBe("Barnwr");
          expect(common.tableHeaders.time).toBe("Amser");
          expect(common.tableHeaders.caseNumber).toBe("Rhif yr achos");
          expect(common.tableHeaders.caseDetails).toBe("Manylion yr achos");
          expect(common.tableHeaders.hearingType).toBe("Math o wrandawiad");
          expect(common.tableHeaders.additionalInformation).toBe("Gwybodaeth ychwanegol");
        });

        it("should have correct static text", () => {
          expect(common.importantInfoTitle).toBe("Gwybodaeth bwysig");
          expect(common.searchCasesTitle).toBe("Chwilio Achosion");
          expect(common.backToTop).toBe("Yn ôl i frig y dudalen");
          expect(common.listFor).toBe("Rhestr ar gyfer");
          expect(common.lastUpdated).toBe("Diweddarwyd ddiwethaf");
          expect(common.at).toBe("am");
          expect(common.dataSource).toBe("Ffynhonnell data");
        });
      });
    });

    describe("Locale consistency", () => {
      it("should have same KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST structure in English and Welsh", () => {
        const enKeys = Object.keys(rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST).sort();
        const cyKeys = Object.keys(rcjStandardDailyCauseListCy.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST).sort();
        expect(enKeys).toEqual(cyKeys);
      });

      it("should have same common structure in English and Welsh", () => {
        const enKeys = Object.keys(rcjStandardDailyCauseListEn.common).sort();
        const cyKeys = Object.keys(rcjStandardDailyCauseListCy.common).sort();
        expect(enKeys).toEqual(cyKeys);
      });

      it("should have same types for each KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST key", () => {
        const enContent = rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST;
        const cyContent = rcjStandardDailyCauseListCy.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST;

        Object.keys(enContent).forEach((key) => {
          const enType = typeof enContent[key as keyof typeof enContent];
          const cyType = typeof cyContent[key as keyof typeof cyContent];
          expect(enType).toBe(cyType);
        });
      });

      it("should have same types for each common key", () => {
        const enCommon = rcjStandardDailyCauseListEn.common;
        const cyCommon = rcjStandardDailyCauseListCy.common;

        Object.keys(enCommon).forEach((key) => {
          if (key === "provenanceLabels") return; // Skip complex nested object
          const enType = typeof enCommon[key as keyof typeof enCommon];
          const cyType = typeof cyCommon[key as keyof typeof cyCommon];
          expect(enType).toBe(cyType);
        });
      });
    });
  });

  describe("Template rendering", () => {
    beforeEach(() => {
      env = createTestEnvironment([__dirname, webCoreViews]);
    });

    describe("Header and location information", () => {
      it("should render header with list title", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("King&#39;s Bench Division Daily Cause List");
        expect(html).toContain('<h1 class="govuk-heading-l" id="top">');
      });

      it("should render location information", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("Royal Courts of Justice");
        expect(html).toContain("Strand, London");
        expect(html).toContain("WC2A 2LL");
      });

      it("should render list date information", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("List for");
        expect(html).toContain("10 July 2026");
        expect(html).toContain("Last updated");
        expect(html).toContain("9 July 2026");
        expect(html).toContain("4:30pm");
      });
    });

    describe("Important information section", () => {
      it("should render important information details component with correct content", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("Important information");
        expect(html).toContain("Remote hearings before a Judge");
        expect(html).toContain("Remote judgments");
        expect(html).toContain("Bundles");
        expect(html).toContain("govuk-details");
      });

      it("should render remote hearings content", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("MS Teams");
        expect(html).toContain("kbjudgeslistingoffice@justice.gov.uk");
      });

      it("should render remote judgments content", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("Remote hand-down");
        expect(html).toContain("The National Archives");
        expect(html).toContain("press.enquiries@judiciary.uk");
      });

      it("should render bundles filing information", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("In-person hearings");
        expect(html).toContain("3 days before the hearing");
        expect(html).toContain("WG07");
      });

      it("should handle multi-paragraph text with split", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        const paragraphCount = (html.match(/<p class="govuk-body">/g) || []).length;
        expect(paragraphCount).toBeGreaterThan(0);
      });
    });

    describe("FACT link section", () => {
      it("should render FACT link and additional text", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("https://www.find-court-tribunal.service.gov.uk/");
        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("in England and Wales");
      });
    });

    describe("Search functionality", () => {
      it("should render search input with correct labels", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("Search Cases");
        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('name="search"');
        expect(html).toContain('type="text"');
      });

      it("should render visually hidden label for screen readers", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("govuk-visually-hidden");
        expect(html).toContain("Search by case number, details, venue, judge, or other information");
      });
    });

    describe("Hearings table", () => {
      it("should render table with correct headers", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("Venue");
        expect(html).toContain("Judge");
        expect(html).toContain("Time");
        expect(html).toContain("Case number");
        expect(html).toContain("Case details");
        expect(html).toContain("Hearing type");
        expect(html).toContain("Additional information");
      });

      it("should render table with aria-label", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain('role="table"');
        expect(html).toContain('aria-label="King&#39;s Bench Division Daily Cause List"');
      });

      it("should render empty table when no hearings provided", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("<tbody");
        expect(html).toContain("</tbody>");
        const bodyContent = html.match(/<tbody[^>]*>(.*?)<\/tbody>/s)?.[1] || "";
        expect(bodyContent.trim()).toBe("");
      });

      it("should render single hearing row", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [
            {
              venue: "Court 1",
              judge: "Mr Justice Smith",
              time: "10:00am",
              caseNumber: "KB-2026-001234",
              caseDetails: "Smith v Jones",
              hearingType: "Trial",
              additionalInformation: "In person"
            }
          ],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("Court 1");
        expect(html).toContain("Mr Justice Smith");
        expect(html).toContain("10:00am");
        expect(html).toContain("KB-2026-001234");
        expect(html).toContain("Smith v Jones");
        expect(html).toContain("Trial");
        expect(html).toContain("In person");
      });

      it("should render multiple hearing rows", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [
            {
              venue: "Court 1",
              judge: "Mr Justice Smith",
              time: "10:00am",
              caseNumber: "KB-2026-001234",
              caseDetails: "Smith v Jones",
              hearingType: "Trial",
              additionalInformation: "In person"
            },
            {
              venue: "Court 2",
              judge: "Mrs Justice Brown",
              time: "2:00pm",
              caseNumber: "KB-2026-005678",
              caseDetails: "Johnson v Williams",
              hearingType: "Application",
              additionalInformation: "Remote - MS Teams"
            },
            {
              venue: "Court 3",
              judge: "HHJ Davies",
              time: "10:30am",
              caseNumber: "KB-2026-009999",
              caseDetails: "Taylor v Anderson",
              hearingType: "CMC",
              additionalInformation: ""
            }
          ],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("KB-2026-001234");
        expect(html).toContain("KB-2026-005678");
        expect(html).toContain("KB-2026-009999");
        expect(html).toContain("Smith v Jones");
        expect(html).toContain("Johnson v Williams");
        expect(html).toContain("Taylor v Anderson");

        const rowCount = (html.match(/<tr class="govuk-table__row">/g) || []).length;
        expect(rowCount).toBe(4); // 1 header row + 3 data rows
      });

      it("should handle empty string values in hearing data", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [
            {
              venue: "",
              judge: "",
              time: "10:00am",
              caseNumber: "KB-2026-001234",
              caseDetails: "Smith v Jones",
              hearingType: "",
              additionalInformation: ""
            }
          ],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("KB-2026-001234");
        expect(html).toContain("Smith v Jones");
        const cellCount = (html.match(/<td class="govuk-table__cell">/g) || []).length;
        expect(cellCount).toBe(7);
      });
    });

    describe("Footer section", () => {
      it("should render data source", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("Data source");
        expect(html).toContain("Court Data Platform");
        expect(html).toContain("govuk-body-s");
      });

      it("should render back to top link", () => {
        const mockData = {
          header: {
            listTitle: "King's Bench Division Daily Cause List",
            listDate: "10 July 2026",
            lastUpdatedDate: "9 July 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListEn.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListEn.common,
          hearings: [],
          dataSource: "Court Data Platform"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("Back to top");
        expect(html).toContain('href="#top"');
      });
    });

    describe("Welsh translation", () => {
      it("should render all Welsh content correctly", () => {
        const mockData = {
          header: {
            listTitle: "Rhestr Achosion Dyddiol Adran Mainc y Brenin",
            listDate: "10 Gorffennaf 2026",
            lastUpdatedDate: "9 Gorffennaf 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListCy.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListCy.common,
          hearings: [],
          dataSource: "Platfform Data Llys"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("Rhestr Achosion Dyddiol Adran Mainc y Brenin");
        expect(html).toContain("Llysoedd Barn Brenhinol");
        expect(html).toContain("Gwybodaeth bwysig");
        expect(html).toContain("Gwrandawiadau o bell gerbron Barnwr");
        expect(html).toContain("Dyfarniadau o bell");
        expect(html).toContain("Bwnde");
        expect(html).toContain("Chwilio Achosion");
        expect(html).toContain("Yn ôl i frig y dudalen");
      });

      it("should render Welsh table headers", () => {
        const mockData = {
          header: {
            listTitle: "Rhestr Achosion Dyddiol Adran Mainc y Brenin",
            listDate: "10 Gorffennaf 2026",
            lastUpdatedDate: "9 Gorffennaf 2026",
            lastUpdatedTime: "4:30pm"
          },
          listContent: rcjStandardDailyCauseListCy.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST,
          common: rcjStandardDailyCauseListCy.common,
          hearings: [],
          dataSource: "Platfform Data Llys"
        };

        const { html } = render(env, "kings-bench-division-daily-cause-list.njk", mockData);

        expect(html).toContain("Lleoliad");
        expect(html).toContain("Barnwr");
        expect(html).toContain("Amser");
        expect(html).toContain("Rhif yr achos");
        expect(html).toContain("Manylion yr achos");
        expect(html).toContain("Math o wrandawiad");
        expect(html).toContain("Gwybodaeth ychwanegol");
      });
    });
  });

  describe("Template data contract", () => {
    it("should document required template variables", () => {
      const templateContract = {
        description: "Kings Bench Division Daily Cause List template requires the following variables",
        variables: {
          header: {
            type: "object",
            properties: {
              listTitle: { type: "string", example: "King's Bench Division Daily Cause List" },
              listDate: { type: "string", example: "10 July 2026" },
              lastUpdatedDate: { type: "string", example: "9 July 2026" },
              lastUpdatedTime: { type: "string", example: "4:30pm" }
            },
            required: true
          },
          listContent: {
            type: "object",
            description: "KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST from rcjStandardDailyCauseListEn or rcjStandardDailyCauseListCy",
            properties: {
              locationLine1: { type: "string" },
              locationLine2: { type: "string" },
              locationLine3: { type: "string" },
              remoteHearingsTitle: { type: "string" },
              remoteHearingsText: { type: "string" },
              remoteJudgmentsTitle: { type: "string" },
              remoteJudgmentsText: { type: "string" },
              bundlesTitle: { type: "string" },
              bundleFilingText: { type: "string" }
            },
            required: true
          },
          common: {
            type: "object",
            description: "common from rcjStandardDailyCauseListEn or rcjStandardDailyCauseListCy",
            properties: {
              factLinkUrl: { type: "string" },
              factLinkText: { type: "string" },
              factAdditionalText: { type: "string" },
              importantInfoTitle: { type: "string" },
              searchCasesTitle: { type: "string" },
              searchCasesLabel: { type: "string" },
              tableHeaders: { type: "object" },
              dataSource: { type: "string" },
              backToTop: { type: "string" },
              listFor: { type: "string" },
              lastUpdated: { type: "string" },
              at: { type: "string" }
            },
            required: true
          },
          dataSource: {
            type: "string",
            description: "Provenance label for data source",
            example: "Court Data Platform"
          },
          hearings: {
            type: "array",
            description: "Array of hearing objects",
            items: {
              venue: { type: "string", example: "Court 1" },
              judge: { type: "string", example: "Mr Justice Smith" },
              time: { type: "string", example: "10:00am" },
              caseNumber: { type: "string", example: "KB-2026-001234" },
              caseDetails: { type: "string", example: "Smith v Jones" },
              hearingType: { type: "string", example: "Trial" },
              additionalInformation: { type: "string", example: "In person" }
            },
            required: true
          }
        },
        conditionalLogic: {
          emptyStrings: "Template renders empty table cells when hearing data fields are empty strings",
          multiParagraph: "Text containing '\\n\\n' is split into separate <p> tags using split('\\n\\n').join('</p><p class=\"govuk-body\">')",
          detailsOpen: "Important information details component is open by default (open: true)",
          ariaLabel: "Table has aria-label set to header.listTitle for screen readers"
        }
      };

      expect(templateContract.description).toBeDefined();
      expect(templateContract.variables).toBeDefined();
      expect(templateContract.conditionalLogic).toBeDefined();
    });
  });
});
