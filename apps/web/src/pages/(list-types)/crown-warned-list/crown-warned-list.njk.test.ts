import path from "node:path";
import { fileURLToPath } from "node:url";
import { crownWarnedListCy, crownWarnedListEn } from "@hmcts/crown-warned-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import { moduleRoot as webCoreModuleRoot } from "@hmcts/web-core/config";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.join(webCoreModuleRoot, "views");

describe("crown-warned-list.njk", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([__dirname, webCoreViews]);
  });

  describe("Locale content", () => {
    describe("English locale", () => {
      it("should have all required keys", () => {
        const requiredKeys = [
          "title",
          "pageTitle",
          "factLinkUrl",
          "factLinkText",
          "factAdditionalText",
          "lastUpdated",
          "version",
          "preStatementPrefix",
          "preStatementSuffix2",
          "preStatementSuffix3",
          "preStatementSuffix4",
          "fixedFor",
          "caseRef",
          "defendant",
          "prosecutingAuthority",
          "linkedCases",
          "listingNotes",
          "toBeAllocated",
          "searchCases",
          "reportingRestrictions",
          "reportingRestrictionsTitle",
          "reportingRestrictionsBodyIntro",
          "reportingRestrictionsWarning",
          "reportingRestrictionsBodySpecific",
          "reportingRestrictionsBodyHowever",
          "reportingRestrictionsBodyContact",
          "reportingRestrictionsContactCourt",
          "reportingRestrictionsContactHmcts",
          "courtHouseDetails",
          "backToTop",
          "dataSource",
          "errorTitle",
          "errorMessage",
          "error403Title",
          "error403Message"
        ];

        requiredKeys.forEach((key) => {
          expect(crownWarnedListEn).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(crownWarnedListEn.title).toBe("Crown Warned List");
        expect(crownWarnedListEn.pageTitle).toBe("Crown Warned List for");
        expect(crownWarnedListEn.lastUpdated).toBe("Last updated");
        expect(crownWarnedListEn.version).toBe("Version");
        expect(crownWarnedListEn.searchCases).toBe("Search Cases");
        expect(crownWarnedListEn.toBeAllocated).toBe("To be allocated");
      });

      it("should have correct table header labels", () => {
        expect(crownWarnedListEn.fixedFor).toBe("Fixed For");
        expect(crownWarnedListEn.caseRef).toBe("Case Reference");
        expect(crownWarnedListEn.defendant).toBe("Defendant Name(s)");
        expect(crownWarnedListEn.prosecutingAuthority).toBe("Prosecuting Authority");
        expect(crownWarnedListEn.linkedCases).toBe("Linked Cases");
        expect(crownWarnedListEn.listingNotes).toBe("Listing Notes");
      });

      it("should have reporting restrictions content", () => {
        expect(crownWarnedListEn.reportingRestrictionsTitle).toBe("Restrictions on publishing or writing about these cases");
        expect(crownWarnedListEn.reportingRestrictionsWarning).toContain("Warning");
        expect(crownWarnedListEn.reportingRestrictionsContactCourt).toBe("the court directly");
        expect(crownWarnedListEn.reportingRestrictionsContactHmcts).toBe("HM Courts and Tribunals Service on 0330 808 4407");
      });

      it("should have pre-statement content", () => {
        expect(crownWarnedListEn.preStatementPrefix).toContain("week commencing");
        expect(crownWarnedListEn.preStatementSuffix2).toContain("Listing Officer");
        expect(crownWarnedListEn.preStatementSuffix3).toContain("Crown Prosecution Service");
        expect(crownWarnedListEn.preStatementSuffix4).toBe("*denotes a defendant in custody");
      });

      it("should have FACT link", () => {
        expect(crownWarnedListEn.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
        expect(crownWarnedListEn.factLinkText).toContain("Find contact details");
        expect(crownWarnedListEn.factAdditionalText).toContain("England and Wales");
      });
    });

    describe("Welsh locale", () => {
      it("should have all required keys", () => {
        const requiredKeys = [
          "title",
          "pageTitle",
          "factLinkUrl",
          "factLinkText",
          "factAdditionalText",
          "lastUpdated",
          "version",
          "preStatementPrefix",
          "preStatementSuffix2",
          "preStatementSuffix3",
          "preStatementSuffix4",
          "fixedFor",
          "caseRef",
          "defendant",
          "prosecutingAuthority",
          "linkedCases",
          "listingNotes",
          "toBeAllocated",
          "searchCases",
          "reportingRestrictions",
          "reportingRestrictionsTitle",
          "reportingRestrictionsBodyIntro",
          "reportingRestrictionsWarning",
          "reportingRestrictionsBodySpecific",
          "reportingRestrictionsBodyHowever",
          "reportingRestrictionsBodyContact",
          "reportingRestrictionsContactCourt",
          "reportingRestrictionsContactHmcts",
          "courtHouseDetails",
          "backToTop",
          "dataSource",
          "errorTitle",
          "errorMessage",
          "error403Title",
          "error403Message"
        ];

        requiredKeys.forEach((key) => {
          expect(crownWarnedListCy).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(crownWarnedListCy.title).toBe("Rhestr Rybuddiol y Goron");
        expect(crownWarnedListCy.pageTitle).toBe("Rhestr Rybuddiol y Goron ar gyfer");
        expect(crownWarnedListCy.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(crownWarnedListCy.version).toBe("Fersiwn");
        expect(crownWarnedListCy.searchCases).toBe("Chwilio Achosion");
        expect(crownWarnedListCy.toBeAllocated).toBe("I'w ddyrannu");
      });

      it("should have correct table header labels", () => {
        expect(crownWarnedListCy.fixedFor).toBe("Wedi'i bennu ar gyfer");
        expect(crownWarnedListCy.caseRef).toBe("Cyfeirnod Achos");
        expect(crownWarnedListCy.defendant).toBe("Enw(au) Diffynyddion");
        expect(crownWarnedListCy.prosecutingAuthority).toBe("Awdurdod Erlyn");
        expect(crownWarnedListCy.linkedCases).toBe("Achosion Cysylltiedig");
        expect(crownWarnedListCy.listingNotes).toBe("Nodiadau Rhestru");
      });
    });

    describe("Locale consistency", () => {
      it("should have same structure in English and Welsh", () => {
        expect(Object.keys(crownWarnedListEn).sort()).toEqual(Object.keys(crownWarnedListCy).sort());
      });

      it("should have same types for each key", () => {
        Object.keys(crownWarnedListEn).forEach((key) => {
          const enType = typeof crownWarnedListEn[key as keyof typeof crownWarnedListEn];
          const cyType = typeof crownWarnedListCy[key as keyof typeof crownWarnedListCy];
          expect(enType).toBe(cyType);
        });
      });
    });
  });

  describe("Template rendering", () => {
    const baseData = {
      t: crownWarnedListEn,
      header: {
        locationName: "Birmingham Crown Court",
        addressLines: ["The Priory Courts", "33 Bull Street", "Birmingham", "B4 6DS"],
        dateRange: "15 January 2026 to 19 January 2026",
        lastUpdated: "14 January 2026 at 12:00pm",
        weekCommencing: "13 January 2026",
        version: "1.0"
      },
      openJustice: {
        venueName: "Birmingham Crown Court",
        email: "",
        phone: "0121 681 3400"
      },
      dataSource: "CPP",
      groupedCategories: []
    };

    describe("Header section", () => {
      it("should render page title with location name", () => {
        const { html } = render(env, "crown-warned-list.njk", baseData);
        expect(html).toContain("Crown Warned List for");
        expect(html).toContain("Birmingham Crown Court");
      });

      it("should render address lines", () => {
        const { html } = render(env, "crown-warned-list.njk", baseData);
        expect(html).toContain("The Priory Courts");
        expect(html).toContain("33 Bull Street");
        expect(html).toContain("Birmingham");
        expect(html).toContain("B4 6DS");
      });

      it("should render date range", () => {
        const { html } = render(env, "crown-warned-list.njk", baseData);
        expect(html).toContain("15 January 2026 to 19 January 2026");
      });

      it("should render last updated date", () => {
        const { html } = render(env, "crown-warned-list.njk", baseData);
        expect(html).toContain("Last updated");
        expect(html).toContain("14 January 2026 at 12:00pm");
      });

      it("should render version when present", () => {
        const { html } = render(env, "crown-warned-list.njk", baseData);
        expect(html).toContain("Version");
        expect(html).toContain("1.0");
      });

      it("should not render version when empty", () => {
        const data = {
          ...baseData,
          header: { ...baseData.header, version: "" }
        };
        const { html } = render(env, "crown-warned-list.njk", data);
        expect(html).not.toContain("Version");
      });

      it("should render FACT link", () => {
        const { html } = render(env, "crown-warned-list.njk", baseData);
        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("https://www.find-court-tribunal.service.gov.uk/");
      });
    });

    describe("Pre-statement section", () => {
      it("should render week commencing statement when present", () => {
        const { html } = render(env, "crown-warned-list.njk", baseData);
        expect(html).toContain("The undermentioned cases are warned for the hearing period of week commencing");
        expect(html).toContain("13 January 2026");
      });

      it("should render pre-statement suffix paragraphs", () => {
        const { html } = render(env, "crown-warned-list.njk", baseData);
        expect(html).toContain("Listing Officer immediately");
        expect(html).toContain("Crown Prosecution Service unless otherwise stated");
        expect(html).toContain("*denotes a defendant in custody");
      });

      it("should not render pre-statement when weekCommencing is empty", () => {
        const data = {
          ...baseData,
          header: { ...baseData.header, weekCommencing: "" }
        };
        const { html } = render(env, "crown-warned-list.njk", data);
        expect(html).not.toContain("The undermentioned cases are warned");
      });
    });

    describe("Reporting restrictions section", () => {
      it("should render reporting restrictions section", () => {
        const { html } = render(env, "crown-warned-list.njk", baseData);
        expect(html).toContain("Restrictions on publishing or writing about these cases");
        expect(html).toContain("govuk-warning-text");
        expect(html).toContain("Warning");
        expect(html).toContain("contempt of court");
      });

      it("should render reporting restrictions contact information", () => {
        const { html } = render(env, "crown-warned-list.njk", baseData);
        expect(html).toContain("the court directly");
        expect(html).toContain("HM Courts and Tribunals Service on 0330 808 4407");
      });

      it("should render reporting restrictions as list items", () => {
        const { html } = render(env, "crown-warned-list.njk", baseData);
        expect(html).toContain("govuk-list govuk-list--bullet");
      });
    });

    describe("Search section", () => {
      it("should render search input", () => {
        const { html } = render(env, "crown-warned-list.njk", baseData);
        expect(html).toContain("Search Cases");
        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('type="text"');
      });
    });

    describe("Empty categories", () => {
      it("should render with no categories", () => {
        const { html } = render(env, "crown-warned-list.njk", baseData);
        expect(html).toContain('id="court-lists-container"');
        expect(html).toContain("govuk-accordion");
      });
    });

    describe("Category grouping", () => {
      it("should render single category with cases", () => {
        const data = {
          ...baseData,
          groupedCategories: [
            {
              category: "For Trial",
              cases: [
                {
                  fixedFor: "15/01/2026",
                  caseNumber: "T20267890",
                  defendants: "John Smith, Jane Doe",
                  prosecutingAuthority: "Crown Prosecution Service",
                  linkedCases: "",
                  listingNotes: "Trial estimate 3 days",
                  isInCustody: false
                }
              ]
            }
          ]
        };

        const { html } = render(env, "crown-warned-list.njk", data);
        expect(html).toContain("For Trial");
        expect(html).toContain("govuk-accordion__section");
      });

      it("should render TO_BE_ALLOCATED as 'To be allocated'", () => {
        const data = {
          ...baseData,
          groupedCategories: [
            {
              category: "TO_BE_ALLOCATED",
              cases: [
                {
                  fixedFor: "",
                  caseNumber: "T20267891",
                  defendants: "Alice Brown",
                  prosecutingAuthority: "Crown Prosecution Service",
                  linkedCases: "",
                  listingNotes: "",
                  isInCustody: false
                }
              ]
            }
          ]
        };

        const { html } = render(env, "crown-warned-list.njk", data);
        expect(html).toContain("To be allocated");
        expect(html).not.toContain("TO_BE_ALLOCATED");
      });

      it("should render multiple categories", () => {
        const data = {
          ...baseData,
          groupedCategories: [
            {
              category: "For Trial",
              cases: [
                {
                  fixedFor: "15/01/2026",
                  caseNumber: "T20267890",
                  defendants: "John Smith",
                  prosecutingAuthority: "Crown Prosecution Service",
                  linkedCases: "",
                  listingNotes: "",
                  isInCustody: false
                }
              ]
            },
            {
              category: "For Sentence",
              cases: [
                {
                  fixedFor: "16/01/2026",
                  caseNumber: "T20267891",
                  defendants: "Jane Doe",
                  prosecutingAuthority: "Crown Prosecution Service",
                  linkedCases: "",
                  listingNotes: "",
                  isInCustody: false
                }
              ]
            }
          ]
        };

        const { html } = render(env, "crown-warned-list.njk", data);
        expect(html).toContain("For Trial");
        expect(html).toContain("For Sentence");
      });
    });

    describe("Case table rendering", () => {
      it("should render table headers", () => {
        const data = {
          ...baseData,
          groupedCategories: [
            {
              category: "For Trial",
              cases: []
            }
          ]
        };

        const { html } = render(env, "crown-warned-list.njk", data);
        expect(html).toContain("Fixed For");
        expect(html).toContain("Case Reference");
        expect(html).toContain("Defendant Name(s)");
        expect(html).toContain("Prosecuting Authority");
        expect(html).toContain("Linked Cases");
        expect(html).toContain("Listing Notes");
      });

      it("should render sortable table", () => {
        const data = {
          ...baseData,
          groupedCategories: [
            {
              category: "For Trial",
              cases: []
            }
          ]
        };

        const { html } = render(env, "crown-warned-list.njk", data);
        expect(html).toContain('data-module="moj-sortable-table"');
        expect(html).toContain('aria-sort="none"');
      });

      it("should render case with all data", () => {
        const data = {
          ...baseData,
          groupedCategories: [
            {
              category: "For Trial",
              cases: [
                {
                  fixedFor: "15/01/2026",
                  caseNumber: "T20267890",
                  defendants: "John Smith, Jane Doe",
                  prosecutingAuthority: "Crown Prosecution Service",
                  linkedCases: "T20267891, T20267892",
                  listingNotes: "Trial estimate 3 days",
                  isInCustody: false
                }
              ]
            }
          ]
        };

        const { html } = render(env, "crown-warned-list.njk", data);
        expect(html).toContain("15/01/2026");
        expect(html).toContain("T20267890");
        expect(html).toContain("John Smith, Jane Doe");
        expect(html).toContain("Crown Prosecution Service");
        expect(html).toContain("T20267891, T20267892");
        expect(html).toContain("Trial estimate 3 days");
      });

      it("should render custody indicator when defendant is in custody", () => {
        const data = {
          ...baseData,
          groupedCategories: [
            {
              category: "For Trial",
              cases: [
                {
                  fixedFor: "15/01/2026",
                  caseNumber: "T20267890",
                  defendants: "John Smith",
                  prosecutingAuthority: "Crown Prosecution Service",
                  linkedCases: "",
                  listingNotes: "",
                  isInCustody: true
                }
              ]
            }
          ]
        };

        const { html } = render(env, "crown-warned-list.njk", data);
        expect(html).toContain('<span aria-hidden="true">*</span>');
        expect(html).toContain("John Smith");
      });

      it("should not render custody indicator when defendant is not in custody", () => {
        const data = {
          ...baseData,
          groupedCategories: [
            {
              category: "For Trial",
              cases: [
                {
                  fixedFor: "15/01/2026",
                  caseNumber: "T20267890",
                  defendants: "John Smith",
                  prosecutingAuthority: "Crown Prosecution Service",
                  linkedCases: "",
                  listingNotes: "",
                  isInCustody: false
                }
              ]
            }
          ]
        };

        const { html } = render(env, "crown-warned-list.njk", data);
        expect(html).not.toContain('<span aria-hidden="true">*</span>John Smith');
      });

      it("should handle empty fields gracefully", () => {
        const data = {
          ...baseData,
          groupedCategories: [
            {
              category: "For Trial",
              cases: [
                {
                  fixedFor: "",
                  caseNumber: "T20267890",
                  defendants: "",
                  prosecutingAuthority: "",
                  linkedCases: "",
                  listingNotes: "",
                  isInCustody: false
                }
              ]
            }
          ]
        };

        const { html } = render(env, "crown-warned-list.njk", data);
        expect(html).toContain("T20267890");
      });

      it("should render multiple cases in one category", () => {
        const data = {
          ...baseData,
          groupedCategories: [
            {
              category: "For Trial",
              cases: [
                {
                  fixedFor: "15/01/2026",
                  caseNumber: "T20267890",
                  defendants: "John Smith",
                  prosecutingAuthority: "Crown Prosecution Service",
                  linkedCases: "",
                  listingNotes: "",
                  isInCustody: false
                },
                {
                  fixedFor: "16/01/2026",
                  caseNumber: "T20267891",
                  defendants: "Jane Doe",
                  prosecutingAuthority: "Crown Prosecution Service",
                  linkedCases: "",
                  listingNotes: "",
                  isInCustody: true
                },
                {
                  fixedFor: "17/01/2026",
                  caseNumber: "T20267892",
                  defendants: "Bob Brown",
                  prosecutingAuthority: "CPS",
                  linkedCases: "T20267890",
                  listingNotes: "Linked to Smith trial",
                  isInCustody: false
                }
              ]
            }
          ]
        };

        const { html } = render(env, "crown-warned-list.njk", data);
        expect(html).toContain("T20267890");
        expect(html).toContain("John Smith");
        expect(html).toContain("T20267891");
        expect(html).toContain("Jane Doe");
        expect(html).toContain("T20267892");
        expect(html).toContain("Bob Brown");
        expect(html).toContain("Linked to Smith trial");
      });
    });

    describe("Footer section", () => {
      it("should render data source", () => {
        const { html } = render(env, "crown-warned-list.njk", baseData);
        expect(html).toContain("Data Source");
        expect(html).toContain("CPP");
      });

      it("should render back to top link", () => {
        const { html } = render(env, "crown-warned-list.njk", baseData);
        expect(html).toContain("Back to top");
        expect(html).toContain('href="#top"');
      });
    });

    describe("Welsh rendering", () => {
      it("should render with Welsh locale", () => {
        const welshData = {
          ...baseData,
          t: crownWarnedListCy
        };

        const { html } = render(env, "crown-warned-list.njk", welshData);
        expect(html).toContain("Rhestr Rybuddiol y Goron ar gyfer");
        expect(html).toContain("Diweddarwyd ddiwethaf");
        expect(html).toContain("Fersiwn");
        expect(html).toContain("Chwilio Achosion");
      });

      it("should render Welsh table headers", () => {
        const welshData = {
          ...baseData,
          t: crownWarnedListCy,
          groupedCategories: [
            {
              category: "Ar gyfer Treial",
              cases: [
                {
                  fixedFor: "15/01/2026",
                  caseNumber: "T20267890",
                  defendants: "John Smith",
                  prosecutingAuthority: "Gwasanaeth Erlyn y Goron",
                  linkedCases: "",
                  listingNotes: "",
                  isInCustody: false
                }
              ]
            }
          ]
        };

        const { html } = render(env, "crown-warned-list.njk", welshData);
        expect(html).toContain("Wedi&#39;i bennu ar gyfer");
        expect(html).toContain("Cyfeirnod Achos");
        expect(html).toContain("Enw(au) Diffynyddion");
        expect(html).toContain("Awdurdod Erlyn");
        expect(html).toContain("Achosion Cysylltiedig");
        expect(html).toContain("Nodiadau Rhestru");
      });

      it("should render Welsh pre-statement when present", () => {
        const welshData = {
          ...baseData,
          t: crownWarnedListCy
        };

        const { html } = render(env, "crown-warned-list.njk", welshData);
        expect(html).toContain("Mae&#39;r achosion a grybwyllir isod");
      });

      it("should render Welsh TO_BE_ALLOCATED label", () => {
        const welshData = {
          ...baseData,
          t: crownWarnedListCy,
          groupedCategories: [
            {
              category: "TO_BE_ALLOCATED",
              cases: [
                {
                  fixedFor: "",
                  caseNumber: "T20267890",
                  defendants: "John Smith",
                  prosecutingAuthority: "Gwasanaeth Erlyn y Goron",
                  linkedCases: "",
                  listingNotes: "",
                  isInCustody: false
                }
              ]
            }
          ]
        };

        const { html } = render(env, "crown-warned-list.njk", welshData);
        expect(html).toContain("I&#39;w ddyrannu");
      });
    });

    describe("Accordion component", () => {
      it("should render accordion container", () => {
        const { html } = render(env, "crown-warned-list.njk", baseData);
        expect(html).toContain('class="govuk-accordion"');
        expect(html).toContain('data-module="govuk-accordion"');
        expect(html).toContain('id="accordion-warned-list"');
      });

      it("should render accordion sections as expanded", () => {
        const data = {
          ...baseData,
          groupedCategories: [
            {
              category: "For Trial",
              cases: []
            }
          ]
        };

        const { html } = render(env, "crown-warned-list.njk", data);
        expect(html).toContain("govuk-accordion__section--expanded");
      });

      it("should render accordion section header", () => {
        const data = {
          ...baseData,
          groupedCategories: [
            {
              category: "For Trial",
              cases: []
            }
          ]
        };

        const { html } = render(env, "crown-warned-list.njk", data);
        expect(html).toContain("govuk-accordion__section-header");
        expect(html).toContain("govuk-accordion__section-heading");
        expect(html).toContain("govuk-accordion__section-button");
      });

      it("should render accordion section content", () => {
        const data = {
          ...baseData,
          groupedCategories: [
            {
              category: "For Trial",
              cases: []
            }
          ]
        };

        const { html } = render(env, "crown-warned-list.njk", data);
        expect(html).toContain("govuk-accordion__section-content");
      });
    });

    describe("Custom styles", () => {
      it("should include custom CSS in head block", () => {
        const { html } = render(env, "crown-warned-list.njk", baseData);
        expect(html).toContain("govuk-accordion__controls");
        expect(html).toContain("no-wrap");
        expect(html).toContain("white-space: nowrap");
        expect(html).toContain("restriction-list-section");
        expect(html).toContain("overflow-table");
      });
    });
  });
});
