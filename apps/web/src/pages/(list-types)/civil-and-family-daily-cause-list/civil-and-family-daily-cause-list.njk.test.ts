import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { civilAndFamilyDailyCauseListCy as cy, civilAndFamilyDailyCauseListEn as en } from "@hmcts/civil-and-family-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("civil-and-family-daily-cause-list template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");

    env = createTestEnvironment([__dirname, webCoreViews]);
  });

  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "civil-and-family-daily-cause-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have title", () => {
      expect(en.title).toBe("Civil and Family Daily Cause List");
    });

    it("should have page title", () => {
      expect(en.pageTitle).toBe("Civil and Family Daily Cause List for");
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

    it("should have important information text", () => {
      expect(en.importantInformation).toBe("Important information");
    });

    it("should have open justice intro text", () => {
      expect(en.openJusticeIntro).toContain("Open justice is a fundamental principle");
    });

    it("should have open justice contact function", () => {
      expect(typeof en.openJusticeContact).toBe("function");
      const contactText = en.openJusticeContact("Test Court", "test@example.com", "123456");
      expect(contactText).toContain("Test Court");
      expect(contactText).toContain("test@example.com");
      expect(contactText).toContain("123456");
    });

    it("should have open justice decision text", () => {
      expect(en.openJusticeDecision).toContain("The judge hearing the case will decide");
    });

    it("should have open justice private text", () => {
      expect(en.openJusticePrivate).toContain("Sometimes it is necessary for hearings to be held in private");
    });

    it("should have open justice more info text", () => {
      expect(en.openJusticeMoreInfo).toBe("For more information, please visit");
    });

    it("should have open justice link", () => {
      expect(en.openJusticeLink).toBe("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
    });

    it("should have search cases text", () => {
      expect(en.searchCases).toBe("Search Cases");
    });

    it("should have time label", () => {
      expect(en.time).toBe("Time");
    });

    it("should have before judge label", () => {
      expect(en.beforeJudge).toBe("Before");
    });

    it("should have case ref label", () => {
      expect(en.caseRef).toBe("Case ref");
    });

    it("should have case name label", () => {
      expect(en.caseName).toBe("Case name");
    });

    it("should have case type label", () => {
      expect(en.caseType).toBe("Case type");
    });

    it("should have hearing type label", () => {
      expect(en.hearingType).toBe("Hearing type");
    });

    it("should have location label", () => {
      expect(en.location).toBe("Location");
    });

    it("should have duration label", () => {
      expect(en.duration).toBe("Duration");
    });

    it("should have applicant label", () => {
      expect(en.applicant).toBe("Applicant/Petitioner");
    });

    it("should have respondent label", () => {
      expect(en.respondent).toBe("Respondent");
    });

    it("should have legal advisor label", () => {
      expect(en.legalAdvisor).toBe("Legal Advisor");
    });

    it("should have reporting restrictions label", () => {
      expect(en.reportingRestrictions).toBe("Reporting Restriction");
    });

    it("should have data source label", () => {
      expect(en.dataSource).toBe("Data Source");
    });
  });

  describe("Welsh locale", () => {
    it("should have title", () => {
      expect(cy.title).toBe("Rhestr Achos Dyddiol Sifil a Theulu");
    });

    it("should have page title", () => {
      expect(cy.pageTitle).toBe("Rhestr Achos Dyddiol Sifil a Theulu ar gyfer");
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

    it("should have list for label", () => {
      expect(cy.listFor).toBe("Rhestr ar gyfer");
    });

    it("should have last updated label", () => {
      expect(cy.lastUpdated).toBe("Diweddarwyd ddiwethaf");
    });

    it("should have important information text", () => {
      expect(cy.importantInformation).toBe("Gwybodaeth bwysig");
    });

    it("should have open justice intro text", () => {
      expect(cy.openJusticeIntro).toContain("Mae cyfiawnder agored yn egwyddor sylfaenol");
    });

    it("should have open justice contact function", () => {
      expect(typeof cy.openJusticeContact).toBe("function");
      const contactText = cy.openJusticeContact("Llys Prawf", "prawf@enghraifft.com", "123456");
      expect(contactText).toContain("Llys Prawf");
      expect(contactText).toContain("prawf@enghraifft.com");
      expect(contactText).toContain("123456");
    });

    it("should have open justice decision text", () => {
      expect(cy.openJusticeDecision).toContain("Bydd y barnwr sy'n gwrando'r achos yn penderfynu");
    });

    it("should have open justice private text", () => {
      expect(cy.openJusticePrivate).toContain("Weithiau mae'n angenrheidiol cynnal gwrandawiadau yn breifat");
    });

    it("should have open justice more info text", () => {
      expect(cy.openJusticeMoreInfo).toBe("I gael rhagor o wybodaeth, ewch i");
    });

    it("should have open justice link", () => {
      expect(cy.openJusticeLink).toBe("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
    });

    it("should have search cases text", () => {
      expect(cy.searchCases).toBe("Chwilio Achosion");
    });

    it("should have time label", () => {
      expect(cy.time).toBe("Amser");
    });

    it("should have before judge label", () => {
      expect(cy.beforeJudge).toBe("Gerbron");
    });

    it("should have case ref label", () => {
      expect(cy.caseRef).toBe("Cyfeirnod achos");
    });

    it("should have case name label", () => {
      expect(cy.caseName).toBe("Enw'r achos");
    });

    it("should have case type label", () => {
      expect(cy.caseType).toBe("Math o achos");
    });

    it("should have hearing type label", () => {
      expect(cy.hearingType).toBe("Math o wrandawiad");
    });

    it("should have location label", () => {
      expect(cy.location).toBe("Lleoliad");
    });

    it("should have duration label", () => {
      expect(cy.duration).toBe("Hyd");
    });

    it("should have applicant label", () => {
      expect(cy.applicant).toBe("Ceisiwr/Deisebydd");
    });

    it("should have respondent label", () => {
      expect(cy.respondent).toBe("Atebydd");
    });

    it("should have legal advisor label", () => {
      expect(cy.legalAdvisor).toBe("Cynrychiolydd Cyfreithiol");
    });

    it("should have reporting restrictions label", () => {
      expect(cy.reportingRestrictions).toBe("Cyfyngiad Adrodd");
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
        "importantInformation",
        "openJusticeIntro",
        "openJusticeContact",
        "openJusticeDecision",
        "openJusticePrivate",
        "openJusticeMoreInfo",
        "openJusticeLink",
        "openJusticeLinkText",
        "time",
        "beforeJudge",
        "caseRef",
        "caseName",
        "caseType",
        "hearingType",
        "location",
        "duration",
        "applicant",
        "respondent",
        "legalAdvisor",
        "reportingRestrictions",
        "searchCases",
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
      expect(en.importantInformation.length).toBeGreaterThan(0);
      expect(en.openJusticeIntro.length).toBeGreaterThan(0);
      expect(en.openJusticeDecision.length).toBeGreaterThan(0);
      expect(en.openJusticePrivate.length).toBeGreaterThan(0);
      expect(en.openJusticeMoreInfo.length).toBeGreaterThan(0);
      expect(en.openJusticeLink.length).toBeGreaterThan(0);
      expect(en.openJusticeLinkText.length).toBeGreaterThan(0);
      expect(en.time.length).toBeGreaterThan(0);
      expect(en.beforeJudge.length).toBeGreaterThan(0);
      expect(en.caseRef.length).toBeGreaterThan(0);
      expect(en.caseName.length).toBeGreaterThan(0);
      expect(en.caseType.length).toBeGreaterThan(0);
      expect(en.hearingType.length).toBeGreaterThan(0);
      expect(en.location.length).toBeGreaterThan(0);
      expect(en.duration.length).toBeGreaterThan(0);
      expect(en.applicant.length).toBeGreaterThan(0);
      expect(en.respondent.length).toBeGreaterThan(0);
      expect(en.legalAdvisor.length).toBeGreaterThan(0);
      expect(en.reportingRestrictions.length).toBeGreaterThan(0);
      expect(en.searchCases.length).toBeGreaterThan(0);
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
      expect(cy.importantInformation.length).toBeGreaterThan(0);
      expect(cy.openJusticeIntro.length).toBeGreaterThan(0);
      expect(cy.openJusticeDecision.length).toBeGreaterThan(0);
      expect(cy.openJusticePrivate.length).toBeGreaterThan(0);
      expect(cy.openJusticeMoreInfo.length).toBeGreaterThan(0);
      expect(cy.openJusticeLink.length).toBeGreaterThan(0);
      expect(cy.openJusticeLinkText.length).toBeGreaterThan(0);
      expect(cy.time.length).toBeGreaterThan(0);
      expect(cy.beforeJudge.length).toBeGreaterThan(0);
      expect(cy.caseRef.length).toBeGreaterThan(0);
      expect(cy.caseName.length).toBeGreaterThan(0);
      expect(cy.caseType.length).toBeGreaterThan(0);
      expect(cy.hearingType.length).toBeGreaterThan(0);
      expect(cy.location.length).toBeGreaterThan(0);
      expect(cy.duration.length).toBeGreaterThan(0);
      expect(cy.applicant.length).toBeGreaterThan(0);
      expect(cy.respondent.length).toBeGreaterThan(0);
      expect(cy.legalAdvisor.length).toBeGreaterThan(0);
      expect(cy.reportingRestrictions.length).toBeGreaterThan(0);
      expect(cy.searchCases.length).toBeGreaterThan(0);
      expect(cy.dataSource.length).toBeGreaterThan(0);
    });

    it("should have valid URLs", () => {
      expect(en.factLinkUrl).toMatch(/^https:\/\//);
      expect(en.openJusticeLink).toMatch(/^https:\/\//);
      expect(cy.factLinkUrl).toMatch(/^https:\/\//);
      expect(cy.openJusticeLink).toMatch(/^https:\/\//);
    });
  });

  describe("Template rendering with data variations", () => {
    const baseTemplateData = {
      t: en,
      en,
      cy,
      header: {
        locationName: "Test Court",
        addressLines: ["123 Test Street", "Test City", "TC1 1AA"],
        contentDate: "10 July 2026",
        lastUpdated: "10 July 2026 at 9:00am"
      },
      openJustice: {
        venueName: "Test Venue",
        email: "test@example.com",
        phone: "01234 567890"
      },
      dataSource: "Test Source"
    };

    describe("Court house address variations", () => {
      it("should render court house with full address", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Main Court House",
                  courtHouseAddress: {
                    line: ["1 Court Street", "Building B"],
                    town: "London",
                    county: "Greater London",
                    postCode: "SW1A 1AA"
                  },
                  courtRoom: []
                }
              }
            ]
          }
        });

        expect(html).toContain("Main Court House");
        expect(html).toContain("1 Court Street");
        expect(html).toContain("Building B");
        expect(html).toContain("London");
        expect(html).toContain("Greater London");
        expect(html).toContain("SW1A 1AA");
      });

      it("should render court house with partial address", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Branch Court",
                  courtHouseAddress: {
                    line: ["2 Branch Road"],
                    town: "Manchester",
                    postCode: "M1 1AA"
                  },
                  courtRoom: []
                }
              }
            ]
          }
        });

        expect(html).toContain("Branch Court");
        expect(html).toContain("2 Branch Road");
        expect(html).toContain("Manchester");
        expect(html).toContain("M1 1AA");
        expect(html).not.toContain("Greater London");
      });

      it("should handle empty address lines", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Simple Court",
                  courtHouseAddress: {
                    line: ["", "Valid Line", ""],
                    postCode: "AB1 2CD"
                  },
                  courtRoom: []
                }
              }
            ]
          }
        });

        expect(html).toContain("Simple Court");
        expect(html).toContain("Valid Line");
        expect(html).toContain("AB1 2CD");
      });

      it("should not render court house name when address is missing", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Address-less Court",
                  courtRoom: []
                }
              }
            ]
          }
        });

        expect(html).not.toContain("Address-less Court");
      });
    });

    describe("Session judiciary variations", () => {
      it("should render session with judiciary", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Court",
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "Judge Smith",
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
        expect(html).toContain("Before");
        expect(html).toContain("Judge Smith");
      });

      it("should render session without judiciary", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Court",
                  courtRoom: [
                    {
                      courtRoomName: "Court 2",
                      session: [
                        {
                          formattedJudiciaries: "",
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

        expect(html).toContain("Court 2");
        expect(html).not.toContain("Before");
      });
    });

    describe("Duration variations", () => {
      it("should render duration with hours only (plural)", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Court",
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "10:00am",
                              durationAsHours: 2,
                              durationAsMinutes: 0,
                              caseHearingChannel: "In person",
                              hearing: [
                                {
                                  hearingType: "Trial",
                                  case: [
                                    {
                                      caseNumber: "T123",
                                      caseName: "Test v Test",
                                      caseType: "Civil",
                                      applicant: "",
                                      respondent: ""
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

        expect(html).toContain("2 hours");
      });

      it("should render duration with hour only (singular)", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Court",
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "10:00am",
                              durationAsHours: 1,
                              durationAsMinutes: 0,
                              caseHearingChannel: "In person",
                              hearing: [
                                {
                                  hearingType: "Hearing",
                                  case: [
                                    {
                                      caseNumber: "H123",
                                      caseName: "Test v Test",
                                      caseType: "Civil",
                                      applicant: "",
                                      respondent: ""
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

        expect(html).toContain("1 hour");
        expect(html).not.toContain("1 hours");
      });

      it("should render duration with minutes only (plural)", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Court",
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "11:00am",
                              durationAsHours: 0,
                              durationAsMinutes: 30,
                              caseHearingChannel: "Video",
                              hearing: [
                                {
                                  hearingType: "Directions",
                                  case: [
                                    {
                                      caseNumber: "D123",
                                      caseName: "Short Case",
                                      caseType: "Family",
                                      applicant: "",
                                      respondent: ""
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

        expect(html).toContain("30 mins");
      });

      it("should render duration with minute only (singular)", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Court",
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "2:00pm",
                              durationAsHours: 0,
                              durationAsMinutes: 1,
                              caseHearingChannel: "Telephone",
                              hearing: [
                                {
                                  hearingType: "Mention",
                                  case: [
                                    {
                                      caseNumber: "M123",
                                      caseName: "Quick Case",
                                      caseType: "Civil",
                                      applicant: "",
                                      respondent: ""
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

        expect(html).toContain("1 min");
        expect(html).not.toContain("1 mins");
      });

      it("should render duration with hours and minutes", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Court",
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "9:30am",
                              durationAsHours: 2,
                              durationAsMinutes: 45,
                              caseHearingChannel: "In person",
                              hearing: [
                                {
                                  hearingType: "Full Hearing",
                                  case: [
                                    {
                                      caseNumber: "F123",
                                      caseName: "Long Case",
                                      caseType: "Civil",
                                      applicant: "",
                                      respondent: ""
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

        expect(html).toContain("2 hours 45 mins");
      });
    });

    describe("Case variations", () => {
      it("should render case with sequence indicator", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Court",
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "10:00am",
                              durationAsHours: 1,
                              durationAsMinutes: 0,
                              caseHearingChannel: "In person",
                              hearing: [
                                {
                                  hearingType: "Trial",
                                  case: [
                                    {
                                      caseNumber: "T123",
                                      caseName: "Smith v Jones",
                                      caseSequenceIndicator: "2 of 3",
                                      caseType: "Civil",
                                      applicant: "",
                                      respondent: ""
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

        expect(html).toContain("Smith v Jones [2 of 3]");
      });

      it("should render case without sequence indicator", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Court",
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "10:00am",
                              durationAsHours: 1,
                              durationAsMinutes: 0,
                              caseHearingChannel: "In person",
                              hearing: [
                                {
                                  hearingType: "Trial",
                                  case: [
                                    {
                                      caseNumber: "T456",
                                      caseName: "Brown v White",
                                      caseType: "Family",
                                      applicant: "",
                                      respondent: ""
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

        expect(html).toContain("Brown v White");
        expect(html).not.toContain("[");
        expect(html).not.toContain("]");
      });

      it("should render case with applicant and representative", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Court",
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "10:00am",
                              durationAsHours: 1,
                              durationAsMinutes: 0,
                              caseHearingChannel: "In person",
                              hearing: [
                                {
                                  hearingType: "Hearing",
                                  case: [
                                    {
                                      caseNumber: "H789",
                                      caseName: "Green v Black",
                                      caseType: "Civil",
                                      applicant: "John Green",
                                      applicantRepresentative: "Smith & Co Solicitors",
                                      respondent: "",
                                      respondentRepresentative: ""
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

        expect(html).toContain("John Green");
        expect(html).toContain("Legal Advisor");
        expect(html).toContain("Smith &amp; Co Solicitors");
      });

      it("should render case with respondent and representative", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Court",
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "2:00pm",
                              durationAsHours: 1,
                              durationAsMinutes: 30,
                              caseHearingChannel: "Video",
                              hearing: [
                                {
                                  hearingType: "Directions",
                                  case: [
                                    {
                                      caseNumber: "D456",
                                      caseName: "Red v Blue",
                                      caseType: "Family",
                                      applicant: "",
                                      applicantRepresentative: "",
                                      respondent: "Mary Blue",
                                      respondentRepresentative: "Jones Legal LLP"
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

        expect(html).toContain("Mary Blue");
        expect(html).toContain("Legal Advisor");
        expect(html).toContain("Jones Legal LLP");
      });

      it("should render case without parties", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Court",
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "3:00pm",
                              durationAsHours: 0,
                              durationAsMinutes: 15,
                              caseHearingChannel: "Telephone",
                              hearing: [
                                {
                                  hearingType: "Mention",
                                  case: [
                                    {
                                      caseNumber: "M789",
                                      caseName: "Orange v Purple",
                                      caseType: "Civil",
                                      applicant: "",
                                      applicantRepresentative: "",
                                      respondent: "",
                                      respondentRepresentative: ""
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

        expect(html).toContain("Orange v Purple");
        const rows = html.match(/<td[^>]*class="govuk-table__cell[^"]*"[^>]*>[^<]*<\/td>/g) || [];
        const emptyApplicantCell = rows.some((row) => row.includes("govuk-table__cell") && row.replace(/<[^>]+>/g, "").trim() === "");
        expect(emptyApplicantCell).toBe(true);
      });

      it("should render case with reporting restrictions", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Court",
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "11:00am",
                              durationAsHours: 2,
                              durationAsMinutes: 0,
                              caseHearingChannel: "In person",
                              hearing: [
                                {
                                  hearingType: "Trial",
                                  case: [
                                    {
                                      caseNumber: "R123",
                                      caseName: "Restricted Case",
                                      caseType: "Family",
                                      applicant: "Applicant Name",
                                      respondent: "Respondent Name",
                                      formattedReportingRestriction: "Section 39 applies, Section 11 applies"
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
        expect(html).toContain("Section 39 applies, Section 11 applies");
      });

      it("should not render reporting restriction row when empty", () => {
        const { html } = render(env, "civil-and-family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Court",
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "10:00am",
                              durationAsHours: 1,
                              durationAsMinutes: 0,
                              caseHearingChannel: "In person",
                              hearing: [
                                {
                                  hearingType: "Hearing",
                                  case: [
                                    {
                                      caseNumber: "N123",
                                      caseName: "Normal Case",
                                      caseType: "Civil",
                                      applicant: "Test Applicant",
                                      respondent: "Test Respondent",
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

        expect(html).toContain("Normal Case");
        const restrictionMatches = html.match(/Reporting Restriction/g);
        expect(restrictionMatches).toBeNull();
      });
    });
  });
});
