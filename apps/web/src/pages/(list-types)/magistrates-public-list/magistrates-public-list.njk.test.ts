import path from "node:path";
import { fileURLToPath } from "node:url";
import { magistratesPublicListCy, magistratesPublicListEn } from "@hmcts/magistrates-public-list";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
const govukFrontend = path.resolve(__dirname, "../../../../../../node_modules/govuk-frontend/dist");

describe("magistrates-public-list.njk", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = nunjucks.configure([__dirname, webCoreViews, govukFrontend], {
      autoescape: true,
      noCache: true
    });
  });

  describe("Locale content", () => {
    describe("English locale", () => {
      it("should have all required keys", () => {
        const requiredKeys = [
          "title",
          "header",
          "listDate",
          "listUpdated",
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText",
          "restrictionInformationHeading",
          "restrictionInformationP1",
          "restrictionInformationBoldText",
          "restrictionInformationP2",
          "restrictionInformationP3",
          "restrictionInformationP4",
          "restrictionBulletPoint1",
          "restrictionBulletPoint2",
          "sittingAt",
          "urn",
          "name",
          "hearingType",
          "prosecutingAuthority",
          "reportingRestrictions",
          "reportingRestrictionText",
          "offenceDetails",
          "searchCases",
          "dataSource",
          "errorTitle",
          "errorMessage",
          "error403Title",
          "error403Message"
        ];

        requiredKeys.forEach((key) => {
          expect(magistratesPublicListEn).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(magistratesPublicListEn.title).toBe("Magistrates Public List");
        expect(magistratesPublicListEn.header).toBe("Magistrates Public List for");
        expect(magistratesPublicListEn.listDate).toBe("List for");
        expect(magistratesPublicListEn.listUpdated).toBe("Last updated DATE at");
        expect(magistratesPublicListEn.searchCases).toBe("Search Cases");
      });

      it("should have correct table header labels", () => {
        expect(magistratesPublicListEn.sittingAt).toBe("Sitting at");
        expect(magistratesPublicListEn.urn).toBe("URN");
        expect(magistratesPublicListEn.name).toBe("Name");
        expect(magistratesPublicListEn.hearingType).toBe("Hearing Type");
        expect(magistratesPublicListEn.prosecutingAuthority).toBe("Prosecuting Authority");
      });

      it("should have restriction information text", () => {
        expect(magistratesPublicListEn.restrictionInformationHeading).toBe("Restrictions on publishing or writing about these cases");
        expect(magistratesPublicListEn.restrictionInformationP1).toContain("You must check if any reporting restrictions apply");
        expect(magistratesPublicListEn.restrictionInformationBoldText).toContain("contempt of court");
      });
    });

    describe("Welsh locale", () => {
      it("should have all required keys", () => {
        const requiredKeys = [
          "title",
          "header",
          "listDate",
          "listUpdated",
          "factLinkText",
          "factLinkUrl",
          "factAdditionalText",
          "restrictionInformationHeading",
          "restrictionInformationP1",
          "restrictionInformationBoldText",
          "restrictionInformationP2",
          "restrictionInformationP3",
          "restrictionInformationP4",
          "restrictionBulletPoint1",
          "restrictionBulletPoint2",
          "sittingAt",
          "urn",
          "name",
          "hearingType",
          "prosecutingAuthority",
          "reportingRestrictions",
          "reportingRestrictionText",
          "offenceDetails",
          "searchCases",
          "dataSource",
          "errorTitle",
          "errorMessage",
          "error403Title",
          "error403Message"
        ];

        requiredKeys.forEach((key) => {
          expect(magistratesPublicListCy).toHaveProperty(key);
        });
      });

      it("should have correct static text values", () => {
        expect(magistratesPublicListCy.title).toBe("Rhestr Gyhoeddus y Llys Ynadon");
        expect(magistratesPublicListCy.header).toBe("Rhestr Gyhoeddus y Llys Ynadon ar gyfer");
        expect(magistratesPublicListCy.listDate).toBe("Rhestr ar gyfer");
        expect(magistratesPublicListCy.listUpdated).toBe("Diweddarwyd diwethaf DATE am");
        expect(magistratesPublicListCy.searchCases).toBe("Chwilio Achosion");
      });

      it("should have correct table header labels", () => {
        expect(magistratesPublicListCy.sittingAt).toBe("Yn eistedd yn");
        expect(magistratesPublicListCy.urn).toBe("URN");
        expect(magistratesPublicListCy.name).toBe("Enw");
        expect(magistratesPublicListCy.hearingType).toBe("Math o Wrandawiad");
        expect(magistratesPublicListCy.prosecutingAuthority).toBe("Yr Awdurdod sy'n Erlyn");
      });
    });

    describe("Locale consistency", () => {
      it("should have same structure in English and Welsh", () => {
        expect(Object.keys(magistratesPublicListEn).sort()).toEqual(Object.keys(magistratesPublicListCy).sort());
      });

      it("should have same types for each key", () => {
        Object.keys(magistratesPublicListEn).forEach((key) => {
          const enType = typeof magistratesPublicListEn[key as keyof typeof magistratesPublicListEn];
          const cyType = typeof magistratesPublicListCy[key as keyof typeof magistratesPublicListCy];
          expect(enType).toBe(cyType);
        });
      });
    });
  });

  describe("Template rendering", () => {
    const baseData = {
      t: magistratesPublicListEn,
      header: {
        locationName: "Westminster Magistrates Court",
        contentDate: "15 January 2026",
        publishedDate: "14 January 2026",
        publishedTime: "12:00pm",
        venueAddress: []
      },
      dataSource: "Manual Upload",
      listData: {
        courtLists: []
      }
    };

    describe("Header section", () => {
      it("should render page title with location name", () => {
        const html = env.render("magistrates-public-list.njk", baseData);
        expect(html).toContain("Magistrates Public List for");
        expect(html).toContain("Westminster Magistrates Court");
      });

      it("should render content date", () => {
        const html = env.render("magistrates-public-list.njk", baseData);
        expect(html).toContain("List for");
        expect(html).toContain("15 January 2026");
      });

      it("should render published date and time", () => {
        const html = env.render("magistrates-public-list.njk", baseData);
        expect(html).toContain("14 January 2026");
        expect(html).toContain("12:00pm");
      });

      it("should render FACT link", () => {
        const html = env.render("magistrates-public-list.njk", baseData);
        expect(html).toContain("Find contact details and other information about courts and tribunals");
        expect(html).toContain("https://www.find-court-tribunal.service.gov.uk/");
      });

      it("should render venue address when present", () => {
        const data = {
          ...baseData,
          header: {
            ...baseData.header,
            venueAddress: ["181 Marylebone Road", "London", "NW1 5BR"]
          }
        };

        const html = env.render("magistrates-public-list.njk", data);
        expect(html).toContain("181 Marylebone Road");
        expect(html).toContain("London");
        expect(html).toContain("NW1 5BR");
      });

      it("should not render venue address section when empty", () => {
        const html = env.render("magistrates-public-list.njk", baseData);
        expect(html).not.toContain("181 Marylebone Road");
      });
    });

    describe("Restriction information section", () => {
      it("should render restriction heading", () => {
        const html = env.render("magistrates-public-list.njk", baseData);
        expect(html).toContain("Restrictions on publishing or writing about these cases");
      });

      it("should render warning text", () => {
        const html = env.render("magistrates-public-list.njk", baseData);
        expect(html).toContain("govuk-warning-text");
        expect(html).toContain("contempt of court");
      });

      it("should render restriction information paragraphs", () => {
        const html = env.render("magistrates-public-list.njk", baseData);
        expect(html).toContain("You must check if any reporting restrictions apply");
        expect(html).toContain("Specific restrictions ordered by the court");
        expect(html).toContain("restrictions are not always listed");
      });

      it("should render restriction bullet points", () => {
        const html = env.render("magistrates-public-list.njk", baseData);
        expect(html).toContain("the court directly");
        expect(html).toContain("HM Courts and Tribunals Service on 0330 808 4407");
      });
    });

    describe("Search section", () => {
      it("should render search input", () => {
        const html = env.render("magistrates-public-list.njk", baseData);
        expect(html).toContain("Search Cases");
        expect(html).toContain('id="case-search-input"');
        expect(html).toContain('type="text"');
      });
    });

    describe("Empty court lists", () => {
      it("should render with no court lists", () => {
        const html = env.render("magistrates-public-list.njk", baseData);
        expect(html).toContain('id="court-lists-container"');
      });
    });

    describe("Court rooms and sessions", () => {
      it("should render court room with judiciary", () => {
        const data = {
          ...baseData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "District Judge Smith",
                          sittings: []
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        };

        const html = env.render("magistrates-public-list.njk", data);
        expect(html).toContain("Court 1");
        expect(html).toContain("District Judge Smith");
        expect(html).toContain("govuk-accordion");
      });

      it("should render court room without judiciary", () => {
        const data = {
          ...baseData,
          listData: {
            courtLists: [
              {
                courtHouse: {
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
        };

        const html = env.render("magistrates-public-list.njk", data);
        expect(html).toContain("Court 2");
        expect(html).not.toContain(": District Judge");
      });
    });

    describe("Cases table", () => {
      it("should render table headers", () => {
        const data = {
          ...baseData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  hearingType: "Trial",
                                  case: [
                                    {
                                      caseUrn: "12AA3456789",
                                      defendant: "John Smith",
                                      prosecutingAuthority: "CPS",
                                      offences: [],
                                      reportingRestriction: false
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
        };

        const html = env.render("magistrates-public-list.njk", data);
        expect(html).toContain("Sitting at");
        expect(html).toContain("URN");
        expect(html).toContain("Name");
        expect(html).toContain("Hearing Type");
        expect(html).toContain("Prosecuting Authority");
      });

      it("should render case with all data", () => {
        const data = {
          ...baseData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  hearingType: "Trial",
                                  case: [
                                    {
                                      caseUrn: "12AA3456789",
                                      defendant: "John Smith",
                                      prosecutingAuthority: "Crown Prosecution Service",
                                      offences: ["Theft", "Assault"],
                                      reportingRestriction: true
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
        };

        const html = env.render("magistrates-public-list.njk", data);
        expect(html).toContain("10:00am");
        expect(html).toContain("12AA3456789");
        expect(html).toContain("John Smith");
        expect(html).toContain("Trial");
        expect(html).toContain("Crown Prosecution Service");
        expect(html).toContain("Offence Details");
        expect(html).toContain("Theft");
        expect(html).toContain("Assault");
        expect(html).toContain("Reporting Restrictions");
        expect(html).toContain("Press/Publication restrictions apply to this case");
      });

      it("should render case without offences", () => {
        const data = {
          ...baseData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  hearingType: "Plea Hearing",
                                  case: [
                                    {
                                      caseUrn: "12AA3456789",
                                      defendant: "Jane Doe",
                                      prosecutingAuthority: "CPS",
                                      offences: [],
                                      reportingRestriction: false
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
        };

        const html = env.render("magistrates-public-list.njk", data);
        expect(html).toContain("Jane Doe");
        expect(html).not.toContain("Offence Details");
      });

      it("should render case without reporting restrictions", () => {
        const data = {
          ...baseData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  hearingType: "Trial",
                                  case: [
                                    {
                                      caseUrn: "12AA3456789",
                                      defendant: "John Smith",
                                      prosecutingAuthority: "CPS",
                                      offences: ["Theft"],
                                      reportingRestriction: false
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
        };

        const html = env.render("magistrates-public-list.njk", data);
        expect(html).toContain("John Smith");
        expect(html).not.toContain("Press/Publication restrictions apply to this case");
      });

      it("should not add border when case has offences", () => {
        const data = {
          ...baseData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  hearingType: "Trial",
                                  case: [
                                    {
                                      caseUrn: "12AA3456789",
                                      defendant: "John Smith",
                                      prosecutingAuthority: "CPS",
                                      offences: ["Theft"],
                                      reportingRestriction: false
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
        };

        const html = env.render("magistrates-public-list.njk", data);
        expect(html).toContain("no-border-bottom");
      });
    });

    describe("Applications", () => {
      it("should render application with all data", () => {
        const data = {
          ...baseData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "2:00pm",
                              hearing: [
                                {
                                  hearingType: "Application",
                                  application: [
                                    {
                                      applicationReference: "APP-2026-001",
                                      defendant: "David Brown",
                                      prosecutingAuthority: "Local Authority",
                                      offences: ["Public Order Offence"]
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
        };

        const html = env.render("magistrates-public-list.njk", data);
        expect(html).toContain("2:00pm");
        expect(html).toContain("APP-2026-001");
        expect(html).toContain("David Brown");
        expect(html).toContain("Local Authority");
        expect(html).toContain("Public Order Offence");
      });

      it("should render application without offences", () => {
        const data = {
          ...baseData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "2:00pm",
                              hearing: [
                                {
                                  hearingType: "Application",
                                  application: [
                                    {
                                      applicationReference: "APP-2026-002",
                                      defendant: "Sarah Green",
                                      prosecutingAuthority: "CPS",
                                      offences: []
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
        };

        const html = env.render("magistrates-public-list.njk", data);
        expect(html).toContain("APP-2026-002");
        expect(html).toContain("Sarah Green");
        expect(html).not.toContain("Public Order Offence");
      });

      it("should render empty hearing type cell for applications", () => {
        const data = {
          ...baseData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "2:00pm",
                              hearing: [
                                {
                                  hearingType: "",
                                  application: [
                                    {
                                      applicationReference: "APP-2026-001",
                                      defendant: "Test Name",
                                      prosecutingAuthority: "CPS",
                                      offences: []
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
        };

        const html = env.render("magistrates-public-list.njk", data);
        expect(html).toContain("APP-2026-001");
        const hearingTypeMatches = html.match(/<td class="govuk-table__cell[^"]*">\s*<\/td>/g);
        expect(hearingTypeMatches).toBeTruthy();
      });
    });

    describe("Multiple items", () => {
      it("should render multiple cases in one sitting", () => {
        const data = {
          ...baseData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  hearingType: "Trial",
                                  case: [
                                    {
                                      caseUrn: "12AA3456789",
                                      defendant: "John Smith",
                                      prosecutingAuthority: "CPS",
                                      offences: [],
                                      reportingRestriction: false
                                    },
                                    {
                                      caseUrn: "12BB9876543",
                                      defendant: "Jane Doe",
                                      prosecutingAuthority: "Local Authority",
                                      offences: [],
                                      reportingRestriction: false
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
        };

        const html = env.render("magistrates-public-list.njk", data);
        expect(html).toContain("12AA3456789");
        expect(html).toContain("John Smith");
        expect(html).toContain("12BB9876543");
        expect(html).toContain("Jane Doe");
      });

      it("should render multiple sittings", () => {
        const data = {
          ...baseData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  hearingType: "Trial",
                                  case: [
                                    {
                                      caseUrn: "12AA3456789",
                                      defendant: "Morning Case",
                                      prosecutingAuthority: "CPS",
                                      offences: [],
                                      reportingRestriction: false
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              time: "2:00pm",
                              hearing: [
                                {
                                  hearingType: "Sentencing",
                                  case: [
                                    {
                                      caseUrn: "12BB9876543",
                                      defendant: "Afternoon Case",
                                      prosecutingAuthority: "Local Authority",
                                      offences: [],
                                      reportingRestriction: false
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
        };

        const html = env.render("magistrates-public-list.njk", data);
        expect(html).toContain("10:00am");
        expect(html).toContain("Morning Case");
        expect(html).toContain("2:00pm");
        expect(html).toContain("Afternoon Case");
      });

      it("should render multiple court rooms", () => {
        const data = {
          ...baseData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "District Judge A",
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  hearingType: "Trial",
                                  case: [
                                    {
                                      caseUrn: "12AA3456789",
                                      defendant: "Court One Case",
                                      prosecutingAuthority: "CPS",
                                      offences: [],
                                      reportingRestriction: false
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    },
                    {
                      courtRoomName: "Court 2",
                      session: [
                        {
                          formattedJudiciaries: "District Judge B",
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  hearingType: "Sentencing",
                                  case: [
                                    {
                                      caseUrn: "12BB9876543",
                                      defendant: "Court Two Case",
                                      prosecutingAuthority: "Local Authority",
                                      offences: [],
                                      reportingRestriction: false
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
        };

        const html = env.render("magistrates-public-list.njk", data);
        expect(html).toContain("Court 1");
        expect(html).toContain("District Judge A");
        expect(html).toContain("Court One Case");
        expect(html).toContain("Court 2");
        expect(html).toContain("District Judge B");
        expect(html).toContain("Court Two Case");
      });

      it("should render cases and applications together", () => {
        const data = {
          ...baseData,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtRoom: [
                    {
                      courtRoomName: "Court 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  hearingType: "Mixed",
                                  case: [
                                    {
                                      caseUrn: "12AA3456789",
                                      defendant: "Case Defendant",
                                      prosecutingAuthority: "CPS",
                                      offences: [],
                                      reportingRestriction: false
                                    }
                                  ],
                                  application: [
                                    {
                                      applicationReference: "APP-2026-001",
                                      defendant: "Application Defendant",
                                      prosecutingAuthority: "Local Authority",
                                      offences: []
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
        };

        const html = env.render("magistrates-public-list.njk", data);
        expect(html).toContain("12AA3456789");
        expect(html).toContain("Case Defendant");
        expect(html).toContain("APP-2026-001");
        expect(html).toContain("Application Defendant");
      });
    });

    describe("Footer section", () => {
      it("should render data source", () => {
        const html = env.render("magistrates-public-list.njk", baseData);
        expect(html).toContain("Data Source");
        expect(html).toContain("Manual Upload");
      });
    });

    describe("Welsh rendering", () => {
      it("should render with Welsh locale", () => {
        const welshData = {
          ...baseData,
          t: magistratesPublicListCy
        };

        const html = env.render("magistrates-public-list.njk", welshData);
        expect(html).toContain("Rhestr Gyhoeddus y Llys Ynadon ar gyfer");
        expect(html).toContain("Rhestr ar gyfer");
        expect(html).toContain("Diweddarwyd diwethaf");
        expect(html).toContain("Cyfyngiadau ar gyhoeddi neu ysgrifennu am yr achosion hyn");
        expect(html).toContain("Chwilio Achosion");
      });

      it("should render Welsh table headers", () => {
        const welshData = {
          ...baseData,
          t: magistratesPublicListCy,
          listData: {
            courtLists: [
              {
                courtHouse: {
                  courtRoom: [
                    {
                      courtRoomName: "Llys 1",
                      session: [
                        {
                          formattedJudiciaries: "",
                          sittings: [
                            {
                              time: "10:00am",
                              hearing: [
                                {
                                  hearingType: "Treial",
                                  case: [
                                    {
                                      caseUrn: "12AA3456789",
                                      defendant: "John Smith",
                                      prosecutingAuthority: "CPS",
                                      offences: [],
                                      reportingRestriction: false
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
        };

        const html = env.render("magistrates-public-list.njk", welshData);
        expect(html).toContain("Yn eistedd yn");
        expect(html).toContain("URN");
        expect(html).toContain("Enw");
        expect(html).toContain("Math o Wrandawiad");
        expect(html).toContain("Yr Awdurdod sy&#39;n Erlyn");
      });

      it("should render Welsh restriction information", () => {
        const welshData = {
          ...baseData,
          t: magistratesPublicListCy
        };

        const html = env.render("magistrates-public-list.njk", welshData);
        expect(html).toContain("Cyfyngiadau ar gyhoeddi neu ysgrifennu am yr achosion hyn");
        expect(html).toContain("Rhaid i chi wirio");
        expect(html).toContain("dirmyg llys");
      });
    });
  });
});
