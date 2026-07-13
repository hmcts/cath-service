import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { civilDailyCauseListCy as cy, civilDailyCauseListEn as en } from "@hmcts/civil-daily-cause-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("civil-daily-cause-list.njk", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");

    env = createTestEnvironment([__dirname, webCoreViews]);
  });
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "civil-daily-cause-list.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Locale content", () => {
    describe("English locale", () => {
      it("should have all required keys", () => {
        const requiredKeys = [
          "title",
          "pageTitle",
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
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText",
          "searchCases",
          "time",
          "caseId",
          "caseName",
          "caseType",
          "hearingType",
          "location",
          "duration",
          "beforeJudge",
          "reportingRestrictions",
          "noHearings",
          "linkToTop",
          "dataSource",
          "errorTitle",
          "errorMessage",
          "error403Title",
          "error403Message"
        ];

        requiredKeys.forEach((key) => {
          expect(en).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(en.title).toBe("Civil Daily Cause List");
        expect(en.pageTitle).toBe("Civil Daily Cause List for");
        expect(en.listFor).toBe("List for");
        expect(en.lastUpdated).toBe("Last updated");
        expect(en.searchCases).toBe("Search Cases");
        expect(en.noHearings).toBe("No hearings today");
      });

      it("should have correct table header labels", () => {
        expect(en.time).toBe("Time");
        expect(en.caseId).toBe("Case ID");
        expect(en.caseName).toBe("Case name");
        expect(en.caseType).toBe("Case type");
        expect(en.hearingType).toBe("Hearing type");
        expect(en.location).toBe("Location");
        expect(en.duration).toBe("Duration");
      });

      it("should have openJusticeContact function that returns formatted string", () => {
        expect(typeof en.openJusticeContact).toBe("function");
        const result = en.openJusticeContact("Test Court", "test@example.com", "01234 567890");
        expect(result).toContain("Test Court");
        expect(result).toContain("test@example.com");
        expect(result).toContain("01234 567890");
      });

      it("should have correct URL values", () => {
        expect(en.openJusticeLink).toBe("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
        expect(en.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
      });
    });

    describe("Welsh locale", () => {
      it("should have all required keys", () => {
        const requiredKeys = [
          "title",
          "pageTitle",
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
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText",
          "searchCases",
          "time",
          "caseId",
          "caseName",
          "caseType",
          "hearingType",
          "location",
          "duration",
          "beforeJudge",
          "reportingRestrictions",
          "noHearings",
          "linkToTop",
          "dataSource",
          "errorTitle",
          "errorMessage",
          "error403Title",
          "error403Message"
        ];

        requiredKeys.forEach((key) => {
          expect(cy).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(cy.title).toBe("Rhestr Achosion Dyddiol Sifil");
        expect(cy.pageTitle).toBe("Rhestr Achosion Dyddiol Sifil ar gyfer");
        expect(cy.listFor).toBe("Rhestr ar gyfer");
        expect(cy.lastUpdated).toBe("Diweddarwyd ddiwethaf");
        expect(cy.searchCases).toBe("Chwilio Achosion");
        expect(cy.noHearings).toBe("Dim gwrandawiadau heddiw");
      });

      it("should have correct table header labels", () => {
        expect(cy.time).toBe("Amser");
        expect(cy.caseId).toBe("ID yr achos");
        expect(cy.caseName).toBe("Enw'r achos");
        expect(cy.caseType).toBe("Math o achos");
        expect(cy.hearingType).toBe("Math o wrandawiad");
        expect(cy.location).toBe("Lleoliad");
        expect(cy.duration).toBe("Hyd");
      });

      it("should have openJusticeContact function that returns formatted string", () => {
        expect(typeof cy.openJusticeContact).toBe("function");
        const result = cy.openJusticeContact("Llys Prawf", "prawf@enghraifft.cymru", "01234 567890");
        expect(result).toContain("Llys Prawf");
        expect(result).toContain("prawf@enghraifft.cymru");
        expect(result).toContain("01234 567890");
      });

      it("should have correct URL values", () => {
        expect(cy.openJusticeLink).toBe("https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing");
        expect(cy.factLinkUrl).toBe("https://www.find-court-tribunal.service.gov.uk/");
      });
    });

    describe("Locale consistency", () => {
      it("should have same structure in English and Welsh", () => {
        expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
      });

      it("should have same types for each key", () => {
        Object.keys(en).forEach((key) => {
          const enType = typeof en[key as keyof typeof en];
          const cyType = typeof cy[key as keyof typeof cy];
          expect(enType).toBe(cyType);
        });
      });
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
        contentDate: "13 July 2026",
        lastUpdated: "13 July 2026 at 9:00am"
      },
      openJustice: {
        venueName: "Test Venue",
        email: "test@example.com",
        phone: "01234 567890"
      },
      dataSource: "Test Source",
      listData: {
        courtLists: []
      }
    };

    describe("Court house address variations", () => {
      it("should render court house with full address", () => {
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
        const { html } = render(env, "civil-daily-cause-list.njk", {
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

      it("should not render court house section when address is missing", () => {
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
        expect(html).toContain("Judge Smith");
      });

      it("should render session without judiciary", () => {
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
        const judgeMatches = html.match(/Judge Smith/g);
        expect(judgeMatches).toBeNull();
      });
    });

    describe("No hearings message", () => {
      it("should show no hearings message when sittings are empty", () => {
        const { html } = render(env, "civil-daily-cause-list.njk", {
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

        expect(html).toContain("No hearings today");
      });

      it("should show no hearings message when hearings are empty", () => {
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
                              durationAsHours: 0,
                              durationAsMinutes: 0,
                              caseHearingChannel: "",
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

      it("should not show no hearings message when there are hearings", () => {
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
                                      caseName: "Test v Test",
                                      caseType: "Civil"
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

        expect(html).not.toContain("No hearings today");
        expect(html).toContain("Test v Test");
      });
    });

    describe("Duration variations", () => {
      it("should render duration with hours only (plural)", () => {
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
                                      caseType: "Civil"
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
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
                                      caseType: "Civil"
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
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
                                      caseType: "Civil"
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
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
                                      caseType: "Civil"
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
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
                                      caseType: "Civil"
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

      it("should render empty duration when both are zero", () => {
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
                              durationAsMinutes: 0,
                              caseHearingChannel: "In person",
                              hearing: [
                                {
                                  hearingType: "Mention",
                                  case: [
                                    {
                                      caseNumber: "Z123",
                                      caseName: "Zero Duration",
                                      caseType: "Civil"
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

        expect(html).toContain("Zero Duration");
        expect(html).not.toContain("0 hours");
        expect(html).not.toContain("0 mins");
      });
    });

    describe("Case variations", () => {
      it("should render case with sequence indicator", () => {
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
                                      caseType: "Civil"
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
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
                                      caseType: "Civil"
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

      it("should render case with reporting restrictions", () => {
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
                                      caseType: "Civil",
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
        const { html } = render(env, "civil-daily-cause-list.njk", {
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

      it("should render multiple cases in same sitting", () => {
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
                                      caseName: "First Case",
                                      caseType: "Civil"
                                    },
                                    {
                                      caseNumber: "T124",
                                      caseName: "Second Case",
                                      caseType: "Civil"
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

        expect(html).toContain("First Case");
        expect(html).toContain("Second Case");
        expect(html).toContain("T123");
        expect(html).toContain("T124");
      });

      it("should render multiple hearings in same sitting", () => {
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
                                      caseName: "First Hearing Case",
                                      caseType: "Civil"
                                    }
                                  ]
                                },
                                {
                                  hearingType: "Directions",
                                  case: [
                                    {
                                      caseNumber: "D456",
                                      caseName: "Second Hearing Case",
                                      caseType: "Civil"
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

        expect(html).toContain("First Hearing Case");
        expect(html).toContain("Second Hearing Case");
        expect(html).toContain("Trial");
        expect(html).toContain("Directions");
      });
    });

    describe("Multiple court rooms and sessions", () => {
      it("should render multiple court rooms", () => {
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
                          sittings: []
                        }
                      ]
                    },
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

        expect(html).toContain("Court 1");
        expect(html).toContain("Court 2");
      });

      it("should render multiple sessions in same court room", () => {
        const { html } = render(env, "civil-daily-cause-list.njk", {
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
                        },
                        {
                          formattedJudiciaries: "Judge Jones",
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

        expect(html).toContain("Judge Smith");
        expect(html).toContain("Judge Jones");
      });

      it("should render multiple court houses", () => {
        const { html } = render(env, "civil-daily-cause-list.njk", {
          ...baseTemplateData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtHouseName: "First Court House",
                  courtHouseAddress: {
                    line: ["1 First Street"],
                    postCode: "F1 1AA"
                  },
                  courtRoom: []
                }
              },
              {
                courtHouse: {
                  courtHouseName: "Second Court House",
                  courtHouseAddress: {
                    line: ["2 Second Street"],
                    postCode: "S2 2BB"
                  },
                  courtRoom: []
                }
              }
            ]
          }
        });

        expect(html).toContain("First Court House");
        expect(html).toContain("Second Court House");
        expect(html).toContain("1 First Street");
        expect(html).toContain("2 Second Street");
      });
    });
  });
});
