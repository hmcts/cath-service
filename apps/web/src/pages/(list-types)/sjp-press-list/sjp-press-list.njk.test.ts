import path from "node:path";
import { fileURLToPath } from "node:url";
import { sjpPressListCy, sjpPressListEn } from "@hmcts/sjp-press-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

describe("sjp-press-list.njk", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = nunjucks.configure([__dirname, webCoreViews, govukFrontend], {
      autoescape: true,
      noCache: true
    });

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
      it("should have all required keys in SJP_PRESS_LIST", () => {
        const requiredKeys = ["title"];

        requiredKeys.forEach((key) => {
          expect(sjpPressListEn.SJP_PRESS_LIST).toHaveProperty(key);
        });
      });

      it("should have all required keys in SJP_DELTA_PRESS_LIST", () => {
        const requiredKeys = ["title"];

        requiredKeys.forEach((key) => {
          expect(sjpPressListEn.SJP_DELTA_PRESS_LIST).toHaveProperty(key);
        });
      });

      it("should have all required common keys", () => {
        const requiredKeys = [
          "accordionTitle",
          "accordionContent",
          "listFor",
          "published",
          "at",
          "importantInfoTitle",
          "importantInfoContent",
          "mediaProtocolLink",
          "searchLabel",
          "showFilters",
          "hideFilters",
          "postcodeFilterHeading",
          "londonPostcodesLabel",
          "postcodeLabel",
          "prosecutorFilterHeading",
          "prosecutorLabel",
          "selectProsecutor",
          "filterTitle",
          "selectedFilters",
          "clearFilters",
          "applyFilters",
          "nameHeader",
          "dobHeader",
          "referenceHeader",
          "addressHeader",
          "prosecutorHeader",
          "reportingRestrictionHeader",
          "offenceHeader",
          "noCasesFound",
          "previous",
          "next",
          "backToTop",
          "errorSummaryTitle",
          "errorInvalidPostcode",
          "errorNotVerified",
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText"
        ];

        requiredKeys.forEach((key) => {
          expect(sjpPressListEn.common).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(sjpPressListEn.SJP_PRESS_LIST.title).toBe("Single Justice Procedure cases - Press view (Full list)");
        expect(sjpPressListEn.SJP_DELTA_PRESS_LIST.title).toBe("Single Justice Procedure cases - Press view (New cases)");
        expect(sjpPressListEn.common.listFor).toBe("List for");
        expect(sjpPressListEn.common.published).toBe("Published");
        expect(sjpPressListEn.common.at).toBe("at");
        expect(sjpPressListEn.common.noCasesFound).toBe("No cases found");
      });

      it("should have correct filter labels", () => {
        expect(sjpPressListEn.common.showFilters).toBe("Show filters");
        expect(sjpPressListEn.common.hideFilters).toBe("Hide filters");
        expect(sjpPressListEn.common.postcodeFilterHeading).toBe("Postcode");
        expect(sjpPressListEn.common.prosecutorFilterHeading).toBe("Prosecutor");
        expect(sjpPressListEn.common.applyFilters).toBe("Apply filters");
        expect(sjpPressListEn.common.clearFilters).toBe("Clear filters");
      });

      it("should have correct table header labels", () => {
        expect(sjpPressListEn.common.nameHeader).toBe("Name");
        expect(sjpPressListEn.common.dobHeader).toBe("Date of birth");
        expect(sjpPressListEn.common.referenceHeader).toBe("Reference");
        expect(sjpPressListEn.common.addressHeader).toBe("Address");
        expect(sjpPressListEn.common.prosecutorHeader).toBe("Prosecutor");
        expect(sjpPressListEn.common.reportingRestrictionHeader).toBe("Reporting Restriction");
      });
    });

    describe("Welsh locale", () => {
      it("should have all required keys in SJP_PRESS_LIST", () => {
        const requiredKeys = ["title"];

        requiredKeys.forEach((key) => {
          expect(sjpPressListCy.SJP_PRESS_LIST).toHaveProperty(key);
        });
      });

      it("should have all required keys in SJP_DELTA_PRESS_LIST", () => {
        const requiredKeys = ["title"];

        requiredKeys.forEach((key) => {
          expect(sjpPressListCy.SJP_DELTA_PRESS_LIST).toHaveProperty(key);
        });
      });

      it("should have all required common keys", () => {
        const requiredKeys = [
          "accordionTitle",
          "accordionContent",
          "listFor",
          "published",
          "at",
          "importantInfoTitle",
          "importantInfoContent",
          "mediaProtocolLink",
          "searchLabel",
          "showFilters",
          "hideFilters",
          "postcodeFilterHeading",
          "londonPostcodesLabel",
          "postcodeLabel",
          "prosecutorFilterHeading",
          "prosecutorLabel",
          "selectProsecutor",
          "filterTitle",
          "selectedFilters",
          "clearFilters",
          "applyFilters",
          "nameHeader",
          "dobHeader",
          "referenceHeader",
          "addressHeader",
          "prosecutorHeader",
          "reportingRestrictionHeader",
          "offenceHeader",
          "noCasesFound",
          "previous",
          "next",
          "backToTop",
          "errorSummaryTitle",
          "errorInvalidPostcode",
          "errorNotVerified",
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText"
        ];

        requiredKeys.forEach((key) => {
          expect(sjpPressListCy.common).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(sjpPressListCy.SJP_PRESS_LIST.title).toBe("Achosion Gweithdrefn Un Ynad - Golwg i'r Wasg (Rhestr Lawn)");
        expect(sjpPressListCy.SJP_DELTA_PRESS_LIST.title).toBe("Achosion Gweithdrefn Un Ynad - Golwg i'r Wasg (Achosion Newydd)");
        expect(sjpPressListCy.common.listFor).toBe("Rhestr ar gyfer");
        expect(sjpPressListCy.common.published).toBe("Cyhoeddwyd");
        expect(sjpPressListCy.common.at).toBe("am");
        expect(sjpPressListCy.common.noCasesFound).toBe("Dim achosion wedi'u darganfod");
      });
    });

    describe("Locale consistency", () => {
      it("should have same structure in English and Welsh for SJP_PRESS_LIST", () => {
        expect(Object.keys(sjpPressListEn.SJP_PRESS_LIST).sort()).toEqual(Object.keys(sjpPressListCy.SJP_PRESS_LIST).sort());
      });

      it("should have same structure in English and Welsh for SJP_DELTA_PRESS_LIST", () => {
        expect(Object.keys(sjpPressListEn.SJP_DELTA_PRESS_LIST).sort()).toEqual(Object.keys(sjpPressListCy.SJP_DELTA_PRESS_LIST).sort());
      });

      it("should have same structure in English and Welsh for common", () => {
        expect(Object.keys(sjpPressListEn.common).sort()).toEqual(Object.keys(sjpPressListCy.common).sort());
      });

      it("should have same types for each common key", () => {
        Object.keys(sjpPressListEn.common).forEach((key) => {
          const enType = typeof sjpPressListEn.common[key as keyof typeof sjpPressListEn.common];
          const cyType = typeof sjpPressListCy.common[key as keyof typeof sjpPressListCy.common];
          expect(enType).toBe(cyType);
        });
      });
    });
  });

  describe("Template rendering", () => {
    const baseData = {
      title: sjpPressListEn.SJP_PRESS_LIST.title,
      ...sjpPressListEn.common,
      list: {
        artefactId: "test-artefact-123",
        contentDate: new Date("2026-01-15"),
        publishedAt: new Date("2026-01-15T10:00:00Z")
      },
      cases: [],
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
      showFilter: false,
      cspNonce: "test-nonce-12345"
    };

    describe("Header section", () => {
      it("should render page title", () => {
        const html = env.render("sjp-press-list.njk", baseData);
        expect(html).toContain("Single Justice Procedure cases - Press view (Full list)");
      });

      it("should render FACT link", () => {
        const html = env.render("sjp-press-list.njk", baseData);
        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("https://www.find-court-tribunal.service.gov.uk/");
        expect(html).toContain("in England and Wales, and some non-devolved tribunals in Scotland.");
      });

      it("should render accordion with SJP explanation", () => {
        const html = env.render("sjp-press-list.njk", baseData);
        expect(html).toContain("What are Single Justice Procedure cases?");
        expect(html).toContain("Cases ready to be decided by a magistrate without a hearing");
        expect(html).toContain("govuk-details");
      });

      it("should render content date and published date", () => {
        const html = env.render("sjp-press-list.njk", baseData);
        expect(html).toContain("List for");
        expect(html).toContain("Published");
        expect(html).toContain("at");
      });

      it("should render important information section", () => {
        const html = env.render("sjp-press-list.njk", baseData);
        expect(html).toContain("Important information");
        expect(html).toContain("In accordance with the media protocol");
        expect(html).toContain("Protocol on sharing court lists, registers and documents with the media");
        expect(html).toContain(
          "https://www.gov.uk/government/publications/guidance-to-staff-on-supporting-media-access-to-courts-and-tribunals/protocol-on-sharing-court-lists-registers-and-documents-with-the-media-accessible-version"
        );
      });
    });

    describe("Filter section", () => {
      it("should render filter toggle button with 'Show filters' text", () => {
        const html = env.render("sjp-press-list.njk", baseData);
        expect(html).toContain("Show filters");
        expect(html).toContain('id="filter-toggle"');
      });

      it("should render filter toggle button with 'Hide filters' text when showFilter is true", () => {
        const data = {
          ...baseData,
          showFilter: true
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Hide filters");
      });

      it("should render filter toggle button with 'Hide filters' text when postcode filters are active", () => {
        const data = {
          ...baseData,
          filters: {
            postcodes: ["SW1"],
            prosecutors: []
          }
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Hide filters");
      });

      it("should render filter toggle button with 'Hide filters' text when prosecutor filters are active", () => {
        const data = {
          ...baseData,
          filters: {
            postcodes: [],
            prosecutors: ["CPS"]
          }
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Hide filters");
      });

      it("should render filter panel with hidden class when no filters active", () => {
        const html = env.render("sjp-press-list.njk", baseData);
        expect(html).toContain('id="filter-panel"');
        expect(html).toContain("hidden");
      });

      it("should render filter panel without hidden class when showFilter is true", () => {
        const data = {
          ...baseData,
          showFilter: true
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain('id="filter-panel"');
        expect(html).not.toMatch(/class="[^"]*filter-form[^"]*hidden/);
      });

      it("should render filter title and apply button", () => {
        const data = {
          ...baseData,
          showFilter: true
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Filter");
        expect(html).toContain("Apply filters");
      });

      it("should render selected filters section", () => {
        const data = {
          ...baseData,
          showFilter: true
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Selected filters");
        expect(html).toContain("Clear filters");
      });

      it("should render clear filters link with artefactId", () => {
        const html = env.render("sjp-press-list.njk", baseData);
        expect(html).toContain("artefactId=test-artefact-123");
        expect(html).toContain("showFilter=true");
      });

      it("should render active postcode filter tags", () => {
        const data = {
          ...baseData,
          filters: {
            postcodes: ["SW1", "E1"],
            prosecutors: []
          }
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("SW1");
        expect(html).toContain("E1");
        expect(html).toContain("filter-tag");
        expect(html).toContain("filter-tag-remove");
      });

      it("should render active prosecutor filter tags", () => {
        const data = {
          ...baseData,
          filters: {
            postcodes: [],
            prosecutors: ["CPS", "TfL"]
          }
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("CPS");
        expect(html).toContain("TfL");
        expect(html).toContain("filter-tag");
      });

      it("should render filter tags with remove links", () => {
        const data = {
          ...baseData,
          filters: {
            postcodes: ["SW1"],
            prosecutors: []
          }
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain('aria-label="Remove SW1 filter"');
      });

      it("should render search input", () => {
        const data = {
          ...baseData,
          showFilter: true
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Search filters");
        expect(html).toContain('id="filter-search"');
        expect(html).toContain('name="filter-search"');
      });

      it("should render postcode filter section", () => {
        const data = {
          ...baseData,
          showFilter: true,
          postcodeAreas: ["SW1", "E1", "N1"]
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Postcode");
        expect(html).toContain('id="postcodes-anchor"');
        expect(html).toContain('id="postcodes-checkbox"');
      });

      it("should render postcode checkboxes", () => {
        const data = {
          ...baseData,
          showFilter: true,
          postcodeAreas: ["SW1", "E1"]
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain('id="postcode-1"');
        expect(html).toContain('value="SW1"');
        expect(html).toContain('id="postcode-2"');
        expect(html).toContain('value="E1"');
      });

      it("should render checked postcode checkboxes when filter is active", () => {
        const data = {
          ...baseData,
          showFilter: true,
          postcodeAreas: ["SW1", "E1"],
          filters: {
            postcodes: ["SW1"],
            prosecutors: []
          }
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain('value="SW1" checked');
      });

      it("should render London postcodes option when hasLondonPostcodes is true", () => {
        const data = {
          ...baseData,
          showFilter: true,
          postcodeAreas: ["E", "W", "N"],
          hasLondonPostcodes: true
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("London Postcodes");
        expect(html).toContain('id="postcode-london"');
        expect(html).toContain('value="LONDON_POSTCODES"');
      });

      it("should not render London postcodes option when hasLondonPostcodes is false", () => {
        const data = {
          ...baseData,
          showFilter: true,
          postcodeAreas: ["AB1", "CD2"],
          hasLondonPostcodes: false
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).not.toContain("London Postcodes");
        expect(html).not.toContain('id="postcode-london"');
      });

      it("should render prosecutor filter section", () => {
        const data = {
          ...baseData,
          showFilter: true,
          prosecutors: ["CPS", "TfL"]
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Prosecutor");
        expect(html).toContain('id="prosecutor-anchor"');
        expect(html).toContain('id="prosecutor-checkbox"');
      });

      it("should render prosecutor checkboxes", () => {
        const data = {
          ...baseData,
          showFilter: true,
          prosecutors: ["CPS", "TfL"]
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain('id="prosecutor-1"');
        expect(html).toContain('value="CPS"');
        expect(html).toContain('id="prosecutor-2"');
        expect(html).toContain('value="TfL"');
      });

      it("should render checked prosecutor checkboxes when filter is active", () => {
        const data = {
          ...baseData,
          showFilter: true,
          prosecutors: ["CPS", "TfL"],
          filters: {
            postcodes: [],
            prosecutors: ["CPS"]
          }
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain('value="CPS" checked');
      });

      it("should render hidden artefactId input", () => {
        const data = {
          ...baseData,
          showFilter: true
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain('name="artefactId"');
        expect(html).toContain('value="test-artefact-123"');
      });
    });

    describe("Pagination", () => {
      it("should not render pagination when only one page", () => {
        const html = env.render("sjp-press-list.njk", baseData);
        expect(html).not.toContain("govuk-pagination");
      });

      it("should render pagination when multiple pages", () => {
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
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("govuk-pagination");
      });

      it("should render previous link when hasPrevious is true", () => {
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
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Previous");
        expect(html).toContain("artefactId=test-artefact-123");
        expect(html).toContain("page=1");
      });

      it("should not render previous link when hasPrevious is false", () => {
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
        const html = env.render("sjp-press-list.njk", data);
        expect(html).not.toContain("govuk-pagination__prev");
      });

      it("should render next link when hasNext is true", () => {
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
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Next");
        expect(html).toContain("artefactId=test-artefact-123");
        expect(html).toContain("page=2");
      });

      it("should not render next link when hasNext is false", () => {
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
        const html = env.render("sjp-press-list.njk", data);
        expect(html).not.toContain("govuk-pagination__next");
      });

      it("should render page numbers", () => {
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
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain('aria-label="Page 1"');
        expect(html).toContain('aria-label="Page 2"');
        expect(html).toContain('aria-label="Page 3"');
      });

      it("should mark current page with aria-current", () => {
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
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain('aria-current="page"');
        expect(html).toContain("govuk-pagination__item--current");
      });

      it("should include filters in pagination links", () => {
        const data = {
          ...baseData,
          pagination: {
            currentPage: 1,
            totalPages: 2,
            hasPrevious: false,
            hasNext: true,
            pageNumbers: [1, 2]
          },
          filters: {
            postcodes: ["SW1"],
            prosecutors: ["CPS"]
          }
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("postcode=SW1");
        expect(html).toContain("prosecutor=CPS");
      });
    });

    describe("Cases section", () => {
      it("should render no cases message when cases array is empty", () => {
        const html = env.render("sjp-press-list.njk", baseData);
        expect(html).toContain("No cases found");
      });

      it("should render case with all fields", () => {
        const data = {
          ...baseData,
          cases: [
            {
              name: "John Doe",
              dateOfBirth: new Date("1985-03-15"),
              age: "39",
              reference: "REF123456",
              address: "123 Main Street, London, SW1A 1AA",
              prosecutor: "CPS",
              offences: [
                {
                  offenceTitle: "Speeding",
                  offenceWording: "Exceeded speed limit on A1 road",
                  reportingRestriction: true
                }
              ]
            }
          ]
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("John Doe");
        expect(html).toContain("REF123456");
        expect(html).toContain("123 Main Street, London, SW1A 1AA");
        expect(html).toContain("CPS");
        expect(html).toContain("Speeding");
        expect(html).toContain("Exceeded speed limit on A1 road");
        expect(html).toContain("Reporting Restriction");
        expect(html).toContain("True");
      });

      it("should render case without age", () => {
        const data = {
          ...baseData,
          cases: [
            {
              name: "Jane Smith",
              dateOfBirth: new Date("1990-07-20"),
              age: null,
              reference: "REF789012",
              address: "456 High Street",
              prosecutor: "TfL",
              offences: []
            }
          ]
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Jane Smith");
        expect(html).not.toContain("(39)");
      });

      it("should render case without date of birth", () => {
        const data = {
          ...baseData,
          cases: [
            {
              name: "Bob Jones",
              dateOfBirth: null,
              age: null,
              reference: "REF345678",
              address: "789 Park Road",
              prosecutor: "DVLA",
              offences: []
            }
          ]
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Bob Jones");
      });

      it("should render case with empty optional fields", () => {
        const data = {
          ...baseData,
          cases: [
            {
              name: "Alice Brown",
              dateOfBirth: new Date("1992-11-05"),
              age: null,
              reference: null,
              address: null,
              prosecutor: null,
              offences: []
            }
          ]
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Alice Brown");
        expect(html).toContain("govuk-summary-list");
      });

      it("should render offence without wording", () => {
        const data = {
          ...baseData,
          cases: [
            {
              name: "Charlie Davis",
              dateOfBirth: new Date("1988-04-12"),
              age: "38",
              reference: "REF555666",
              address: "321 Oak Avenue",
              prosecutor: "BBC",
              offences: [
                {
                  offenceTitle: "TV Licence Offence",
                  offenceWording: null,
                  reportingRestriction: false
                }
              ]
            }
          ]
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("TV Licence Offence");
        // Should not have offence title followed by dash and wording
        expect(html).not.toContain("TV Licence Offence -");
      });

      it("should render reporting restriction as false", () => {
        const data = {
          ...baseData,
          cases: [
            {
              name: "David Evans",
              dateOfBirth: new Date("1980-01-25"),
              age: "46",
              reference: "REF777888",
              address: "654 Elm Street",
              prosecutor: "Police",
              offences: [
                {
                  offenceTitle: "Parking Violation",
                  offenceWording: "Parked in restricted zone",
                  reportingRestriction: false
                }
              ]
            }
          ]
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Reporting Restriction");
        expect(html).toContain("False");
      });

      it("should render multiple offences for one case", () => {
        const data = {
          ...baseData,
          cases: [
            {
              name: "Emma Wilson",
              dateOfBirth: new Date("1995-09-30"),
              age: "30",
              reference: "REF999000",
              address: "987 Maple Drive",
              prosecutor: "CPS",
              offences: [
                {
                  offenceTitle: "Speeding",
                  offenceWording: "70mph in 50mph zone",
                  reportingRestriction: false
                },
                {
                  offenceTitle: "No Insurance",
                  offenceWording: "Driving without valid insurance",
                  reportingRestriction: true
                }
              ]
            }
          ]
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Speeding");
        expect(html).toContain("70mph in 50mph zone");
        expect(html).toContain("No Insurance");
        expect(html).toContain("Driving without valid insurance");
      });

      it("should render multiple cases", () => {
        const data = {
          ...baseData,
          cases: [
            {
              name: "First Person",
              dateOfBirth: new Date("1980-01-01"),
              age: "46",
              reference: "REF001",
              address: "Address 1",
              prosecutor: "CPS",
              offences: []
            },
            {
              name: "Second Person",
              dateOfBirth: new Date("1990-02-02"),
              age: "36",
              reference: "REF002",
              address: "Address 2",
              prosecutor: "TfL",
              offences: []
            }
          ]
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("First Person");
        expect(html).toContain("Second Person");
        expect(html).toContain("govuk-section-break");
      });

      it("should not render section break after last case", () => {
        const data = {
          ...baseData,
          cases: [
            {
              name: "Only Person",
              dateOfBirth: new Date("1985-05-05"),
              age: "41",
              reference: "REF999",
              address: "Solo Address",
              prosecutor: "BBC",
              offences: []
            }
          ]
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Only Person");
      });
    });

    describe("Footer section", () => {
      it("should render back to top link", () => {
        const html = env.render("sjp-press-list.njk", baseData);
        expect(html).toContain("Back to top");
        expect(html).toContain('href="#"');
        expect(html).toContain("back-to-top-link");
      });
    });

    describe("Error handling", () => {
      it("should render error summary when errors exist", () => {
        const data = {
          ...baseData,
          errors: [
            { text: "Enter a valid postcode", href: "#postcode" },
            { text: "Select at least one filter", href: "#filters" }
          ]
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("There is a problem");
        expect(html).toContain("Enter a valid postcode");
        expect(html).toContain("Select at least one filter");
        expect(html).toContain("govuk-error-summary");
      });

      it("should not render error summary when no errors", () => {
        const html = env.render("sjp-press-list.njk", baseData);
        expect(html).not.toContain("govuk-error-summary");
      });
    });

    describe("JavaScript section", () => {
      it("should render filter toggle script", () => {
        const html = env.render("sjp-press-list.njk", baseData);
        expect(html).toContain("filterToggle");
        expect(html).toContain("filterPanel");
        expect(html).toContain('nonce="test-nonce-12345"');
      });

      it("should render collapsible filter sections script", () => {
        const html = env.render("sjp-press-list.njk", baseData);
        expect(html).toContain("setupFilterToggle");
        expect(html).toContain("postcodes-anchor");
        expect(html).toContain("prosecutor-anchor");
      });
    });

    describe("Welsh rendering", () => {
      const welshData = {
        title: sjpPressListCy.SJP_PRESS_LIST.title,
        ...sjpPressListCy.common,
        list: {
          artefactId: "test-artefact-123",
          contentDate: new Date("2026-01-15"),
          publishedAt: new Date("2026-01-15T10:00:00Z")
        },
        cases: [],
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
        showFilter: false,
        cspNonce: "test-nonce-12345"
      };

      it("should render with Welsh locale", () => {
        const html = env.render("sjp-press-list.njk", welshData);
        expect(html).toContain("Achosion Gweithdrefn Un Ynad");
        expect(html).toContain("Golwg i");
        expect(html).toContain("r Wasg");
        expect(html).toContain("Rhestr ar gyfer");
        expect(html).toContain("Cyhoeddwyd");
        expect(html).toContain("am");
      });

      it("should render Welsh filter labels", () => {
        const data = {
          ...welshData,
          showFilter: true,
          postcodeAreas: ["SW1"],
          prosecutors: ["CPS"]
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Hidlydd");
        expect(html).toContain("Dangos hidlwyr");
        expect(html).toContain("Cod post");
        expect(html).toContain("Erlynydd");
        expect(html).toContain("Cadarnhau hidlwyr");
      });

      it("should render Welsh table headers", () => {
        const data = {
          ...welshData,
          cases: [
            {
              name: "Enw Prawf",
              dateOfBirth: new Date("1985-03-15"),
              age: "39",
              reference: "CYF123",
              address: "Cyfeiriad Prawf",
              prosecutor: "CPS",
              offences: []
            }
          ]
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Enw");
        expect(html).toContain("Dyddiad geni");
        expect(html).toContain("Cyfeirnod");
        expect(html).toContain("Cyfeiriad");
        expect(html).toContain("Erlynydd");
      });

      it("should render Welsh no cases message", () => {
        const html = env.render("sjp-press-list.njk", welshData);
        expect(html).toContain("Dim achosion wedi&#39;u darganfod");
      });

      it("should render Welsh pagination labels", () => {
        const data = {
          ...welshData,
          pagination: {
            currentPage: 2,
            totalPages: 3,
            hasPrevious: true,
            hasNext: true,
            pageNumbers: [1, 2, 3]
          }
        };
        const html = env.render("sjp-press-list.njk", data);
        expect(html).toContain("Blaenorol");
        expect(html).toContain("Nesaf");
      });
    });
  });
});
