import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crownFirmListCy as cy, crownFirmListEn as en } from "@hmcts/crown-firm-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("crown-firm-list template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
    const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

    env = nunjucks.configure([__dirname, webCoreViews, govukFrontend], {
      autoescape: true,
      noCache: true
    });
  });

  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "crown-firm-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have title", () => {
      expect(en.title).toBe("Crown Firm List");
    });

    it("should have page title", () => {
      expect(en.pageTitle).toBe("Crown Firm List for");
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

    it("should have list for label", () => {
      expect(en.listFor).toBe("List for");
    });

    it("should have last updated label", () => {
      expect(en.lastUpdated).toBe("Last updated");
    });

    it("should have version label", () => {
      expect(en.version).toBe("Version");
    });

    it("should have courtroom label", () => {
      expect(en.courtroom).toBe("Courtroom");
    });

    it("should have sitting at label", () => {
      expect(en.sittingAt).toBe("Sitting at");
    });

    it("should have hearing time label", () => {
      expect(en.hearingTime).toBe("Hearing Time");
    });

    it("should have case number label", () => {
      expect(en.caseNumber).toBe("Case Number");
    });

    it("should have defendant label", () => {
      expect(en.defendant).toBe("Defendant Name(s)");
    });

    it("should have hearing type label", () => {
      expect(en.hearingType).toBe("Hearing Type");
    });

    it("should have representative label", () => {
      expect(en.representative).toBe("Representative");
    });

    it("should have prosecuting authority label", () => {
      expect(en.prosecutingAuthority).toBe("Prosecuting Authority");
    });

    it("should have listing notes label", () => {
      expect(en.listingNotes).toBe("Listing Notes");
    });

    it("should have reporting restrictions label", () => {
      expect(en.reportingRestrictions).toBe("Reporting Restriction");
    });

    it("should have reporting restrictions title", () => {
      expect(en.reportingRestrictionsTitle).toBe("Restrictions on publishing or writing about these cases");
    });

    it("should have reporting restrictions body intro", () => {
      expect(en.reportingRestrictionsBodyIntro).toContain("You must check if any reporting restrictions apply");
    });

    it("should have reporting restrictions warning", () => {
      expect(en.reportingRestrictionsWarning).toContain("You'll be in contempt of court");
    });

    it("should have search cases label", () => {
      expect(en.searchCases).toBe("Search Cases");
    });

    it("should have back to top label", () => {
      expect(en.backToTop).toBe("Back to top");
    });

    it("should have data source label", () => {
      expect(en.dataSource).toBe("Data Source");
    });
  });

  describe("Welsh locale", () => {
    it("should have title", () => {
      expect(cy.title).toBe("Rhestr Gadarn y Goron");
    });

    it("should have page title", () => {
      expect(cy.pageTitle).toBe("Rhestr Gadarn y Goron ar gyfer");
    });

    it("should have fact link text", () => {
      expect(cy.factLinkText).toBe("Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd");
    });

    it("should have fact link URL", () => {
      expect(cy.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
    });

    it("should have fact additional text", () => {
      expect(cy.factAdditionalText).toBe("yng Nghymru a Lloegr, a rhai tribiwnlysoedd heb eu datganoli yn yr Alban.");
    });

    it("should have list for label", () => {
      expect(cy.listFor).toBe("Rhestr ar gyfer");
    });

    it("should have last updated label", () => {
      expect(cy.lastUpdated).toBe("Diweddarwyd ddiwethaf");
    });

    it("should have version label", () => {
      expect(cy.version).toBe("Fersiwn");
    });

    it("should have courtroom label", () => {
      expect(cy.courtroom).toBe("Ystafell Llys");
    });

    it("should have sitting at label", () => {
      expect(cy.sittingAt).toBe("Yn eistedd am");
    });

    it("should have hearing time label", () => {
      expect(cy.hearingTime).toBe("Amser Gwrandawiad");
    });

    it("should have case number label", () => {
      expect(cy.caseNumber).toBe("Rhif yr Achos");
    });

    it("should have defendant label", () => {
      expect(cy.defendant).toBe("Enw'r Diffynnydd/Diffynyddion");
    });

    it("should have hearing type label", () => {
      expect(cy.hearingType).toBe("Math o Wrandawiad");
    });

    it("should have representative label", () => {
      expect(cy.representative).toBe("Cynrychiolydd");
    });

    it("should have prosecuting authority label", () => {
      expect(cy.prosecutingAuthority).toBe("Awdurdod Erlyn");
    });

    it("should have listing notes label", () => {
      expect(cy.listingNotes).toBe("Nodiadau Rhestru");
    });

    it("should have reporting restrictions label", () => {
      expect(cy.reportingRestrictions).toBe("Cyfyngiad Adrodd");
    });

    it("should have reporting restrictions title", () => {
      expect(cy.reportingRestrictionsTitle).toBe("Cyfyngiadau ar gyhoeddi neu ysgrifennu am yr achosion hyn");
    });

    it("should have reporting restrictions body intro", () => {
      expect(cy.reportingRestrictionsBodyIntro).toContain("Rhaid i chi wirio a oes unrhyw gyfyngiadau adrodd");
    });

    it("should have reporting restrictions warning", () => {
      expect(cy.reportingRestrictionsWarning).toContain("Byddwch yn euog o ddirmyg llys");
    });

    it("should have search cases label", () => {
      expect(cy.searchCases).toBe("Chwilio achosion");
    });

    it("should have back to top label", () => {
      expect(cy.backToTop).toBe("Yn ôl i frig y dudalen");
    });

    it("should have data source label", () => {
      expect(cy.dataSource).toBe("Ffynhonnell Data");
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
        "listFor",
        "lastUpdated",
        "version",
        "courtroom",
        "sittingAt",
        "hearingTime",
        "caseNumber",
        "defendant",
        "hearingType",
        "representative",
        "prosecutingAuthority",
        "listingNotes",
        "reportingRestrictions",
        "reportingRestrictionsTitle",
        "reportingRestrictionsBodyIntro",
        "reportingRestrictionsWarning",
        "reportingRestrictionsBodySpecific",
        "reportingRestrictionsBodyHowever",
        "reportingRestrictionsBodyContact",
        "reportingRestrictionsContactCourt",
        "reportingRestrictionsContactHmcts",
        "searchCases",
        "backToTop",
        "courtHouseDetails",
        "dataSource"
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
      expect(en.listFor.length).toBeGreaterThan(0);
      expect(en.lastUpdated.length).toBeGreaterThan(0);
      expect(en.version.length).toBeGreaterThan(0);
      expect(en.courtroom.length).toBeGreaterThan(0);
      expect(en.sittingAt.length).toBeGreaterThan(0);
      expect(en.hearingTime.length).toBeGreaterThan(0);
      expect(en.caseNumber.length).toBeGreaterThan(0);
      expect(en.defendant.length).toBeGreaterThan(0);
      expect(en.hearingType.length).toBeGreaterThan(0);
      expect(en.representative.length).toBeGreaterThan(0);
      expect(en.prosecutingAuthority.length).toBeGreaterThan(0);
      expect(en.listingNotes.length).toBeGreaterThan(0);
      expect(en.reportingRestrictions.length).toBeGreaterThan(0);
      expect(en.reportingRestrictionsTitle.length).toBeGreaterThan(0);
      expect(en.searchCases.length).toBeGreaterThan(0);
      expect(en.backToTop.length).toBeGreaterThan(0);
      expect(en.dataSource.length).toBeGreaterThan(0);
    });

    it("should have non-empty strings for all Welsh string content", () => {
      expect(cy.title.length).toBeGreaterThan(0);
      expect(cy.pageTitle.length).toBeGreaterThan(0);
      expect(cy.factLinkText.length).toBeGreaterThan(0);
      expect(cy.factLinkUrl.length).toBeGreaterThan(0);
      expect(cy.factAdditionalText.length).toBeGreaterThan(0);
      expect(cy.listFor.length).toBeGreaterThan(0);
      expect(cy.lastUpdated.length).toBeGreaterThan(0);
      expect(cy.version.length).toBeGreaterThan(0);
      expect(cy.courtroom.length).toBeGreaterThan(0);
      expect(cy.sittingAt.length).toBeGreaterThan(0);
      expect(cy.hearingTime.length).toBeGreaterThan(0);
      expect(cy.caseNumber.length).toBeGreaterThan(0);
      expect(cy.defendant.length).toBeGreaterThan(0);
      expect(cy.hearingType.length).toBeGreaterThan(0);
      expect(cy.representative.length).toBeGreaterThan(0);
      expect(cy.prosecutingAuthority.length).toBeGreaterThan(0);
      expect(cy.listingNotes.length).toBeGreaterThan(0);
      expect(cy.reportingRestrictions.length).toBeGreaterThan(0);
      expect(cy.reportingRestrictionsTitle.length).toBeGreaterThan(0);
      expect(cy.searchCases.length).toBeGreaterThan(0);
      expect(cy.backToTop.length).toBeGreaterThan(0);
      expect(cy.dataSource.length).toBeGreaterThan(0);
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
        locationName: "Test Crown Court",
        addressLines: ["123 Court Street", "Test City", "TC1 1AA"],
        contentDate: "13 July 2026",
        lastUpdated: "13 July 2026 at 9:00am"
      },
      dataSource: "Test Source"
    };

    describe("Header variations", () => {
      it("should render header with version", () => {
        const html = env.render("crown-firm-list.njk", {
          ...baseTemplateData,
          header: {
            ...baseTemplateData.header,
            version: "1.0"
          },
          groupedListData: []
        });

        expect(html).toContain("Test Crown Court");
        expect(html).toContain("13 July 2026");
        expect(html).toContain("Version");
        expect(html).toContain("1.0");
      });

      it("should render header without version", () => {
        const html = env.render("crown-firm-list.njk", {
          ...baseTemplateData,
          header: {
            ...baseTemplateData.header,
            version: ""
          },
          groupedListData: []
        });

        expect(html).toContain("Test Crown Court");
        expect(html).not.toContain("Version");
      });

      it("should render address lines", () => {
        const html = env.render("crown-firm-list.njk", {
          ...baseTemplateData,
          groupedListData: []
        });

        expect(html).toContain("123 Court Street");
        expect(html).toContain("Test City");
        expect(html).toContain("TC1 1AA");
      });
    });

    describe("Day group and court house variations", () => {
      it("should render day group with full court house info", () => {
        const html = env.render("crown-firm-list.njk", {
          ...baseTemplateData,
          groupedListData: [
            {
              day: "Monday 14 July 2026",
              courtHouseInfo: {
                name: "Main Court House",
                addressLines: ["1 Court Street", "Building B", "London", "SW1A 1AA"],
                phone: "020 1234 5678"
              },
              sittings: []
            }
          ]
        });

        expect(html).toContain("Monday 14 July 2026");
        expect(html).toContain("Main Court House");
        expect(html).toContain("1 Court Street");
        expect(html).toContain("Building B");
        expect(html).toContain("London");
        expect(html).toContain("SW1A 1AA");
        expect(html).toContain("020 1234 5678");
      });

      it("should render day group without phone", () => {
        const html = env.render("crown-firm-list.njk", {
          ...baseTemplateData,
          groupedListData: [
            {
              day: "Tuesday 15 July 2026",
              courtHouseInfo: {
                name: "Branch Court",
                addressLines: ["2 Branch Road"],
                phone: ""
              },
              sittings: []
            }
          ]
        });

        expect(html).toContain("Tuesday 15 July 2026");
        expect(html).toContain("Branch Court");
        expect(html).toContain("2 Branch Road");
        const phoneMatches = html.match(/020 1234 5678/g);
        expect(phoneMatches).toBeNull();
      });
    });

    describe("Sitting variations", () => {
      it("should render sitting with judiciary", () => {
        const html = env.render("crown-firm-list.njk", {
          ...baseTemplateData,
          groupedListData: [
            {
              day: "Wednesday 16 July 2026",
              courtHouseInfo: {
                name: "Test Court",
                addressLines: ["Test Address"],
                phone: ""
              },
              sittings: [
                {
                  courtRoomName: "Court 1",
                  formattedJudiciaries: "Judge Smith",
                  time: "10:00am",
                  hearing: []
                }
              ]
            }
          ]
        });

        expect(html).toContain("Court 1");
        expect(html).toContain("Judge Smith");
        expect(html).toContain("10:00am");
      });

      it("should render sitting without judiciary", () => {
        const html = env.render("crown-firm-list.njk", {
          ...baseTemplateData,
          groupedListData: [
            {
              day: "Thursday 17 July 2026",
              courtHouseInfo: {
                name: "Test Court",
                addressLines: ["Test Address"],
                phone: ""
              },
              sittings: [
                {
                  courtRoomName: "Court 2",
                  formattedJudiciaries: "",
                  time: "2:00pm",
                  hearing: []
                }
              ]
            }
          ]
        });

        expect(html).toContain("Court 2");
        expect(html).toContain("2:00pm");
        const judgeMatches = html.match(/Judge Smith/g);
        expect(judgeMatches).toBeNull();
      });
    });

    describe("Case and hearing variations", () => {
      it("should render case with all fields", () => {
        const html = env.render("crown-firm-list.njk", {
          ...baseTemplateData,
          groupedListData: [
            {
              day: "Friday 18 July 2026",
              courtHouseInfo: {
                name: "Test Court",
                addressLines: ["Test Address"],
                phone: ""
              },
              sittings: [
                {
                  courtRoomName: "Court 1",
                  formattedJudiciaries: "",
                  time: "10:00am",
                  hearing: [
                    {
                      displayHearingType: "Trial",
                      case: [
                        {
                          timeMarkingNote: "10:30am",
                          caseNumber: "T12345",
                          defendants: "John Smith, Jane Doe",
                          representative: "Smith & Co Solicitors",
                          prosecutingAuthority: "CPS",
                          listingNotes: "Remote hearing",
                          formattedReportingRestriction: ""
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        });

        expect(html).toContain("10:30am");
        expect(html).toContain("T12345");
        expect(html).toContain("John Smith, Jane Doe");
        expect(html).toContain("Trial");
        expect(html).toContain("Smith &amp; Co Solicitors");
        expect(html).toContain("CPS");
        expect(html).toContain("Remote hearing");
      });

      it("should render case with empty optional fields", () => {
        const html = env.render("crown-firm-list.njk", {
          ...baseTemplateData,
          groupedListData: [
            {
              day: "Monday 21 July 2026",
              courtHouseInfo: {
                name: "Test Court",
                addressLines: ["Test Address"],
                phone: ""
              },
              sittings: [
                {
                  courtRoomName: "Court 3",
                  formattedJudiciaries: "",
                  time: "11:00am",
                  hearing: [
                    {
                      displayHearingType: "Mention",
                      case: [
                        {
                          timeMarkingNote: "",
                          caseNumber: "M67890",
                          defendants: "Test Defendant",
                          representative: "",
                          prosecutingAuthority: "",
                          listingNotes: "",
                          formattedReportingRestriction: ""
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        });

        expect(html).toContain("M67890");
        expect(html).toContain("Test Defendant");
        expect(html).toContain("Mention");
        const rows = html.match(/<td[^>]*class="govuk-table__cell[^"]*"[^>]*>[^<]*<\/td>/g) || [];
        const emptyCells = rows.filter((row) => row.includes("govuk-table__cell") && row.replace(/<[^>]+>/g, "").trim() === "");
        expect(emptyCells.length).toBeGreaterThan(0);
      });

      it("should render reporting restriction row when present", () => {
        const html = env.render("crown-firm-list.njk", {
          ...baseTemplateData,
          groupedListData: [
            {
              day: "Tuesday 22 July 2026",
              courtHouseInfo: {
                name: "Test Court",
                addressLines: ["Test Address"],
                phone: ""
              },
              sittings: [
                {
                  courtRoomName: "Court 4",
                  formattedJudiciaries: "",
                  time: "9:30am",
                  hearing: [
                    {
                      displayHearingType: "Trial",
                      case: [
                        {
                          timeMarkingNote: "9:45am",
                          caseNumber: "R99999",
                          defendants: "Anonymous Defendant",
                          representative: "Legal Aid",
                          prosecutingAuthority: "CPS",
                          listingNotes: "",
                          formattedReportingRestriction: "Section 39 Children and Young Persons Act 1933, Section 11 Contempt of Court Act 1981"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        });

        expect(html).toContain("R99999");
        expect(html).toContain("Reporting Restriction");
        expect(html).toContain("Section 39 Children and Young Persons Act 1933, Section 11 Contempt of Court Act 1981");
      });

      it("should not render reporting restriction row when empty", () => {
        const html = env.render("crown-firm-list.njk", {
          ...baseTemplateData,
          groupedListData: [
            {
              day: "Wednesday 23 July 2026",
              courtHouseInfo: {
                name: "Test Court",
                addressLines: ["Test Address"],
                phone: ""
              },
              sittings: [
                {
                  courtRoomName: "Court 5",
                  formattedJudiciaries: "",
                  time: "2:00pm",
                  hearing: [
                    {
                      displayHearingType: "Sentencing",
                      case: [
                        {
                          timeMarkingNote: "2:15pm",
                          caseNumber: "S11111",
                          defendants: "Normal Defendant",
                          representative: "Private Solicitor",
                          prosecutingAuthority: "CPS",
                          listingNotes: "Interpreter required",
                          formattedReportingRestriction: ""
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        });

        expect(html).toContain("S11111");
        expect(html).toContain("Normal Defendant");
        expect(html).toContain("Interpreter required");
        const restrictionMatches = html.match(/Reporting Restriction/g);
        expect(restrictionMatches).toBeNull();
      });

      it("should render multiple cases in one hearing", () => {
        const html = env.render("crown-firm-list.njk", {
          ...baseTemplateData,
          groupedListData: [
            {
              day: "Thursday 24 July 2026",
              courtHouseInfo: {
                name: "Test Court",
                addressLines: ["Test Address"],
                phone: ""
              },
              sittings: [
                {
                  courtRoomName: "Court 6",
                  formattedJudiciaries: "Judge Jones",
                  time: "10:00am",
                  hearing: [
                    {
                      displayHearingType: "PTPH",
                      case: [
                        {
                          timeMarkingNote: "10:00am",
                          caseNumber: "C11111",
                          defendants: "First Defendant",
                          representative: "First Solicitor",
                          prosecutingAuthority: "CPS",
                          listingNotes: "",
                          formattedReportingRestriction: ""
                        },
                        {
                          timeMarkingNote: "10:30am",
                          caseNumber: "C22222",
                          defendants: "Second Defendant",
                          representative: "Second Solicitor",
                          prosecutingAuthority: "CPS",
                          listingNotes: "",
                          formattedReportingRestriction: ""
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        });

        expect(html).toContain("C11111");
        expect(html).toContain("First Defendant");
        expect(html).toContain("C22222");
        expect(html).toContain("Second Defendant");
        expect(html).toContain("PTPH");
      });

      it("should render multiple hearings in one sitting", () => {
        const html = env.render("crown-firm-list.njk", {
          ...baseTemplateData,
          groupedListData: [
            {
              day: "Friday 25 July 2026",
              courtHouseInfo: {
                name: "Test Court",
                addressLines: ["Test Address"],
                phone: ""
              },
              sittings: [
                {
                  courtRoomName: "Court 7",
                  formattedJudiciaries: "Judge Williams",
                  time: "9:30am",
                  hearing: [
                    {
                      displayHearingType: "Trial",
                      case: [
                        {
                          timeMarkingNote: "9:30am",
                          caseNumber: "T11111",
                          defendants: "Trial Defendant One",
                          representative: "Trial Rep One",
                          prosecutingAuthority: "CPS",
                          listingNotes: "",
                          formattedReportingRestriction: ""
                        }
                      ]
                    },
                    {
                      displayHearingType: "Sentencing",
                      case: [
                        {
                          timeMarkingNote: "11:00am",
                          caseNumber: "S22222",
                          defendants: "Sentence Defendant Two",
                          representative: "Sentence Rep Two",
                          prosecutingAuthority: "CPS",
                          listingNotes: "",
                          formattedReportingRestriction: ""
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        });

        expect(html).toContain("T11111");
        expect(html).toContain("Trial Defendant One");
        expect(html).toContain("S22222");
        expect(html).toContain("Sentence Defendant Two");
        expect(html).toContain("Trial");
        expect(html).toContain("Sentencing");
      });
    });

    describe("Reporting restrictions section", () => {
      it("should render reporting restrictions section", () => {
        const html = env.render("crown-firm-list.njk", {
          ...baseTemplateData,
          groupedListData: []
        });

        expect(html).toContain("Restrictions on publishing or writing about these cases");
        expect(html).toContain("You must check if any reporting restrictions apply");
        expect(html).toContain("You&#39;ll be in contempt of court");
        expect(html).toContain("the court directly");
        expect(html).toContain("HM Courts and Tribunals Service on 0330 808 4407");
      });
    });

    describe("Search and navigation", () => {
      it("should render search input", () => {
        const html = env.render("crown-firm-list.njk", {
          ...baseTemplateData,
          groupedListData: []
        });

        expect(html).toContain("Search Cases");
        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('type="text"');
      });

      it("should render back to top link", () => {
        const html = env.render("crown-firm-list.njk", {
          ...baseTemplateData,
          groupedListData: []
        });

        expect(html).toContain("Back to top");
        expect(html).toContain('href="#top"');
      });
    });

    describe("Data source", () => {
      it("should render data source", () => {
        const html = env.render("crown-firm-list.njk", {
          ...baseTemplateData,
          dataSource: "CRIME",
          groupedListData: []
        });

        expect(html).toContain("Data Source");
        expect(html).toContain("CRIME");
      });
    });
  });
});
