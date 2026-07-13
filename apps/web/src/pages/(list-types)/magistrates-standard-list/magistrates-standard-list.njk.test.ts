import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { magistratesStandardListCy as cy, magistratesStandardListEn as en } from "@hmcts/magistrates-standard-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("magistrates-standard-list template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");

    env = createTestEnvironment([__dirname, webCoreViews]);
  });

  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "magistrates-standard-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have title", () => {
      expect(en.title).toBe("Magistrates Standard List");
    });

    it("should have page title", () => {
      expect(en.pageTitle).toBe("Magistrates Standard List for");
    });

    it("should have fact link text", () => {
      expect(en.factLinkText).toBe("Find contact details and other information about courts and tribunals");
    });

    it("should have fact link URL", () => {
      expect(en.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
    });

    it("should have fact additional text", () => {
      expect(en.factAdditionalText).toBe("in England and Wales, and some non-devolved tribunals in Scotland.");
    });

    it("should have list date label", () => {
      expect(en.listDate).toBe("List for");
    });

    it("should have last updated label", () => {
      expect(en.lastUpdated).toBe("Last updated:");
    });

    it("should have published at label", () => {
      expect(en.publishedAt).toBe("at");
    });

    it("should have restriction information heading", () => {
      expect(en.restrictionInformationHeading).toBe("Restrictions on publishing or writing about these cases");
    });

    it("should have restriction information paragraph 1", () => {
      expect(en.restrictionInformationP1).toContain("You must check if any reporting restrictions apply");
    });

    it("should have restriction information bold text", () => {
      expect(en.restrictionInformationBoldText).toContain("You'll be in contempt of court");
    });

    it("should have restriction information paragraph 2", () => {
      expect(en.restrictionInformationP2).toBe("Specific restrictions ordered by the court will be mentioned on the cases listed here.");
    });

    it("should have restriction information paragraph 3", () => {
      expect(en.restrictionInformationP3).toContain("However, restrictions are not always listed");
    });

    it("should have restriction information paragraph 4", () => {
      expect(en.restrictionInformationP4).toBe("To find out which reporting restrictions apply on a specific case, contact:");
    });

    it("should have restriction bullet point 1", () => {
      expect(en.restrictionBulletPoint1).toBe("the court directly");
    });

    it("should have restriction bullet point 2", () => {
      expect(en.restrictionBulletPoint2).toBe("HM Courts and Tribunals Service on 0330 808 4407");
    });

    it("should have link to top", () => {
      expect(en.linkToTop).toBe("Back to top");
    });

    it("should have name label", () => {
      expect(en.name).toBe("Name: ");
    });

    it("should have sitting at label", () => {
      expect(en.sittingAt).toBe("Sitting at ");
    });

    it("should have reference label", () => {
      expect(en.reference).toBe("Reference: ");
    });

    it("should have application type label", () => {
      expect(en.applicationType).toBe("Application Type: ");
    });

    it("should have DOB and age label", () => {
      expect(en.dobAndAge).toBe("DOB and Age: ");
    });

    it("should have age label", () => {
      expect(en.age).toBe("Age:");
    });

    it("should have ASN label", () => {
      expect(en.asn).toBe("ASN: ");
    });

    it("should have PNC ID label", () => {
      expect(en.pncId).toBe("PNC ID: ");
    });

    it("should have address label", () => {
      expect(en.address).toBe("Address: ");
    });

    it("should have hearing type label", () => {
      expect(en.hearingType).toBe("Hearing Type: ");
    });

    it("should have prosecuting authority label", () => {
      expect(en.prosecutingAuthority).toBe("Prosecuting Authority Name: ");
    });

    it("should have panel label", () => {
      expect(en.panel).toBe("Panel: ");
    });

    it("should have attendance method label", () => {
      expect(en.attendanceMethod).toBe("Attendance Method: ");
    });

    it("should have reporting restrictions label", () => {
      expect(en.reportingRestrictions).toBe("Reporting Restrictions: ");
    });

    it("should have application particulars label", () => {
      expect(en.applicationParticulars).toBe("Application Particulars: ");
    });

    it("should have plea label", () => {
      expect(en.plea).toBe("Plea");
    });

    it("should have date of plea label", () => {
      expect(en.dateOfPlea).toBe("Date of Plea");
    });

    it("should have convicted on label", () => {
      expect(en.convictedOn).toBe("Convicted on");
    });

    it("should have adjourned from label", () => {
      expect(en.adjournedFrom).toBe("Adjourned from");
    });

    it("should have adjourned text", () => {
      expect(en.adjournedText).toBe("For the trial");
    });

    it("should have legislation label", () => {
      expect(en.legislation).toBe("Legislation");
    });

    it("should have max penalty label", () => {
      expect(en.maxPenalty).toBe("Max Penalty");
    });

    it("should have LJA label", () => {
      expect(en.lja).toBe("LJA");
    });

    it("should have data source label", () => {
      expect(en.dataSource).toBe("Data Source");
    });

    it("should have search cases label", () => {
      expect(en.searchCases).toBe("Search cases");
    });

    it("should have no hearings message", () => {
      expect(en.noHearings).toBe("No hearings today");
    });
  });

  describe("Welsh locale", () => {
    it("should have title", () => {
      expect(cy.title).toBe("Rhestr Safonol y Llys Ynadon");
    });

    it("should have page title", () => {
      expect(cy.pageTitle).toBe("Rhestr Safonol y Llys Ynadon ar gyfer");
    });

    it("should have fact link text", () => {
      expect(cy.factLinkText).toBe("Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd");
    });

    it("should have fact link URL", () => {
      expect(cy.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
    });

    it("should have fact additional text", () => {
      expect(cy.factAdditionalText).toBe("yng Nghymru a Lloegr, a rhai tribiwnlysoedd sydd heb eu datganoli yn yr Alban.");
    });

    it("should have list date label", () => {
      expect(cy.listDate).toBe("Rhestr ar gyfer");
    });

    it("should have last updated label", () => {
      expect(cy.lastUpdated).toBe("Diweddarwyd diwethaf:");
    });

    it("should have published at label", () => {
      expect(cy.publishedAt).toBe("am");
    });

    it("should have restriction information heading", () => {
      expect(cy.restrictionInformationHeading).toBe("Cyfyngiadau ar gyhoeddi neu ysgrifennu am yr achosion hyn.");
    });

    it("should have restriction information paragraph 1", () => {
      expect(cy.restrictionInformationP1).toContain("Rhaid i chi wirio a oes unrhyw gyfyngiadau riportio");
    });

    it("should have restriction information bold text", () => {
      expect(cy.restrictionInformationBoldText).toContain("Byddwch yn euog o ddirmyg llys");
    });

    it("should have restriction information paragraph 2", () => {
      expect(cy.restrictionInformationP2).toBe("Bydd cyfyngiadau penodol a orchmynnir gan y llys yn cael eu crybwyll ar yr achosion a restrir yma.");
    });

    it("should have restriction information paragraph 3", () => {
      expect(cy.restrictionInformationP3).toContain("Fodd bynnag, nid yw'r cyfyngiadau bob amser yn cael eu rhestru");
    });

    it("should have restriction information paragraph 4", () => {
      expect(cy.restrictionInformationP4).toBe("I ganfod pa gyfyngiadau riportio sy'n berthnasol ar achos penodol, cysylltwch â'r:");
    });

    it("should have restriction bullet point 1", () => {
      expect(cy.restrictionBulletPoint1).toBe("llys yn uniongyrchol");
    });

    it("should have restriction bullet point 2", () => {
      expect(cy.restrictionBulletPoint2).toBe("Gwasanaeth Llysoedd a Thribiwnlysoedd EM ar 0330 808 4407");
    });

    it("should have link to top", () => {
      expect(cy.linkToTop).toBe("Yn ôl i'r brig");
    });

    it("should have name label", () => {
      expect(cy.name).toBe("Enw'r: ");
    });

    it("should have sitting at label", () => {
      expect(cy.sittingAt).toBe("Yn eistedd yn ");
    });

    it("should have reference label", () => {
      expect(cy.reference).toBe("Cyfeirnod: ");
    });

    it("should have application type label", () => {
      expect(cy.applicationType).toBe("Math o Gais: ");
    });

    it("should have DOB and age label", () => {
      expect(cy.dobAndAge).toBe("Dyddiad Geni ac Oedran: ");
    });

    it("should have age label", () => {
      expect(cy.age).toBe("Oedran:");
    });

    it("should have ASN label", () => {
      expect(cy.asn).toBe("ASN (Rhif Gwŷs  Arestio): ");
    });

    it("should have PNC ID label", () => {
      expect(cy.pncId).toBe("PNC ID: ");
    });

    it("should have address label", () => {
      expect(cy.address).toBe("Cyfeiriad: ");
    });

    it("should have hearing type label", () => {
      expect(cy.hearingType).toBe("Math o Wrandawiad: ");
    });

    it("should have prosecuting authority label", () => {
      expect(cy.prosecutingAuthority).toBe("Enw'r Awdurdod Erlyn: ");
    });

    it("should have panel label", () => {
      expect(cy.panel).toBe("Panel: ");
    });

    it("should have attendance method label", () => {
      expect(cy.attendanceMethod).toBe("Dull Presenoldeb: ");
    });

    it("should have reporting restrictions label", () => {
      expect(cy.reportingRestrictions).toBe("Cyfyngiadau Riportio: ");
    });

    it("should have application particulars label", () => {
      expect(cy.applicationParticulars).toBe("Manylion y Cais: ");
    });

    it("should have plea label", () => {
      expect(cy.plea).toBe("Ple");
    });

    it("should have date of plea label", () => {
      expect(cy.dateOfPlea).toBe("Dyddiad Pledio");
    });

    it("should have convicted on label", () => {
      expect(cy.convictedOn).toBe("Cafwyd yn euog ar");
    });

    it("should have adjourned from label", () => {
      expect(cy.adjournedFrom).toBe("Wedi'i ohirio o");
    });

    it("should have adjourned text", () => {
      expect(cy.adjournedText).toBe("Ar gyfer y treial");
    });

    it("should have legislation label", () => {
      expect(cy.legislation).toBe("Deddfwriaeth");
    });

    it("should have max penalty label", () => {
      expect(cy.maxPenalty).toBe("Cosb Uchaf");
    });

    it("should have LJA label", () => {
      expect(cy.lja).toBe("LJA");
    });

    it("should have data source label", () => {
      expect(cy.dataSource).toBe("Ffynhonnell Data");
    });

    it("should have search cases label", () => {
      expect(cy.searchCases).toBe("Chwilio achosion");
    });

    it("should have no hearings message", () => {
      expect(cy.noHearings).toBe("Dim gwrandawiadau heddiw");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = [
        "title",
        "pageTitle",
        "factLinkText",
        "factLinkUrl",
        "factAdditionalText",
        "listDate",
        "lastUpdated",
        "publishedAt",
        "restrictionInformationHeading",
        "restrictionInformationP1",
        "restrictionInformationBoldText",
        "restrictionInformationP2",
        "restrictionInformationP3",
        "restrictionInformationP4",
        "restrictionBulletPoint1",
        "restrictionBulletPoint2",
        "linkToTop",
        "name",
        "sittingAt",
        "reference",
        "applicationType",
        "dobAndAge",
        "age",
        "asn",
        "pncId",
        "address",
        "hearingType",
        "prosecutingAuthority",
        "panel",
        "attendanceMethod",
        "reportingRestrictions",
        "applicationParticulars",
        "plea",
        "dateOfPlea",
        "convictedOn",
        "adjournedFrom",
        "adjournedText",
        "legislation",
        "maxPenalty",
        "lja",
        "dataSource",
        "searchCases",
        "noHearings"
      ];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });
  });

  describe("Content validation", () => {
    it("should have non-empty strings for all English string content", () => {
      expect(en.title.length).toBeGreaterThan(0);
      expect(en.pageTitle.length).toBeGreaterThan(0);
      expect(en.factLinkText.length).toBeGreaterThan(0);
      expect(en.factLinkUrl.length).toBeGreaterThan(0);
      expect(en.factAdditionalText.length).toBeGreaterThan(0);
      expect(en.listDate.length).toBeGreaterThan(0);
      expect(en.lastUpdated.length).toBeGreaterThan(0);
      expect(en.publishedAt.length).toBeGreaterThan(0);
      expect(en.restrictionInformationHeading.length).toBeGreaterThan(0);
      expect(en.restrictionInformationP1.length).toBeGreaterThan(0);
      expect(en.restrictionInformationBoldText.length).toBeGreaterThan(0);
      expect(en.restrictionInformationP2.length).toBeGreaterThan(0);
      expect(en.restrictionInformationP3.length).toBeGreaterThan(0);
      expect(en.restrictionInformationP4.length).toBeGreaterThan(0);
      expect(en.restrictionBulletPoint1.length).toBeGreaterThan(0);
      expect(en.restrictionBulletPoint2.length).toBeGreaterThan(0);
      expect(en.linkToTop.length).toBeGreaterThan(0);
      expect(en.name.length).toBeGreaterThan(0);
      expect(en.searchCases.length).toBeGreaterThan(0);
      expect(en.dataSource.length).toBeGreaterThan(0);
      expect(en.noHearings.length).toBeGreaterThan(0);
    });

    it("should have non-empty strings for all Welsh string content", () => {
      expect(cy.title.length).toBeGreaterThan(0);
      expect(cy.pageTitle.length).toBeGreaterThan(0);
      expect(cy.factLinkText.length).toBeGreaterThan(0);
      expect(cy.factLinkUrl.length).toBeGreaterThan(0);
      expect(cy.factAdditionalText.length).toBeGreaterThan(0);
      expect(cy.listDate.length).toBeGreaterThan(0);
      expect(cy.lastUpdated.length).toBeGreaterThan(0);
      expect(cy.publishedAt.length).toBeGreaterThan(0);
      expect(cy.restrictionInformationHeading.length).toBeGreaterThan(0);
      expect(cy.restrictionInformationP1.length).toBeGreaterThan(0);
      expect(cy.restrictionInformationBoldText.length).toBeGreaterThan(0);
      expect(cy.restrictionInformationP2.length).toBeGreaterThan(0);
      expect(cy.restrictionInformationP3.length).toBeGreaterThan(0);
      expect(cy.restrictionInformationP4.length).toBeGreaterThan(0);
      expect(cy.restrictionBulletPoint1.length).toBeGreaterThan(0);
      expect(cy.restrictionBulletPoint2.length).toBeGreaterThan(0);
      expect(cy.linkToTop.length).toBeGreaterThan(0);
      expect(cy.name.length).toBeGreaterThan(0);
      expect(cy.searchCases.length).toBeGreaterThan(0);
      expect(cy.dataSource.length).toBeGreaterThan(0);
      expect(cy.noHearings.length).toBeGreaterThan(0);
    });

    it("should have valid URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Template rendering with data variations", () => {
    const baseTemplateData = {
      t: en,
      en,
      cy,
      header: {
        locationName: "Test Magistrates Court",
        contentDate: "13 July 2026",
        publishedDate: "13 July 2026",
        publishedTime: "9:00am",
        venueAddress: ["1 Court Street", "Test City", "TC1 1AA"]
      },
      dataSource: "Test Source"
    };

    describe("No hearings scenario", () => {
      it("should render no hearings message when listData is empty", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          listData: []
        });

        expect(html).toContain("No hearings today");
      });
    });

    describe("Venue address variations", () => {
      it("should render venue address when present", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          header: {
            ...baseTemplateData.header,
            venueAddress: ["123 Main Street", "Test Town", "TT1 1AA"]
          },
          listData: []
        });

        expect(html).toContain("123 Main Street");
        expect(html).toContain("Test Town");
        expect(html).toContain("TT1 1AA");
      });

      it("should handle empty venue address array", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          header: {
            ...baseTemplateData.header,
            venueAddress: []
          },
          listData: []
        });

        expect(html).toContain("Test Magistrates Court");
        expect(html).toContain("No hearings today");
      });
    });

    describe("Court room rendering", () => {
      it("should render court house name when present", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          listData: [
            {
              courtHouseName: "Test Magistrates Court Building",
              courtRoomName: "Court 1",
              sittings: []
            }
          ]
        });

        expect(html).toContain("Test Magistrates Court Building");
        expect(html).toContain("Court 1");
      });

      it("should render LJA when present", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          listData: [
            {
              courtRoomName: "Court 2",
              lja: "Greater London",
              sittings: []
            }
          ]
        });

        expect(html).toContain("LJA");
        expect(html).toContain("Greater London");
      });

      it("should render without LJA when not present", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          listData: [
            {
              courtRoomName: "Court 3",
              sittings: []
            }
          ]
        });

        expect(html).toContain("Court 3");
        const ljaMatches = html.match(/LJA:/g);
        expect(ljaMatches).toBeNull();
      });
    });

    describe("Sitting variations", () => {
      it("should render sitting heading", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          listData: [
            {
              courtRoomName: "Court 1",
              sittings: [
                {
                  sittingHeading: "10:00am",
                  hearings: []
                }
              ]
            }
          ]
        });

        expect(html).toContain("Sitting at");
        expect(html).toContain("10:00am");
      });

      it("should render multiple sittings in accordion sections", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          listData: [
            {
              courtRoomName: "Court 1",
              sittings: [
                {
                  sittingHeading: "9:30am",
                  hearings: []
                },
                {
                  sittingHeading: "2:00pm",
                  hearings: []
                }
              ]
            }
          ]
        });

        expect(html).toContain("9:30am");
        expect(html).toContain("2:00pm");
        expect(html).toContain("govuk-accordion__section");
      });
    });

    describe("Hearing variations", () => {
      it("should render hearing with all fields", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          listData: [
            {
              courtRoomName: "Court 1",
              sittings: [
                {
                  sittingHeading: "10:00am",
                  hearings: [
                    {
                      reference: "12345678",
                      applicationType: "First Appearance",
                      partyInfo: {
                        name: "John Smith",
                        dob: "01/01/1980",
                        age: "44",
                        address: "123 Test Street, Test City, TC1 1AA",
                        asn: "ASN12345",
                        pncId: "PNC54321"
                      },
                      hearingType: "Trial",
                      prosecutingAuthority: "Crown Prosecution Service",
                      panel: "Lay Panel",
                      attendanceMethod: "In Person",
                      reportingRestriction: true,
                      reportingRestrictionDetails: "Section 39 applies",
                      applicationParticulars: "Breach of bail conditions",
                      offences: []
                    }
                  ]
                }
              ]
            }
          ]
        });

        expect(html).toContain("John Smith");
        expect(html).toContain("01/01/1980");
        expect(html).toContain("Age:");
        expect(html).toContain("44");
        expect(html).toContain("123 Test Street, Test City, TC1 1AA");
        expect(html).toContain("ASN12345");
        expect(html).toContain("PNC54321");
        expect(html).toContain("12345678");
        expect(html).toContain("First Appearance");
        expect(html).toContain("Trial");
        expect(html).toContain("Crown Prosecution Service");
        expect(html).toContain("Lay Panel");
        expect(html).toContain("In Person");
        expect(html).toContain("Section 39 applies");
        expect(html).toContain("Breach of bail conditions");
      });

      it("should render hearing without optional fields", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          listData: [
            {
              courtRoomName: "Court 1",
              sittings: [
                {
                  sittingHeading: "10:00am",
                  hearings: [
                    {
                      reference: "87654321",
                      partyInfo: {
                        name: "Jane Doe",
                        address: "456 Another Street",
                        asn: "ASN67890",
                        pncId: "PNC09876"
                      },
                      hearingType: "Hearing",
                      prosecutingAuthority: "Local Authority",
                      panel: "District Judge",
                      attendanceMethod: "Video",
                      offences: []
                    }
                  ]
                }
              ]
            }
          ]
        });

        expect(html).toContain("Jane Doe");
        expect(html).toContain("87654321");
        expect(html).not.toContain("Application Type:");
        expect(html).not.toContain("Application Particulars:");
        expect(html).not.toContain("Reporting Restrictions:");
      });

      it("should render hearing with DOB only", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          listData: [
            {
              courtRoomName: "Court 1",
              sittings: [
                {
                  sittingHeading: "10:00am",
                  hearings: [
                    {
                      reference: "11111111",
                      partyInfo: {
                        name: "Test Person",
                        dob: "15/03/1990",
                        address: "Test Address",
                        asn: "ASN11111",
                        pncId: "PNC11111"
                      },
                      hearingType: "Mention",
                      prosecutingAuthority: "Police",
                      panel: "Magistrate",
                      attendanceMethod: "Telephone",
                      offences: []
                    }
                  ]
                }
              ]
            }
          ]
        });

        expect(html).toContain("DOB and Age:");
        expect(html).toContain("15/03/1990");
        expect(html).toContain("Test Person");
      });

      it("should render hearing with age only", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          listData: [
            {
              courtRoomName: "Court 1",
              sittings: [
                {
                  sittingHeading: "10:00am",
                  hearings: [
                    {
                      reference: "22222222",
                      partyInfo: {
                        name: "Another Person",
                        age: "35",
                        address: "Another Address",
                        asn: "ASN22222",
                        pncId: "PNC22222"
                      },
                      hearingType: "Trial",
                      prosecutingAuthority: "CPS",
                      panel: "District Judge",
                      attendanceMethod: "In Person",
                      offences: []
                    }
                  ]
                }
              ]
            }
          ]
        });

        expect(html).toContain("DOB and Age:");
        expect(html).toContain("Age:");
        expect(html).toContain("35");
      });
    });

    describe("Offence variations", () => {
      it("should render offence with all details", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          listData: [
            {
              courtRoomName: "Court 1",
              sittings: [
                {
                  sittingHeading: "10:00am",
                  hearings: [
                    {
                      reference: "12345678",
                      partyInfo: {
                        name: "Defendant Name",
                        address: "Address",
                        asn: "ASN123",
                        pncId: "PNC123"
                      },
                      hearingType: "Trial",
                      prosecutingAuthority: "CPS",
                      panel: "Panel",
                      attendanceMethod: "In Person",
                      offences: [
                        {
                          offenceTitle: "Theft",
                          offenceCode: "TH001",
                          offenceWording: "Theft from a shop",
                          offenceLegislation: "Theft Act 1968, s.1",
                          offenceMaxPenalty: "7 years imprisonment",
                          plea: "Not Guilty",
                          pleaDate: "01/01/2026",
                          convictionDate: "15/01/2026",
                          adjournedDate: "10/01/2026",
                          reportingRestriction: true,
                          reportingRestrictionDetails: "Section 4(2) applies"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        });

        expect(html).toContain("TH001");
        expect(html).toContain("Theft");
        expect(html).toContain("Theft from a shop");
        expect(html).toContain("Theft Act 1968, s.1");
        expect(html).toContain("7 years imprisonment");
        expect(html).toContain("Not Guilty");
        expect(html).toContain("01/01/2026");
        expect(html).toContain("15/01/2026");
        expect(html).toContain("10/01/2026");
        expect(html).toContain("For the trial");
        expect(html).toContain("Section 4(2) applies");
      });

      it("should render offence with title only", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          listData: [
            {
              courtRoomName: "Court 1",
              sittings: [
                {
                  sittingHeading: "10:00am",
                  hearings: [
                    {
                      reference: "12345678",
                      partyInfo: {
                        name: "Defendant Name",
                        address: "Address",
                        asn: "ASN123",
                        pncId: "PNC123"
                      },
                      hearingType: "Trial",
                      prosecutingAuthority: "CPS",
                      panel: "Panel",
                      attendanceMethod: "In Person",
                      offences: [
                        {
                          offenceTitle: "Simple Offence"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        });

        expect(html).toContain("Simple Offence");
        expect(html).not.toContain("Legislation");
        expect(html).not.toContain("Max Penalty");
      });

      it("should render offence with code and title", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          listData: [
            {
              courtRoomName: "Court 1",
              sittings: [
                {
                  sittingHeading: "10:00am",
                  hearings: [
                    {
                      reference: "12345678",
                      partyInfo: {
                        name: "Defendant Name",
                        address: "Address",
                        asn: "ASN123",
                        pncId: "PNC123"
                      },
                      hearingType: "Trial",
                      prosecutingAuthority: "CPS",
                      panel: "Panel",
                      attendanceMethod: "In Person",
                      offences: [
                        {
                          offenceCode: "ABC123",
                          offenceTitle: "Test Offence"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        });

        expect(html).toContain("ABC123");
        expect(html).toContain(" - ");
        expect(html).toContain("Test Offence");
      });

      it("should render multiple offences", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          listData: [
            {
              courtRoomName: "Court 1",
              sittings: [
                {
                  sittingHeading: "10:00am",
                  hearings: [
                    {
                      reference: "12345678",
                      partyInfo: {
                        name: "Defendant Name",
                        address: "Address",
                        asn: "ASN123",
                        pncId: "PNC123"
                      },
                      hearingType: "Trial",
                      prosecutingAuthority: "CPS",
                      panel: "Panel",
                      attendanceMethod: "In Person",
                      offences: [
                        {
                          offenceTitle: "First Offence"
                        },
                        {
                          offenceTitle: "Second Offence"
                        },
                        {
                          offenceTitle: "Third Offence"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        });

        expect(html).toContain("1.");
        expect(html).toContain("First Offence");
        expect(html).toContain("2.");
        expect(html).toContain("Second Offence");
        expect(html).toContain("3.");
        expect(html).toContain("Third Offence");
      });

      it("should not render offence without title", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          listData: [
            {
              courtRoomName: "Court 1",
              sittings: [
                {
                  sittingHeading: "10:00am",
                  hearings: [
                    {
                      reference: "12345678",
                      partyInfo: {
                        name: "Defendant Name",
                        address: "Address",
                        asn: "ASN123",
                        pncId: "PNC123"
                      },
                      hearingType: "Trial",
                      prosecutingAuthority: "CPS",
                      panel: "Panel",
                      attendanceMethod: "In Person",
                      offences: [
                        {
                          offenceCode: "CODE123"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        });

        expect(html).not.toContain("CODE123");
        expect(html).not.toContain("govuk-details");
      });
    });

    describe("Multiple hearings in sitting", () => {
      it("should render multiple hearings with border between them", () => {
        const { html } = render(env, "magistrates-standard-list.njk", {
          ...baseTemplateData,
          listData: [
            {
              courtRoomName: "Court 1",
              sittings: [
                {
                  sittingHeading: "10:00am",
                  hearings: [
                    {
                      reference: "CASE001",
                      partyInfo: {
                        name: "First Defendant",
                        address: "Address 1",
                        asn: "ASN001",
                        pncId: "PNC001"
                      },
                      hearingType: "Trial",
                      prosecutingAuthority: "CPS",
                      panel: "Panel",
                      attendanceMethod: "In Person",
                      offences: []
                    },
                    {
                      reference: "CASE002",
                      partyInfo: {
                        name: "Second Defendant",
                        address: "Address 2",
                        asn: "ASN002",
                        pncId: "PNC002"
                      },
                      hearingType: "Mention",
                      prosecutingAuthority: "Police",
                      panel: "Magistrate",
                      attendanceMethod: "Video",
                      offences: []
                    }
                  ]
                }
              ]
            }
          ]
        });

        expect(html).toContain("First Defendant");
        expect(html).toContain("Second Defendant");
        expect(html).toContain("add-border-bottom");
      });
    });
  });
});
