import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rcjStandardDailyCauseListCy as cy, rcjStandardDailyCauseListEn as en } from "@hmcts/rcj-standard-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("mayor-city-civil-daily-cause-list template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");

    env = createTestEnvironment([__dirname, webCoreViews]);
  });

  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "mayor-city-civil-daily-cause-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    const mayorCityEn = en.MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST;
    const commonEn = en.common;

    it("should have page title", () => {
      expect(mayorCityEn.pageTitle).toBe("Civil Daily Cause List");
    });

    it("should have all location lines", () => {
      expect(mayorCityEn.locationLine1).toBe("Mayor & City");
      expect(mayorCityEn.locationLine2).toBe("Guildhall Buildings");
      expect(mayorCityEn.locationLine3).toBe("Basinghall Street");
      expect(mayorCityEn.locationLine4).toBe("London EC2V 5AR");
    });

    it("should have hearings info text", () => {
      expect(typeof mayorCityEn.hearingsInfoText).toBe("string");
      expect(mayorCityEn.hearingsInfoText).toContain("Central London County Court");
    });

    it("should have media and observers text", () => {
      expect(typeof mayorCityEn.mediaAndObserversText).toBe("string");
      expect(mayorCityEn.mediaAndObserversText).toContain("enquiries.centrallondon.countycourt@justice.gov.uk");
    });

    it("should have common fact link text", () => {
      expect(commonEn.factLinkText).toBe("Find contact details and other information about courts and tribunals");
    });

    it("should have common fact link URL", () => {
      expect(commonEn.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
    });

    it("should have all table headers", () => {
      expect(commonEn.tableHeaders.venue).toBe("Venue");
      expect(commonEn.tableHeaders.judge).toBe("Judge");
      expect(commonEn.tableHeaders.time).toBe("Time");
      expect(commonEn.tableHeaders.caseNumber).toBe("Case number");
      expect(commonEn.tableHeaders.caseDetails).toBe("Case details");
      expect(commonEn.tableHeaders.hearingType).toBe("Hearing type");
      expect(commonEn.tableHeaders.additionalInformation).toBe("Additional information");
    });

    it("should have data source label", () => {
      expect(commonEn.dataSource).toBe("Data source");
    });

    it("should have back to top label", () => {
      expect(commonEn.backToTop).toBe("Back to top");
    });
  });

  describe("Welsh locale", () => {
    const mayorCityCy = cy.MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST;
    const commonCy = cy.common;

    it("should have page title", () => {
      expect(mayorCityCy.pageTitle).toBe("Rhestr Achosion Dyddiol y Llys Sifil");
    });

    it("should have all location lines", () => {
      expect(mayorCityCy.locationLine1).toBe("Mayor & City");
      expect(mayorCityCy.locationLine2).toBe("Guildhall Buildings");
      expect(mayorCityCy.locationLine3).toBe("Basinghall Street");
      expect(mayorCityCy.locationLine4).toBe("London EC2V 5AR");
    });

    it("should have hearings info text", () => {
      expect(typeof mayorCityCy.hearingsInfoText).toBe("string");
      expect(mayorCityCy.hearingsInfoText).toContain("Llys Sirol Canol Llundain");
    });

    it("should have media and observers text", () => {
      expect(typeof mayorCityCy.mediaAndObserversText).toBe("string");
      expect(mayorCityCy.mediaAndObserversText).toContain("enquiries.centrallondon.countycourt@justice.gov.uk");
    });

    it("should have common fact link text", () => {
      expect(commonCy.factLinkText).toBe("Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd yng Nghymru a Lloegr");
    });

    it("should have common fact link URL", () => {
      expect(commonCy.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
    });

    it("should have all table headers", () => {
      expect(commonCy.tableHeaders.venue).toBe("Lleoliad");
      expect(commonCy.tableHeaders.judge).toBe("Barnwr");
      expect(commonCy.tableHeaders.time).toBe("Amser");
      expect(commonCy.tableHeaders.caseNumber).toBe("Rhif yr achos");
      expect(commonCy.tableHeaders.caseDetails).toBe("Manylion yr achos");
      expect(commonCy.tableHeaders.hearingType).toBe("Math o wrandawiad");
      expect(commonCy.tableHeaders.additionalInformation).toBe("Gwybodaeth ychwanegol");
    });

    it("should have data source label", () => {
      expect(commonCy.dataSource).toBe("Ffynhonnell data");
    });

    it("should have back to top label", () => {
      expect(commonCy.backToTop).toBe("Yn ôl i frig y dudalen");
    });
  });

  describe("Locale consistency", () => {
    it("should have same MAYOR_CITY keys in English and Welsh", () => {
      expect(Object.keys(en.MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST).sort()).toEqual(Object.keys(cy.MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST).sort());
    });

    it("should have same common keys in English and Welsh", () => {
      expect(Object.keys(en.common).sort()).toEqual(Object.keys(cy.common).sort());
    });
  });

  describe("Content validation", () => {
    it("should have non-empty strings for all English content", () => {
      const mayorCity = en.MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST;
      expect(mayorCity.pageTitle.length).toBeGreaterThan(0);
      expect(mayorCity.locationLine1.length).toBeGreaterThan(0);
      expect(mayorCity.locationLine2.length).toBeGreaterThan(0);
      expect(mayorCity.locationLine3.length).toBeGreaterThan(0);
      expect(mayorCity.locationLine4.length).toBeGreaterThan(0);
      expect(mayorCity.hearingsInfoText.length).toBeGreaterThan(0);
      expect(mayorCity.mediaAndObserversText.length).toBeGreaterThan(0);
    });

    it("should have non-empty strings for all Welsh content", () => {
      const mayorCity = cy.MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST;
      expect(mayorCity.pageTitle.length).toBeGreaterThan(0);
      expect(mayorCity.locationLine1.length).toBeGreaterThan(0);
      expect(mayorCity.locationLine2.length).toBeGreaterThan(0);
      expect(mayorCity.locationLine3.length).toBeGreaterThan(0);
      expect(mayorCity.locationLine4.length).toBeGreaterThan(0);
      expect(mayorCity.hearingsInfoText.length).toBeGreaterThan(0);
      expect(mayorCity.mediaAndObserversText.length).toBeGreaterThan(0);
    });

    it("should have valid URLs", () => {
      expect(en.common.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.common.factLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Template rendering with data variations", () => {
    const baseTemplateData = {
      header: {
        listTitle: "Test List Title",
        listDate: "13 July 2026",
        lastUpdatedDate: "13 July 2026",
        lastUpdatedTime: "9:00am"
      },
      listContent: en.MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST,
      common: en.common,
      dataSource: "Test Source",
      hearings: []
    };

    describe("Basic template rendering", () => {
      it("should render header with list title", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain("Test List Title");
        expect(html).toContain('<h1 class="govuk-heading-l" id="top">');
      });

      it("should render fact link section", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("https://www.find-court-tribunal.service.gov.uk/");
      });

      it("should render all location lines", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain("Mayor &amp; City");
        expect(html).toContain("Guildhall Buildings");
        expect(html).toContain("Basinghall Street");
        expect(html).toContain("London EC2V 5AR");
      });

      it("should render list date and last updated", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain("List for 13 July 2026");
        expect(html).toContain("Last updated 13 July 2026 at 9:00am");
      });

      it("should render important information details", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain("Important information");
        expect(html).toContain("Central London County Court");
        expect(html).toContain("Mayors & City of London Court");
      });

      it("should render search box", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain("Search Cases");
        expect(html).toContain('id="case-search-input"');
      });

      it("should render table headers", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain("Venue");
        expect(html).toContain("Judge");
        expect(html).toContain("Time");
        expect(html).toContain("Case number");
        expect(html).toContain("Case details");
        expect(html).toContain("Hearing type");
        expect(html).toContain("Additional information");
      });

      it("should render data source footer", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain("Data source: Test Source");
      });

      it("should render back to top link", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain('<a href="#top"');
        expect(html).toContain("Back to top");
      });
    });

    describe("Hearing data variations", () => {
      it("should render single hearing", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              venue: "Court 1",
              judge: "Judge Smith",
              time: "10:00am",
              caseNumber: "C123",
              caseDetails: "Smith v Jones",
              hearingType: "Trial",
              additionalInformation: "In person"
            }
          ]
        });

        expect(html).toContain("Court 1");
        expect(html).toContain("Judge Smith");
        expect(html).toContain("10:00am");
        expect(html).toContain("C123");
        expect(html).toContain("Smith v Jones");
        expect(html).toContain("Trial");
        expect(html).toContain("In person");
      });

      it("should render multiple hearings", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              venue: "Court 1",
              judge: "Judge Smith",
              time: "10:00am",
              caseNumber: "C123",
              caseDetails: "Smith v Jones",
              hearingType: "Trial",
              additionalInformation: "In person"
            },
            {
              venue: "Court 2",
              judge: "Judge Brown",
              time: "2:00pm",
              caseNumber: "C456",
              caseDetails: "Brown v White",
              hearingType: "Hearing",
              additionalInformation: "Video"
            }
          ]
        });

        expect(html).toContain("Court 1");
        expect(html).toContain("Court 2");
        expect(html).toContain("Smith v Jones");
        expect(html).toContain("Brown v White");
      });

      it("should render empty table when no hearings", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: []
        });

        expect(html).toContain("<tbody");
        expect(html).toContain("</tbody>");
      });

      it("should handle empty hearing fields", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              venue: "",
              judge: "",
              time: "10:00am",
              caseNumber: "C123",
              caseDetails: "",
              hearingType: "",
              additionalInformation: ""
            }
          ]
        });

        expect(html).toContain("C123");
        expect(html).toContain("10:00am");
      });

      it("should escape special characters in hearing data", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", {
          ...baseTemplateData,
          hearings: [
            {
              venue: "Court 1",
              judge: "Judge O'Brien",
              time: "10:00am",
              caseNumber: "C123",
              caseDetails: "Smith & Co v Jones",
              hearingType: "Trial",
              additionalInformation: "In person"
            }
          ]
        });

        expect(html).toContain("O&#39;Brien");
        expect(html).toContain("Smith &amp; Co v Jones");
      });
    });

    describe("Important information variations", () => {
      it("should render details component as open by default", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain('<details class="govuk-details" open>');
      });

      it("should render both hearings info and media observers text", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain("Central London County Court");
        expect(html).toContain("enquiries.centrallondon.countycourt@justice.gov.uk");
      });
    });

    describe("Accessibility features", () => {
      it("should have aria-label on search input", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain('aria-label="Search by case number, details, venue, judge, or other information"');
      });

      it("should have role=table and aria-label on hearings table", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain('role="table"');
        expect(html).toContain('aria-label="Test List Title"');
      });

      it("should have id=top for back to top anchor", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain('id="top"');
        expect(html).toContain('<a href="#top"');
      });

      it("should have govuk-visually-hidden label for search", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", baseTemplateData);

        expect(html).toContain('class="govuk-label govuk-visually-hidden"');
        expect(html).toContain('for="case-search-input"');
      });
    });

    describe("Welsh locale rendering", () => {
      const welshTemplateData = {
        header: {
          listTitle: "Rhestr Achosion Dyddiol y Llys Sifil",
          listDate: "13 Gorffennaf 2026",
          lastUpdatedDate: "13 Gorffennaf 2026",
          lastUpdatedTime: "9:00am"
        },
        listContent: cy.MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST,
        common: cy.common,
        dataSource: "Ffynhonnell Prawf",
        hearings: []
      };

      it("should render with Welsh content", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", welshTemplateData);

        expect(html).toContain("Rhestr Achosion Dyddiol y Llys Sifil");
        expect(html).toContain("Gwybodaeth bwysig");
        expect(html).toContain("Chwilio Achosion");
      });

      it("should render Welsh table headers", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", welshTemplateData);

        expect(html).toContain("Lleoliad");
        expect(html).toContain("Barnwr");
        expect(html).toContain("Amser");
        expect(html).toContain("Rhif yr achos");
        expect(html).toContain("Manylion yr achos");
        expect(html).toContain("Math o wrandawiad");
        expect(html).toContain("Gwybodaeth ychwanegol");
      });

      it("should render Welsh footer text", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", welshTemplateData);

        expect(html).toContain("Ffynhonnell data: Ffynhonnell Prawf");
        expect(html).toContain("Yn ôl i frig y dudalen");
      });

      it("should render Welsh list date metadata", () => {
        const { html } = render(env, "mayor-city-civil-daily-cause-list.njk", welshTemplateData);

        expect(html).toContain("Rhestr ar gyfer 13 Gorffennaf 2026");
        expect(html).toContain("Diweddarwyd ddiwethaf 13 Gorffennaf 2026 am 9:00am");
      });
    });
  });
});
