import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crownDailyListCy as cy, crownDailyListEn as en } from "@hmcts/crown-daily-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("crown-daily-cause-list template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");

    env = createTestEnvironment([__dirname, webCoreViews]);
  });

  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "crown-daily-cause-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have title", () => {
      expect(en.title).toBe("Crown Daily List");
    });

    it("should have page title", () => {
      expect(en.pageTitle).toBe("Crown Daily List for");
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

    it("should have reporting restrictions title", () => {
      expect(en.reportingRestrictionsTitle).toBe("Restrictions on publishing or writing about these cases");
    });

    it("should have reporting restrictions body intro", () => {
      expect(en.reportingRestrictionsBodyIntro).toContain("You must check if any reporting restrictions apply");
    });

    it("should have reporting restrictions warning", () => {
      expect(en.reportingRestrictionsWarning).toContain("You'll be in contempt of court");
    });

    it("should have reporting restrictions body specific", () => {
      expect(en.reportingRestrictionsBodySpecific).toContain("Specific restrictions ordered by the court");
    });

    it("should have reporting restrictions body however", () => {
      expect(en.reportingRestrictionsBodyHowever).toContain("However, restrictions are not always listed");
    });

    it("should have reporting restrictions body contact", () => {
      expect(en.reportingRestrictionsBodyContact).toBe("To find out which reporting restrictions apply on a specific case, contact:");
    });

    it("should have reporting restrictions contact court", () => {
      expect(en.reportingRestrictionsContactCourt).toBe("the court directly");
    });

    it("should have reporting restrictions contact HMCTS", () => {
      expect(en.reportingRestrictionsContactHmcts).toBe("HM Courts and Tribunals Service on 0330 808 4407");
    });

    it("should have search cases text", () => {
      expect(en.searchCases).toBe("Search Cases");
    });

    it("should have court label", () => {
      expect(en.court).toBe("COURT");
    });

    it("should have sitting at label", () => {
      expect(en.sittingAt).toBe("Sitting at");
    });

    it("should have hearing time label", () => {
      expect(en.hearingTime).toBe("Hearing Time");
    });

    it("should have case ref label", () => {
      expect(en.caseRef).toBe("Case Reference");
    });

    it("should have defendant label", () => {
      expect(en.defendant).toBe("Defendant Name(s)");
    });

    it("should have hearing type label", () => {
      expect(en.hearingType).toBe("Hearing Type");
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

    it("should have back to top text", () => {
      expect(en.backToTop).toBe("Back to top");
    });

    it("should have court house details text", () => {
      expect(en.courtHouseDetails).toBe("Court House Details");
    });

    it("should have data source label", () => {
      expect(en.dataSource).toBe("Data Source");
    });
  });

  describe("Welsh locale", () => {
    it("should have title", () => {
      expect(cy.title).toBe("Rhestr Ddyddiol y Goron");
    });

    it("should have page title", () => {
      expect(cy.pageTitle).toBe("Rhestr Ddyddiol y Goron ar gyfer");
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

    it("should have reporting restrictions title", () => {
      expect(cy.reportingRestrictionsTitle).toBe("Cyfyngiadau ar gyhoeddi neu ysgrifennu am yr achosion hyn");
    });

    it("should have reporting restrictions body intro", () => {
      expect(cy.reportingRestrictionsBodyIntro).toContain("Rhaid i chi wirio a oes unrhyw gyfyngiadau adrodd");
    });

    it("should have reporting restrictions warning", () => {
      expect(cy.reportingRestrictionsWarning).toContain("Byddwch yn euog o ddirmyg llys");
    });

    it("should have reporting restrictions body specific", () => {
      expect(cy.reportingRestrictionsBodySpecific).toContain("Bydd cyfyngiadau penodol a orchmynnwyd gan y llys");
    });

    it("should have reporting restrictions body however", () => {
      expect(cy.reportingRestrictionsBodyHowever).toContain("Fodd bynnag, nid yw cyfyngiadau bob amser");
    });

    it("should have reporting restrictions body contact", () => {
      expect(cy.reportingRestrictionsBodyContact).toBe("I ddarganfod pa gyfyngiadau adrodd sy'n berthnasol i achos penodol, cysylltwch â:");
    });

    it("should have reporting restrictions contact court", () => {
      expect(cy.reportingRestrictionsContactCourt).toBe("y llys yn uniongyrchol");
    });

    it("should have reporting restrictions contact HMCTS", () => {
      expect(cy.reportingRestrictionsContactHmcts).toBe("Gwasanaeth Llysoedd a Thribiwnlysoedd Ei Fawrhydi ar 0330 808 4407");
    });

    it("should have search cases text", () => {
      expect(cy.searchCases).toBe("Chwilio achosion");
    });

    it("should have court label", () => {
      expect(cy.court).toBe("LLYS");
    });

    it("should have sitting at label", () => {
      expect(cy.sittingAt).toBe("Yn eistedd am");
    });

    it("should have hearing time label", () => {
      expect(cy.hearingTime).toBe("Amser gwrandawiad");
    });

    it("should have case ref label", () => {
      expect(cy.caseRef).toBe("Cyfeirnod achos");
    });

    it("should have defendant label", () => {
      expect(cy.defendant).toBe("Diffynnydd/Diffynyddion");
    });

    it("should have hearing type label", () => {
      expect(cy.hearingType).toBe("Math o wrandawiad");
    });

    it("should have prosecuting authority label", () => {
      expect(cy.prosecutingAuthority).toBe("Awdurdod erlyn");
    });

    it("should have listing notes label", () => {
      expect(cy.listingNotes).toBe("Nodiadau rhestru");
    });

    it("should have reporting restrictions label", () => {
      expect(cy.reportingRestrictions).toBe("Cyfyngiad Adrodd");
    });

    it("should have back to top text", () => {
      expect(cy.backToTop).toBe("Yn ôl i frig y dudalen");
    });

    it("should have court house details text", () => {
      expect(cy.courtHouseDetails).toBe("Manylion y Llys");
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
        "court",
        "sittingAt",
        "hearingTime",
        "caseRef",
        "defendant",
        "hearingType",
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
      expect(en.court.length).toBeGreaterThan(0);
      expect(en.sittingAt.length).toBeGreaterThan(0);
      expect(en.hearingTime.length).toBeGreaterThan(0);
      expect(en.caseRef.length).toBeGreaterThan(0);
      expect(en.defendant.length).toBeGreaterThan(0);
      expect(en.hearingType.length).toBeGreaterThan(0);
      expect(en.prosecutingAuthority.length).toBeGreaterThan(0);
      expect(en.listingNotes.length).toBeGreaterThan(0);
      expect(en.reportingRestrictions.length).toBeGreaterThan(0);
      expect(en.reportingRestrictionsTitle.length).toBeGreaterThan(0);
      expect(en.reportingRestrictionsBodyIntro.length).toBeGreaterThan(0);
      expect(en.reportingRestrictionsWarning.length).toBeGreaterThan(0);
      expect(en.reportingRestrictionsBodySpecific.length).toBeGreaterThan(0);
      expect(en.reportingRestrictionsBodyHowever.length).toBeGreaterThan(0);
      expect(en.reportingRestrictionsBodyContact.length).toBeGreaterThan(0);
      expect(en.reportingRestrictionsContactCourt.length).toBeGreaterThan(0);
      expect(en.reportingRestrictionsContactHmcts.length).toBeGreaterThan(0);
      expect(en.searchCases.length).toBeGreaterThan(0);
      expect(en.backToTop.length).toBeGreaterThan(0);
      expect(en.courtHouseDetails.length).toBeGreaterThan(0);
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
      expect(cy.court.length).toBeGreaterThan(0);
      expect(cy.sittingAt.length).toBeGreaterThan(0);
      expect(cy.hearingTime.length).toBeGreaterThan(0);
      expect(cy.caseRef.length).toBeGreaterThan(0);
      expect(cy.defendant.length).toBeGreaterThan(0);
      expect(cy.hearingType.length).toBeGreaterThan(0);
      expect(cy.prosecutingAuthority.length).toBeGreaterThan(0);
      expect(cy.listingNotes.length).toBeGreaterThan(0);
      expect(cy.reportingRestrictions.length).toBeGreaterThan(0);
      expect(cy.reportingRestrictionsTitle.length).toBeGreaterThan(0);
      expect(cy.reportingRestrictionsBodyIntro.length).toBeGreaterThan(0);
      expect(cy.reportingRestrictionsWarning.length).toBeGreaterThan(0);
      expect(cy.reportingRestrictionsBodySpecific.length).toBeGreaterThan(0);
      expect(cy.reportingRestrictionsBodyHowever.length).toBeGreaterThan(0);
      expect(cy.reportingRestrictionsBodyContact.length).toBeGreaterThan(0);
      expect(cy.reportingRestrictionsContactCourt.length).toBeGreaterThan(0);
      expect(cy.reportingRestrictionsContactHmcts.length).toBeGreaterThan(0);
      expect(cy.searchCases.length).toBeGreaterThan(0);
      expect(cy.backToTop.length).toBeGreaterThan(0);
      expect(cy.courtHouseDetails.length).toBeGreaterThan(0);
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
        addressLines: ["123 Test Street", "Test City", "TC1 1AA"],
        contentDate: "10 July 2026",
        lastUpdated: "10 July 2026 at 9:00am"
      },
      dataSource: "Test Source"
    };

    describe("Header variations", () => {
      it("should render header with version", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          header: {
            ...baseTemplateData.header,
            version: "1.0"
          },
          listData: { courtLists: [] }
        });

        expect(html).toContain("Version");
        expect(html).toContain("1.0");
      });

      it("should render header without version", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          header: {
            ...baseTemplateData.header,
            version: ""
          },
          listData: { courtLists: [] }
        });

        expect(html).toContain("Test Crown Court");
        const versionMatches = html.match(/Version/g);
        expect(versionMatches).toBeNull();
      });

      it("should render multiple address lines", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          header: {
            ...baseTemplateData.header,
            addressLines: ["Line 1", "Line 2", "Line 3", "TC1 1AA"]
          },
          listData: { courtLists: [] }
        });

        expect(html).toContain("Line 1");
        expect(html).toContain("Line 2");
        expect(html).toContain("Line 3");
        expect(html).toContain("TC1 1AA");
      });
    });

    describe("Court house address variations", () => {
      it("should render court house with full address", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Main Crown Court House",
                  courtHouseAddressLines: ["1 Crown Street", "Building B", "London", "Greater London", "SW1A 1AA"],
                  courtHousePhone: "020 1234 5678",
                  courtRoom: []
                }
              }
            ]
          }
        });

        expect(html).toContain("Main Crown Court House");
        expect(html).toContain("1 Crown Street");
        expect(html).toContain("Building B");
        expect(html).toContain("London");
        expect(html).toContain("Greater London");
        expect(html).toContain("SW1A 1AA");
        expect(html).toContain("020 1234 5678");
      });

      it("should render court house without phone number", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Branch Crown Court",
                  courtHouseAddressLines: ["2 Branch Road", "Manchester", "M1 1AA"],
                  courtHousePhone: "",
                  courtRoom: []
                }
              }
            ]
          }
        });

        expect(html).toContain("Branch Crown Court");
        expect(html).toContain("2 Branch Road");
        expect(html).toContain("Manchester");
        expect(html).toContain("M1 1AA");
        const phoneMatches = html.match(/020/g);
        expect(phoneMatches).toBeNull();
      });
    });

    describe("Session judiciary variations", () => {
      it("should render session with judiciary", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Crown Court",
                  courtHouseAddressLines: ["Test Address"],
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "Judge Smith",
                          sittings: [],
                          hasListingNotes: false
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        });

        expect(html).toContain("COURT");
        expect(html).toContain("Court 1");
        expect(html).toContain("Judge Smith");
      });

      it("should render session without judiciary", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Crown Court",
                  courtHouseAddressLines: ["Test Address"],
                  courtRoom: [
                    {
                      courtRoomName: "Court 2",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [],
                          hasListingNotes: false
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        });

        expect(html).toContain("Court 2");
        expect(html).not.toContain("Judge");
      });
    });

    describe("Table column variations", () => {
      it("should render table with listing notes column when session has listing notes", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Crown Court",
                  courtHouseAddressLines: ["Test Address"],
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          hasListingNotes: true,
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  displayHearingType: "Trial",
                                  case: [
                                    {
                                      caseNumber: "T123",
                                      timeMarkingNote: "10:00 AM",
                                      defendants: "Defendant A",
                                      prosecutingAuthority: "CPS",
                                      listingNotes: "Test note"
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        });

        expect(html).toContain("Listing Notes");
        expect(html).toContain("Test note");
      });

      it("should render table without listing notes column when session has no listing notes", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Crown Court",
                  courtHouseAddressLines: ["Test Address"],
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          hasListingNotes: false,
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  displayHearingType: "Trial",
                                  case: [
                                    {
                                      caseNumber: "T123",
                                      timeMarkingNote: "10:00 AM",
                                      defendants: "Defendant A",
                                      prosecutingAuthority: "CPS"
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        });

        expect(html).toContain("Defendant A");
        const listingNotesMatches = html.match(/Listing Notes/g);
        expect(listingNotesMatches).toBeNull();
      });
    });

    describe("Case variations", () => {
      it("should render multiple sittings with different times", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Crown Court",
                  courtHouseAddressLines: ["Test Address"],
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          hasListingNotes: false,
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  displayHearingType: "Trial",
                                  case: [
                                    {
                                      caseNumber: "T123",
                                      timeMarkingNote: "10:00 AM",
                                      defendants: "Defendant A",
                                      prosecutingAuthority: "CPS"
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              time: "2:00pm",
                              hearing: [
                                {
                                  displayHearingType: "Sentencing",
                                  case: [
                                    {
                                      caseNumber: "S456",
                                      timeMarkingNote: "2:00 PM",
                                      defendants: "Defendant B",
                                      prosecutingAuthority: "CPS"
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        });

        expect(html).toContain("Sitting at");
        expect(html).toContain("10:00am");
        expect(html).toContain("2:00pm");
        expect(html).toContain("Defendant A");
        expect(html).toContain("Defendant B");
      });

      it("should render multiple hearings within a sitting", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Crown Court",
                  courtHouseAddressLines: ["Test Address"],
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          hasListingNotes: false,
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  displayHearingType: "Trial",
                                  case: [
                                    {
                                      caseNumber: "T123",
                                      timeMarkingNote: "10:00 AM",
                                      defendants: "Defendant A",
                                      prosecutingAuthority: "CPS"
                                    }
                                  ]
                                },
                                {
                                  displayHearingType: "Mention",
                                  case: [
                                    {
                                      caseNumber: "M456",
                                      timeMarkingNote: "10:30 AM",
                                      defendants: "Defendant B",
                                      prosecutingAuthority: "HMRC"
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        });

        expect(html).toContain("Trial");
        expect(html).toContain("Mention");
        expect(html).toContain("CPS");
        expect(html).toContain("HMRC");
      });

      it("should render multiple cases within a hearing", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Crown Court",
                  courtHouseAddressLines: ["Test Address"],
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          hasListingNotes: false,
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  displayHearingType: "Trial",
                                  case: [
                                    {
                                      caseNumber: "T123",
                                      timeMarkingNote: "10:00 AM",
                                      defendants: "Defendant A",
                                      prosecutingAuthority: "CPS"
                                    },
                                    {
                                      caseNumber: "T124",
                                      timeMarkingNote: "10:15 AM",
                                      defendants: "Defendant B",
                                      prosecutingAuthority: "CPS"
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        });

        expect(html).toContain("T123");
        expect(html).toContain("T124");
        expect(html).toContain("Defendant A");
        expect(html).toContain("Defendant B");
        expect(html).toContain("10:00 AM");
        expect(html).toContain("10:15 AM");
      });

      it("should render case with reporting restriction", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Crown Court",
                  courtHouseAddressLines: ["Test Address"],
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          hasListingNotes: false,
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  displayHearingType: "Trial",
                                  case: [
                                    {
                                      caseNumber: "R123",
                                      timeMarkingNote: "10:00 AM",
                                      defendants: "Defendant X",
                                      prosecutingAuthority: "CPS",
                                      formattedReportingRestriction: "Section 39 applies, Youth anonymity"
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        });

        expect(html).toContain("Reporting Restriction");
        expect(html).toContain("Section 39 applies, Youth anonymity");
      });

      it("should not render reporting restriction row when empty", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Crown Court",
                  courtHouseAddressLines: ["Test Address"],
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          hasListingNotes: false,
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  displayHearingType: "Trial",
                                  case: [
                                    {
                                      caseNumber: "N123",
                                      timeMarkingNote: "10:00 AM",
                                      defendants: "Normal Defendant",
                                      prosecutingAuthority: "CPS",
                                      formattedReportingRestriction: ""
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        });

        expect(html).toContain("Normal Defendant");
        const restrictionMatches = html.match(/<strong>.*?Reporting Restriction.*?<\/strong>/g);
        expect(restrictionMatches).toBeNull();
      });

      it("should render reporting restriction with correct colspan when listing notes present", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Crown Court",
                  courtHouseAddressLines: ["Test Address"],
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          hasListingNotes: true,
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  displayHearingType: "Trial",
                                  case: [
                                    {
                                      caseNumber: "R123",
                                      timeMarkingNote: "10:00 AM",
                                      defendants: "Defendant X",
                                      prosecutingAuthority: "CPS",
                                      listingNotes: "Test note",
                                      formattedReportingRestriction: "Section 39 applies"
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        });

        expect(html).toContain('colspan="6"');
        expect(html).toContain("Section 39 applies");
      });

      it("should render reporting restriction with correct colspan when listing notes absent", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Crown Court",
                  courtHouseAddressLines: ["Test Address"],
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          hasListingNotes: false,
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  displayHearingType: "Trial",
                                  case: [
                                    {
                                      caseNumber: "R123",
                                      timeMarkingNote: "10:00 AM",
                                      defendants: "Defendant X",
                                      prosecutingAuthority: "CPS",
                                      formattedReportingRestriction: "Section 39 applies"
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        });

        expect(html).toContain('colspan="5"');
        expect(html).toContain("Section 39 applies");
      });
    });

    describe("Multiple court lists", () => {
      it("should render multiple court houses", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "First Crown Court",
                  courtHouseAddressLines: ["1 First Street"],
                  courtRoom: []
                }
              },
              {
                courtHouse: {
                  courtHouseName: "Second Crown Court",
                  courtHouseAddressLines: ["2 Second Street"],
                  courtRoom: []
                }
              }
            ]
          }
        });

        expect(html).toContain("First Crown Court");
        expect(html).toContain("Second Crown Court");
        expect(html).toContain("1 First Street");
        expect(html).toContain("2 Second Street");
      });

      it("should render multiple accordions with unique IDs", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "First Crown Court",
                  courtHouseAddressLines: ["1 First Street"],
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          hasListingNotes: false,
                          sittings: []
                        }
                      ]
                    }
                  ]
                }
              },
              {
                courtHouse: {
                  courtHouseName: "Second Crown Court",
                  courtHouseAddressLines: ["2 Second Street"],
                  courtRoom: [
                    {
                      courtRoomName: "Court 2",
                      session: [
                        {
                          formattedJudiciaries: "",
                          hasListingNotes: false,
                          sittings: []
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        });

        expect(html).toContain('id="accordion-1"');
        expect(html).toContain('id="accordion-2"');
      });
    });

    describe("Empty data variations", () => {
      it("should render with no court lists", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: { courtLists: [] }
        });

        expect(html).toContain("Crown Daily List for");
        expect(html).toContain("Test Crown Court");
        expect(html).toContain("Restrictions on publishing");
      });

      it("should render court house with no court rooms", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Empty Crown Court",
                  courtHouseAddressLines: ["Empty Street"],
                  courtRoom: []
                }
              }
            ]
          }
        });

        expect(html).toContain("Empty Crown Court");
        expect(html).toContain("Empty Street");
      });

      it("should render court room with no sessions", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Crown Court",
                  courtHouseAddressLines: ["Test Address"],
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: []
                    }
                  ]
                }
              }
            ]
          }
        });

        expect(html).toContain("Test Crown Court");
        expect(html).toContain("Test Address");
      });

      it("should render session with no sittings", () => {
        const { html } = render(env, "crown-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Crown Court",
                  courtHouseAddressLines: ["Test Address"],
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "Judge Smith",
                          hasListingNotes: false,
                          sittings: []
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        });

        expect(html).toContain("Court 1");
        expect(html).toContain("Judge Smith");
      });
    });
  });
});
