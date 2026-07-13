import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { familyDailyCauseListCy as cy, familyDailyCauseListEn as en } from "@hmcts/family-daily-cause-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("family-daily-cause-list template", () => {
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
      const templatePath = path.join(__dirname, "family-daily-cause-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have title", () => {
      expect(en.title).toBe("Family Daily Cause List");
    });

    it("should have page title", () => {
      expect(en.pageTitle).toBe("Family Daily Cause List for");
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
      expect(en.before).toBe("Before");
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
      expect(en.applicant).toBe("Applicant");
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

    it("should have no hearings text", () => {
      expect(en.noHearings).toBe("No hearings today");
    });

    it("should have link to top text", () => {
      expect(en.linkToTop).toBe("Back to top");
    });

    it("should have data source label", () => {
      expect(en.dataSource).toBe("Data Source");
    });
  });

  describe("Welsh locale", () => {
    it("should have title", () => {
      expect(cy.title).toBe("Rhestr Achosion Dyddiol Teulu");
    });

    it("should have page title", () => {
      expect(cy.pageTitle).toBe("Rhestr Achosion Dyddiol Teulu ar gyfer");
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
      expect(cy.before).toBe("Gerbron");
    });

    it("should have case ref label", () => {
      expect(cy.caseRef).toBe("Cyfeirnod yr achos");
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
      expect(cy.applicant).toBe("Ceisydd");
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

    it("should have no hearings text", () => {
      expect(cy.noHearings).toBe("Dim gwrandawiadau heddiw");
    });

    it("should have link to top text", () => {
      expect(cy.linkToTop).toBe("Yn ôl i'r brig");
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
        "before",
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
        "noHearings",
        "linkToTop",
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
      expect(en.before.length).toBeGreaterThan(0);
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
      expect(en.noHearings.length).toBeGreaterThan(0);
      expect(en.linkToTop.length).toBeGreaterThan(0);
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
      expect(cy.before.length).toBeGreaterThan(0);
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
      expect(cy.noHearings.length).toBeGreaterThan(0);
      expect(cy.linkToTop.length).toBeGreaterThan(0);
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
        locationName: "Test Family Court",
        addressLines: ["123 Family Court Street", "Test City", "TC1 1AA"],
        contentDate: "10 July 2026",
        lastUpdated: "10 July 2026 at 9:00am"
      },
      openJustice: {
        venueName: "Test Family Venue",
        email: "family@example.com",
        phone: "01234 567890"
      },
      dataSource: "Test Family Source"
    };

    describe("Court house address variations", () => {
      it("should render court house with full address", () => {
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Main Family Court House",
                  courtHouseAddress: {
                    line: ["1 Family Court Street", "Building B"],
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

        expect(html).toContain("Main Family Court House");
        expect(html).toContain("1 Family Court Street");
        expect(html).toContain("Building B");
        expect(html).toContain("London");
        expect(html).toContain("Greater London");
        expect(html).toContain("SW1A 1AA");
      });

      it("should render court house with partial address", () => {
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Branch Family Court",
                  courtHouseAddress: {
                    line: ["2 Branch Family Road"],
                    town: "Manchester",
                    postCode: "M1 1AA"
                  },
                  courtRoom: []
                }
              }
            ]
          }
        });

        expect(html).toContain("Branch Family Court");
        expect(html).toContain("2 Branch Family Road");
        expect(html).toContain("Manchester");
        expect(html).toContain("M1 1AA");
        expect(html).not.toContain("Greater London");
      });

      it("should handle empty address lines", () => {
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Simple Family Court",
                  courtHouseAddress: {
                    line: ["", "Valid Family Line", ""],
                    postCode: "AB1 2CD"
                  },
                  courtRoom: []
                }
              }
            ]
          }
        });

        expect(html).toContain("Simple Family Court");
        expect(html).toContain("Valid Family Line");
        expect(html).toContain("AB1 2CD");
      });

      it("should not render court house name when address is missing", () => {
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Address-less Family Court",
                  courtRoom: []
                }
              }
            ]
          }
        });

        expect(html).not.toContain("Address-less Family Court");
      });
    });

    describe("Session judiciary variations", () => {
      it("should render session with judiciary", () => {
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Family Court",
                  courtRoom: [
                    {
                      courtRoomName: "Family Court 1",
                      session: [
                        {
                          formattedJudiciaries: "Judge Family Smith",
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

        expect(html).toContain("Family Court 1");
        expect(html).toContain("Before");
        expect(html).toContain("Judge Family Smith");
      });

      it("should render session without judiciary", () => {
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Family Court",
                  courtRoom: [
                    {
                      courtRoomName: "Family Court 2",
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

        expect(html).toContain("Family Court 2");
        expect(html).not.toContain("Before");
      });
    });

    describe("No hearings message", () => {
      it("should display no hearings message when session has no hearings", () => {
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Family Court",
                  courtRoom: [
                    {
                      courtRoomName: "Family Court 1",
                      session: [
                        {
                          formattedJudiciaries: "Judge Smith",
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: []
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

        expect(html).toContain("No hearings today");
      });
    });

    describe("Duration variations", () => {
      it("should render duration with hours only (plural)", () => {
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Family Court",
                  courtRoom: [
                    {
                      courtRoomName: "Family Court 1",
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
                                  hearingType: "Final Hearing",
                                  case: [
                                    {
                                      caseNumber: "FH123",
                                      caseName: "Family Case A v B",
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

        expect(html).toContain("2 hours");
      });

      it("should render duration with hour only (singular)", () => {
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Family Court",
                  courtRoom: [
                    {
                      courtRoomName: "Family Court 1",
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
                                  hearingType: "Directions",
                                  case: [
                                    {
                                      caseNumber: "FD123",
                                      caseName: "Family Test v Test",
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

        expect(html).toContain("1 hour");
        expect(html).not.toContain("1 hours");
      });

      it("should render duration with minutes only (plural)", () => {
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Family Court",
                  courtRoom: [
                    {
                      courtRoomName: "Family Court 1",
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
                                  hearingType: "First Hearing",
                                  case: [
                                    {
                                      caseNumber: "FF123",
                                      caseName: "Short Family Case",
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
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Family Court",
                  courtRoom: [
                    {
                      courtRoomName: "Family Court 1",
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
                                      caseNumber: "FM123",
                                      caseName: "Quick Family Case",
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

        expect(html).toContain("1 min");
        expect(html).not.toContain("1 mins");
      });

      it("should render duration with hours and minutes", () => {
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Family Court",
                  courtRoom: [
                    {
                      courtRoomName: "Family Court 1",
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
                                      caseNumber: "FL123",
                                      caseName: "Long Family Case",
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

        expect(html).toContain("2 hours 45 mins");
      });
    });

    describe("Case variations", () => {
      it("should render case with sequence indicator", () => {
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Family Court",
                  courtRoom: [
                    {
                      courtRoomName: "Family Court 1",
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
                                  hearingType: "Final Hearing",
                                  case: [
                                    {
                                      caseNumber: "FS123",
                                      caseName: "Smith v Jones",
                                      caseSequenceIndicator: "2 of 3",
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

        expect(html).toContain("Smith v Jones [2 of 3]");
      });

      it("should render case without sequence indicator", () => {
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Family Court",
                  courtRoom: [
                    {
                      courtRoomName: "Family Court 1",
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
                                      caseNumber: "F456",
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
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Family Court",
                  courtRoom: [
                    {
                      courtRoomName: "Family Court 1",
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
                                      caseNumber: "FA789",
                                      caseName: "Green v Black",
                                      caseType: "Family",
                                      applicant: "John Green",
                                      applicantRepresentative: "Family Solicitors Ltd",
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
        expect(html).toContain("Family Solicitors Ltd");
      });

      it("should render case with respondent and representative", () => {
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Family Court",
                  courtRoom: [
                    {
                      courtRoomName: "Family Court 1",
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
                                      caseNumber: "FR456",
                                      caseName: "Red v Blue",
                                      caseType: "Family",
                                      applicant: "",
                                      applicantRepresentative: "",
                                      respondent: "Mary Blue",
                                      respondentRepresentative: "Blue Family Law LLP"
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
        expect(html).toContain("Blue Family Law LLP");
      });

      it("should render case without parties", () => {
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Family Court",
                  courtRoom: [
                    {
                      courtRoomName: "Family Court 1",
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
                                      caseNumber: "FN789",
                                      caseName: "Orange v Purple",
                                      caseType: "Family",
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
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Family Court",
                  courtRoom: [
                    {
                      courtRoomName: "Family Court 1",
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
                                  hearingType: "Final Hearing",
                                  case: [
                                    {
                                      caseNumber: "FRC123",
                                      caseName: "Restricted Family Case",
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
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "Test Family Court",
                  courtRoom: [
                    {
                      courtRoomName: "Family Court 1",
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
                                      caseNumber: "FN123",
                                      caseName: "Normal Family Case",
                                      caseType: "Family",
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

        expect(html).toContain("Normal Family Case");
        const restrictionMatches = html.match(/Reporting Restriction/g);
        expect(restrictionMatches).toBeNull();
      });
    });

    describe("Multiple court lists", () => {
      it("should render multiple court lists", () => {
        const html = env.render("family-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "First Family Court",
                  courtHouseAddress: {
                    line: ["1 First Street"],
                    postCode: "F1 1AA"
                  },
                  courtRoom: [
                    {
                      courtRoomName: "Court 1A",
                      session: [
                        {
                          formattedJudiciaries: "Judge A",
                          sittings: []
                        }
                      ]
                    }
                  ]
                }
              },
              {
                courtHouse: {
                  courtHouseName: "Second Family Court",
                  courtHouseAddress: {
                    line: ["2 Second Street"],
                    postCode: "F2 2BB"
                  },
                  courtRoom: [
                    {
                      courtRoomName: "Court 2A",
                      session: [
                        {
                          formattedJudiciaries: "Judge B",
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

        expect(html).toContain("First Family Court");
        expect(html).toContain("1 First Street");
        expect(html).toContain("F1 1AA");
        expect(html).toContain("Court 1A");
        expect(html).toContain("Judge A");
        expect(html).toContain("Second Family Court");
        expect(html).toContain("2 Second Street");
        expect(html).toContain("F2 2BB");
        expect(html).toContain("Court 2A");
        expect(html).toContain("Judge B");
      });
    });
  });
});
