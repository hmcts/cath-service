import path from "node:path";
import { fileURLToPath } from "node:url";
import { sjpPublicListCy, sjpPublicListEn } from "@hmcts/sjp-public-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");

describe("sjp-public-list.njk", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([__dirname, webCoreViews]);

    // Add custom filters for date/time formatting
    env.addFilter("date", (value: string | Date) => {
      if (!value) return "";
      const date = typeof value === "string" ? new Date(value) : value;
      return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    });

    env.addFilter("time12", (value: string | Date) => {
      if (!value) return "";
      const date = typeof value === "string" ? new Date(value) : value;
      return date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
    });
  });

  describe("Locale content", () => {
    describe("English locale", () => {
      it("should have all required keys in SJP_PUBLIC_LIST", () => {
        expect(sjpPublicListEn.SJP_PUBLIC_LIST).toHaveProperty("title");
      });

      it("should have all required keys in SJP_DELTA_PUBLIC_LIST", () => {
        expect(sjpPublicListEn.SJP_DELTA_PUBLIC_LIST).toHaveProperty("title");
      });

      it("should have all required keys in common", () => {
        const requiredKeys = [
          "listContaining",
          "casesText",
          "generatedOn",
          "at",
          "filterTitle",
          "selectedFilters",
          "searchLabel",
          "showFilters",
          "hideFilters",
          "postcodeFilterHeading",
          "postcodeLabel",
          "londonPostcodesLabel",
          "prosecutorFilterHeading",
          "prosecutorLabel",
          "selectProsecutor",
          "clearFilters",
          "applyFilters",
          "nameHeader",
          "postcodeHeader",
          "offenceHeader",
          "prosecutorHeader",
          "noCasesFound",
          "previous",
          "next",
          "backToTop",
          "errorSummaryTitle",
          "errorInvalidPostcode",
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText"
        ];

        requiredKeys.forEach((key) => {
          expect(sjpPublicListEn.common).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(sjpPublicListEn.SJP_PUBLIC_LIST.title).toBe("Single Justice Procedure cases that are ready for hearing (Full list)");
        expect(sjpPublicListEn.SJP_DELTA_PUBLIC_LIST.title).toBe("Single Justice Procedure cases that are ready for hearing (New cases)");
        expect(sjpPublicListEn.common.listContaining).toBe("List containing");
        expect(sjpPublicListEn.common.casesText).toBe("case(s)");
        expect(sjpPublicListEn.common.generatedOn).toBe("generated on");
        expect(sjpPublicListEn.common.at).toBe("at");
      });

      it("should have correct filter labels", () => {
        expect(sjpPublicListEn.common.filterTitle).toBe("Filter");
        expect(sjpPublicListEn.common.selectedFilters).toBe("Selected filters");
        expect(sjpPublicListEn.common.showFilters).toBe("Show filters");
        expect(sjpPublicListEn.common.hideFilters).toBe("Hide filters");
        expect(sjpPublicListEn.common.postcodeFilterHeading).toBe("Postcode");
        expect(sjpPublicListEn.common.prosecutorFilterHeading).toBe("Prosecutor");
        expect(sjpPublicListEn.common.applyFilters).toBe("Apply filters");
        expect(sjpPublicListEn.common.clearFilters).toBe("Clear filters");
      });

      it("should have correct table headers", () => {
        expect(sjpPublicListEn.common.nameHeader).toBe("Name");
        expect(sjpPublicListEn.common.postcodeHeader).toBe("Postcode");
        expect(sjpPublicListEn.common.offenceHeader).toBe("Offence");
        expect(sjpPublicListEn.common.prosecutorHeader).toBe("Prosecutor");
      });

      it("should have correct navigation labels", () => {
        expect(sjpPublicListEn.common.previous).toBe("Previous");
        expect(sjpPublicListEn.common.next).toBe("Next");
        expect(sjpPublicListEn.common.backToTop).toBe("Back to top");
      });
    });

    describe("Welsh locale", () => {
      it("should have all required keys in SJP_PUBLIC_LIST", () => {
        expect(sjpPublicListCy.SJP_PUBLIC_LIST).toHaveProperty("title");
      });

      it("should have all required keys in SJP_DELTA_PUBLIC_LIST", () => {
        expect(sjpPublicListCy.SJP_DELTA_PUBLIC_LIST).toHaveProperty("title");
      });

      it("should have all required keys in common", () => {
        const requiredKeys = [
          "listContaining",
          "casesText",
          "generatedOn",
          "at",
          "filterTitle",
          "selectedFilters",
          "searchLabel",
          "showFilters",
          "hideFilters",
          "postcodeFilterHeading",
          "postcodeLabel",
          "londonPostcodesLabel",
          "prosecutorFilterHeading",
          "prosecutorLabel",
          "selectProsecutor",
          "clearFilters",
          "applyFilters",
          "nameHeader",
          "postcodeHeader",
          "offenceHeader",
          "prosecutorHeader",
          "noCasesFound",
          "previous",
          "next",
          "backToTop",
          "errorSummaryTitle",
          "errorInvalidPostcode",
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText"
        ];

        requiredKeys.forEach((key) => {
          expect(sjpPublicListCy.common).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(sjpPublicListCy.SJP_PUBLIC_LIST.title).toBe("Achosion Gweithdrefn Un Ynad sy'n barod ar gyfer gwrandawiad (Rhestr Lawn)");
        expect(sjpPublicListCy.SJP_DELTA_PUBLIC_LIST.title).toBe("Achosion Gweithdrefn Un Ynad sy'n barod ar gyfer gwrandawiad (Achosion Newydd)");
        expect(sjpPublicListCy.common.listContaining).toBe("Rhestr sy'n cynnwys");
        expect(sjpPublicListCy.common.generatedOn).toBe("a gynhyrchwyd ar");
        expect(sjpPublicListCy.common.at).toBe("am");
      });

      it("should have correct filter labels", () => {
        expect(sjpPublicListCy.common.filterTitle).toBe("Hidlydd");
        expect(sjpPublicListCy.common.selectedFilters).toBe("Hidlwyr a ddewiswyd");
        expect(sjpPublicListCy.common.showFilters).toBe("Dangos hidlwyr");
        expect(sjpPublicListCy.common.hideFilters).toBe("Cuddio hidlwyr");
        expect(sjpPublicListCy.common.postcodeFilterHeading).toBe("Cod post");
        expect(sjpPublicListCy.common.prosecutorFilterHeading).toBe("Erlynydd");
      });

      it("should have correct table headers", () => {
        expect(sjpPublicListCy.common.nameHeader).toBe("Enw");
        expect(sjpPublicListCy.common.postcodeHeader).toBe("Cod post");
        expect(sjpPublicListCy.common.offenceHeader).toBe("Trosedd");
        expect(sjpPublicListCy.common.prosecutorHeader).toBe("Erlynydd");
      });
    });

    describe("Locale consistency", () => {
      it("should have same structure in English and Welsh for SJP_PUBLIC_LIST", () => {
        expect(Object.keys(sjpPublicListEn.SJP_PUBLIC_LIST).sort()).toEqual(Object.keys(sjpPublicListCy.SJP_PUBLIC_LIST).sort());
      });

      it("should have same structure in English and Welsh for SJP_DELTA_PUBLIC_LIST", () => {
        expect(Object.keys(sjpPublicListEn.SJP_DELTA_PUBLIC_LIST).sort()).toEqual(Object.keys(sjpPublicListCy.SJP_DELTA_PUBLIC_LIST).sort());
      });

      it("should have same structure in English and Welsh for common", () => {
        expect(Object.keys(sjpPublicListEn.common).sort()).toEqual(Object.keys(sjpPublicListCy.common).sort());
      });

      it("should have same types for each key in common", () => {
        Object.keys(sjpPublicListEn.common).forEach((key) => {
          const enType = typeof sjpPublicListEn.common[key as keyof typeof sjpPublicListEn.common];
          const cyType = typeof sjpPublicListCy.common[key as keyof typeof sjpPublicListCy.common];
          expect(enType).toBe(cyType);
        });
      });
    });
  });

  describe("Template rendering", () => {
    const baseData = {
      title: sjpPublicListEn.SJP_PUBLIC_LIST.title,
      ...sjpPublicListEn.common,
      list: {
        artefactId: "test-artefact-123",
        generatedAt: new Date("2026-07-10T14:30:00Z")
      },
      cases: [],
      casesRows: [],
      totalCases: 0,
      prosecutors: [],
      postcodeAreas: [],
      hasLondonPostcodes: false,
      londonPostcodes: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        hasPrevious: false,
        hasNext: false,
        pageNumbers: [1]
      },
      filters: {
        postcodes: [],
        prosecutors: []
      },
      sortBy: "",
      sortOrder: "asc",
      showFilter: false,
      cspNonce: "test-nonce"
    };

    describe("Page header", () => {
      it("should render page title", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain("Single Justice Procedure cases that are ready for hearing (Full list)");
      });

      it("should render delta list title when provided", () => {
        const data = {
          ...baseData,
          title: sjpPublicListEn.SJP_DELTA_PUBLIC_LIST.title
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("Single Justice Procedure cases that are ready for hearing (New cases)");
      });

      it("should render FACT link", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("https://www.find-court-tribunal.service.gov.uk/");
        expect(html).toContain("in England and Wales");
      });

      it("should render list summary with total cases", () => {
        const data = {
          ...baseData,
          totalCases: 42
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("List containing");
        expect(html).toContain("42");
        expect(html).toContain("case(s)");
      });

      it("should render generated date and time", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain("generated on");
        expect(html).toContain("10 July 2026");
        expect(html).toContain("at");
        expect(html).toContain("3:30 pm");
      });
    });

    describe("Filter button", () => {
      it("should render show filters button when filters are hidden", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain("Show filters");
        expect(html).toContain('id="filter-toggle"');
      });

      it("should render hide filters button when filters are shown", () => {
        const data = {
          ...baseData,
          showFilter: true
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("Hide filters");
      });

      it("should render hide filters button when postcodes are filtered", () => {
        const data = {
          ...baseData,
          filters: {
            postcodes: ["SW1A"],
            prosecutors: []
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("Hide filters");
      });

      it("should render hide filters button when prosecutors are filtered", () => {
        const data = {
          ...baseData,
          filters: {
            postcodes: [],
            prosecutors: ["CPS"]
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("Hide filters");
      });
    });

    describe("Pagination", () => {
      it("should not render pagination when only one page", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).not.toContain("govuk-pagination");
      });

      it("should render pagination when multiple pages exist", () => {
        const data = {
          ...baseData,
          pagination: {
            currentPage: 2,
            totalPages: 5,
            hasPrevious: true,
            hasNext: true,
            pageNumbers: [1, 2, 3, 4, 5]
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("govuk-pagination");
        expect(html).toContain("Previous");
        expect(html).toContain("Next");
      });

      it("should not render previous link on first page", () => {
        const data = {
          ...baseData,
          pagination: {
            currentPage: 1,
            totalPages: 3,
            hasPrevious: false,
            hasNext: true,
            pageNumbers: [1, 2, 3]
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).not.toContain("govuk-pagination__prev");
      });

      it("should not render next link on last page", () => {
        const data = {
          ...baseData,
          pagination: {
            currentPage: 3,
            totalPages: 3,
            hasPrevious: true,
            hasNext: false,
            pageNumbers: [1, 2, 3]
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).not.toContain("govuk-pagination__next");
      });

      it("should render page numbers", () => {
        const data = {
          ...baseData,
          pagination: {
            currentPage: 2,
            totalPages: 4,
            hasPrevious: true,
            hasNext: true,
            pageNumbers: [1, 2, 3, 4]
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain('aria-label="Page 1"');
        expect(html).toContain('aria-label="Page 2"');
        expect(html).toContain('aria-label="Page 3"');
        expect(html).toContain('aria-label="Page 4"');
      });

      it("should mark current page as active", () => {
        const data = {
          ...baseData,
          pagination: {
            currentPage: 2,
            totalPages: 3,
            hasPrevious: true,
            hasNext: true,
            pageNumbers: [1, 2, 3]
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain('aria-current="page"');
        expect(html).toContain("govuk-pagination__item--current");
      });

      it("should include filter parameters in pagination links", () => {
        const data = {
          ...baseData,
          filters: {
            postcodes: ["SW1A", "E1"],
            prosecutors: ["CPS", "TfL"]
          },
          pagination: {
            currentPage: 2,
            totalPages: 3,
            hasPrevious: true,
            hasNext: true,
            pageNumbers: [1, 2, 3]
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("postcode=SW1A");
        expect(html).toContain("postcode=E1");
        expect(html).toContain("prosecutor=CPS");
        expect(html).toContain("prosecutor=TfL");
      });
    });

    describe("Filter panel", () => {
      it("should be hidden by default", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain('class="filter-form layout-width-two-filters hidden"');
      });

      it("should be visible when showFilter is true", () => {
        const data = {
          ...baseData,
          showFilter: true
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).not.toContain('class="filter-form layout-width-two-filters hidden"');
      });

      it("should be visible when filters are applied", () => {
        const data = {
          ...baseData,
          filters: {
            postcodes: ["SW1A"],
            prosecutors: []
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).not.toContain('class="filter-form layout-width-two-filters hidden"');
      });

      it("should render filter title", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain("Filter");
      });

      it("should render selected filters heading", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain("Selected filters");
      });

      it("should render clear filters link", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain("Clear filters");
        expect(html).toContain("showFilter=true");
      });

      it("should render apply filters button", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain("Apply filters");
      });

      it("should render filter search input", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain("Search filters");
        expect(html).toContain('id="filter-search"');
      });

      it("should include hidden artefactId field", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain('name="artefactId"');
        expect(html).toContain('value="test-artefact-123"');
      });
    });

    describe("Selected filter tags", () => {
      it("should not render tags when no filters selected", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).not.toContain('class="filter-tag"');
      });

      it("should render postcode filter tags", () => {
        const data = {
          ...baseData,
          filters: {
            postcodes: ["SW1A", "E1"],
            prosecutors: []
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("SW1A");
        expect(html).toContain("E1");
        expect(html).toContain('class="filter-tag"');
      });

      it("should render prosecutor filter tags", () => {
        const data = {
          ...baseData,
          filters: {
            postcodes: [],
            prosecutors: ["CPS", "TfL"]
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("CPS");
        expect(html).toContain("TfL");
        expect(html).toContain('class="filter-tag"');
      });

      it("should render remove link for each filter tag", () => {
        const data = {
          ...baseData,
          filters: {
            postcodes: ["SW1A"],
            prosecutors: ["CPS"]
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain('aria-label="Remove SW1A filter"');
        expect(html).toContain('aria-label="Remove CPS filter"');
        expect(html).toContain('class="filter-tag-remove"');
      });

      it("should render remove links that preserve other filters", () => {
        const data = {
          ...baseData,
          filters: {
            postcodes: ["SW1A", "E1"],
            prosecutors: ["CPS"]
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("prosecutor=CPS");
      });
    });

    describe("Postcode filter", () => {
      it("should render postcode filter heading", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain("Postcode");
        expect(html).toContain('id="postcodes-anchor"');
      });

      it("should render postcode checkboxes", () => {
        const data = {
          ...baseData,
          postcodeAreas: ["SW1A", "E1", "N1"]
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("SW1A");
        expect(html).toContain("E1");
        expect(html).toContain("N1");
        expect(html).toContain('name="postcode"');
      });

      it("should check selected postcodes", () => {
        const data = {
          ...baseData,
          postcodeAreas: ["SW1A", "E1", "N1"],
          filters: {
            postcodes: ["SW1A", "N1"],
            prosecutors: []
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain('value="SW1A" checked');
        expect(html).toContain('value="N1" checked');
      });

      it("should not check unselected postcodes", () => {
        const data = {
          ...baseData,
          postcodeAreas: ["SW1A", "E1"],
          filters: {
            postcodes: ["SW1A"],
            prosecutors: []
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        const e1Regex = /value="E1"(?!.*checked)/;
        expect(html).toMatch(e1Regex);
      });

      it("should render London postcodes checkbox when available", () => {
        const data = {
          ...baseData,
          postcodeAreas: ["SW1A"],
          hasLondonPostcodes: true
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("London Postcodes");
        expect(html).toContain('id="postcode-london"');
        expect(html).toContain('value="LONDON_POSTCODES"');
      });

      it("should not render London postcodes checkbox when not available", () => {
        const data = {
          ...baseData,
          postcodeAreas: ["SW1A"],
          hasLondonPostcodes: false
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).not.toContain("London Postcodes");
      });

      it("should check London postcodes when selected", () => {
        const data = {
          ...baseData,
          hasLondonPostcodes: true,
          filters: {
            postcodes: ["LONDON_POSTCODES"],
            prosecutors: []
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain('value="LONDON_POSTCODES" checked');
      });
    });

    describe("Prosecutor filter", () => {
      it("should render prosecutor filter heading", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain("Prosecutor");
        expect(html).toContain('id="prosecutor-anchor"');
      });

      it("should render prosecutor checkboxes", () => {
        const data = {
          ...baseData,
          prosecutors: ["CPS", "TfL", "Local Authority"]
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("CPS");
        expect(html).toContain("TfL");
        expect(html).toContain("Local Authority");
        expect(html).toContain('name="prosecutor"');
      });

      it("should check selected prosecutors", () => {
        const data = {
          ...baseData,
          prosecutors: ["CPS", "TfL"],
          filters: {
            postcodes: [],
            prosecutors: ["CPS"]
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain('value="CPS" checked');
      });

      it("should not check unselected prosecutors", () => {
        const data = {
          ...baseData,
          prosecutors: ["CPS", "TfL"],
          filters: {
            postcodes: [],
            prosecutors: ["CPS"]
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        const tflRegex = /value="TfL"(?!.*checked)/;
        expect(html).toMatch(tflRegex);
      });
    });

    describe("Cases table", () => {
      it("should render table with headers", () => {
        const data = {
          ...baseData,
          cases: [
            {
              name: "John Smith",
              postcode: "SW1A 1AA",
              offence: "Speeding",
              prosecutor: "CPS"
            }
          ],
          casesRows: [[{ text: "John Smith" }, { text: "SW1A 1AA" }, { text: "Speeding" }, { text: "CPS" }]]
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("Name");
        expect(html).toContain("Postcode");
        expect(html).toContain("Offence");
        expect(html).toContain("Prosecutor");
        expect(html).toContain("moj-sortable-table");
      });

      it("should render case data", () => {
        const data = {
          ...baseData,
          cases: [
            {
              name: "John Smith",
              postcode: "SW1A 1AA",
              offence: "Speeding",
              prosecutor: "CPS"
            }
          ],
          casesRows: [[{ text: "John Smith" }, { text: "SW1A 1AA" }, { text: "Speeding" }, { text: "CPS" }]]
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("John Smith");
        expect(html).toContain("SW1A 1AA");
        expect(html).toContain("Speeding");
        expect(html).toContain("CPS");
      });

      it("should render multiple cases", () => {
        const data = {
          ...baseData,
          cases: [
            {
              name: "John Smith",
              postcode: "SW1A 1AA",
              offence: "Speeding",
              prosecutor: "CPS"
            },
            {
              name: "Jane Doe",
              postcode: "E1 6AN",
              offence: "No insurance",
              prosecutor: "TfL"
            }
          ],
          casesRows: [
            [{ text: "John Smith" }, { text: "SW1A 1AA" }, { text: "Speeding" }, { text: "CPS" }],
            [{ text: "Jane Doe" }, { text: "E1 6AN" }, { text: "No insurance" }, { text: "TfL" }]
          ]
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("John Smith");
        expect(html).toContain("Jane Doe");
        expect(html).toContain("SW1A 1AA");
        expect(html).toContain("E1 6AN");
      });

      it("should render case with empty postcode", () => {
        const data = {
          ...baseData,
          cases: [
            {
              name: "John Smith",
              postcode: null,
              offence: "Speeding",
              prosecutor: "CPS"
            }
          ],
          casesRows: [[{ text: "John Smith" }, { text: "" }, { text: "Speeding" }, { text: "CPS" }]]
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("John Smith");
        expect(html).toContain("Speeding");
      });

      it("should render case with empty offence", () => {
        const data = {
          ...baseData,
          cases: [
            {
              name: "John Smith",
              postcode: "SW1A 1AA",
              offence: null,
              prosecutor: "CPS"
            }
          ],
          casesRows: [[{ text: "John Smith" }, { text: "SW1A 1AA" }, { text: "" }, { text: "CPS" }]]
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("John Smith");
        expect(html).toContain("SW1A 1AA");
      });

      it("should render no cases found message when empty", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain("No cases found");
      });
    });

    describe("Back to top link", () => {
      it("should render back to top link", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain("Back to top");
        expect(html).toContain("back-to-top-link");
      });
    });

    describe("JavaScript section", () => {
      it("should include filter toggle script", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain("document.getElementById('filter-toggle')");
        expect(html).toContain("document.getElementById('filter-panel')");
        expect(html).toContain("document.getElementById('content-area')");
      });

      it("should include filter section toggle script", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain("setupFilterToggle('postcodes-anchor', 'postcodes-link', 'postcodes-checkbox')");
        expect(html).toContain("setupFilterToggle('prosecutor-anchor', 'prosecutor-link', 'prosecutor-checkbox')");
      });

      it("should include CSP nonce in script tag", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain('nonce="test-nonce"');
      });

      it("should use correct hide filters text in script", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain("filterToggle.textContent = 'Hide filters'");
      });

      it("should use correct show filters text in script", () => {
        const { html } = render(env, "sjp-public-list.njk", baseData);
        expect(html).toContain("filterToggle.textContent = 'Show filters'");
      });
    });

    describe("Welsh rendering", () => {
      const welshData = {
        title: sjpPublicListCy.SJP_PUBLIC_LIST.title,
        ...sjpPublicListCy.common,
        list: {
          artefactId: "test-artefact-123",
          generatedAt: new Date("2026-07-10T14:30:00Z")
        },
        cases: [],
        casesRows: [],
        totalCases: 5,
        prosecutors: ["CPS"],
        postcodeAreas: ["SW1A"],
        hasLondonPostcodes: true,
        londonPostcodes: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          hasPrevious: false,
          hasNext: false,
          pageNumbers: [1]
        },
        filters: {
          postcodes: [],
          prosecutors: []
        },
        sortBy: "",
        sortOrder: "asc",
        showFilter: false,
        cspNonce: "test-nonce"
      };

      it("should render Welsh page title", () => {
        const { html } = render(env, "sjp-public-list.njk", welshData);
        expect(html).toContain("Achosion Gweithdrefn Un Ynad sy&#39;n barod ar gyfer gwrandawiad (Rhestr Lawn)");
      });

      it("should render Welsh list summary", () => {
        const { html } = render(env, "sjp-public-list.njk", welshData);
        expect(html).toContain("Rhestr sy&#39;n cynnwys");
        expect(html).toContain("a gynhyrchwyd ar");
        expect(html).toContain("am");
      });

      it("should render Welsh filter labels", () => {
        const { html } = render(env, "sjp-public-list.njk", welshData);
        expect(html).toContain("Hidlydd");
        expect(html).toContain("Hidlwyr a ddewiswyd");
        expect(html).toContain("Dangos hidlwyr");
        expect(html).toContain("Cod post");
        expect(html).toContain("Erlynydd");
      });

      it("should render Welsh table headers", () => {
        const data = {
          ...welshData,
          cases: [
            {
              name: "John Smith",
              postcode: "SW1A 1AA",
              offence: "Goryrru",
              prosecutor: "CPS"
            }
          ],
          casesRows: [[{ text: "John Smith" }, { text: "SW1A 1AA" }, { text: "Goryrru" }, { text: "CPS" }]]
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("Enw");
        expect(html).toContain("Cod post");
        expect(html).toContain("Trosedd");
        expect(html).toContain("Erlynydd");
      });

      it("should render Welsh no cases found message", () => {
        const { html } = render(env, "sjp-public-list.njk", welshData);
        expect(html).toContain("Dim achosion wedi&#39;u darganfod");
      });

      it("should render Welsh back to top link", () => {
        const { html } = render(env, "sjp-public-list.njk", welshData);
        expect(html).toContain("Yn ôl i frig y dudalen");
      });

      it("should use Welsh text in JavaScript", () => {
        const { html } = render(env, "sjp-public-list.njk", welshData);
        expect(html).toContain("filterToggle.textContent = 'Cuddio hidlwyr'");
        expect(html).toContain("filterToggle.textContent = 'Dangos hidlwyr'");
      });
    });

    describe("Edge cases", () => {
      it("should handle zero cases", () => {
        const data = {
          ...baseData,
          totalCases: 0
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("0");
        expect(html).toContain("case(s)");
        expect(html).toContain("No cases found");
      });

      it("should handle single case", () => {
        const data = {
          ...baseData,
          totalCases: 1,
          cases: [
            {
              name: "Single Case",
              postcode: "SW1A 1AA",
              offence: "Speeding",
              prosecutor: "CPS"
            }
          ],
          casesRows: [[{ text: "Single Case" }, { text: "SW1A 1AA" }, { text: "Speeding" }, { text: "CPS" }]]
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("1");
        expect(html).toContain("case(s)");
        expect(html).toContain("Single Case");
      });

      it("should handle empty prosecutors list", () => {
        const data = {
          ...baseData,
          prosecutors: []
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("Prosecutor");
        expect(html).toContain('id="prosecutor-checkbox"');
      });

      it("should handle empty postcode areas list", () => {
        const data = {
          ...baseData,
          postcodeAreas: []
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).toContain("Postcode");
        expect(html).toContain('id="postcodes-checkbox"');
      });

      it("should handle pagination at boundary pages", () => {
        const data = {
          ...baseData,
          totalCases: 5000,
          pagination: {
            currentPage: 1,
            totalPages: 5,
            hasPrevious: false,
            hasNext: true,
            pageNumbers: [1, 2, 3, 4, 5]
          }
        };
        const { html } = render(env, "sjp-public-list.njk", data);
        expect(html).not.toContain("govuk-pagination__prev");
        expect(html).toContain("govuk-pagination__next");
      });
    });
  });
});
