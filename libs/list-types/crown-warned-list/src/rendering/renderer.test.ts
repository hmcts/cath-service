import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderCrownWarnedListData, TO_BE_ALLOCATED_KEY } from "./renderer.js";

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

import { getLocationById } from "@hmcts/location";

const baseInput = {
  WarnedList: {
    DocumentID: { UniqueID: "CWPL-2025-001", DocumentType: "crown_warned_pdda_list" },
    ListHeader: {
      StartDate: "2025-11-10",
      EndDate: "2025-11-11",
      PublishedTime: "2025-11-12T09:00:00",
      Version: "1.0"
    },
    CrownCourt: {
      CourtHouseName: "Crown Court at Birmingham",
      CourtHouseTelephone: "0121 681 3400",
      CourtHouseAddress: {
        Line: ["Newton Street"],
        PostCode: "B4 7NA"
      }
    },
    CourtLists: []
  }
};

describe("renderCrownWarnedListData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("should render header with location name from CrownCourt", async () => {
    const result = await renderCrownWarnedListData(baseInput, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    expect(result.header.locationName).toBe("Crown Court at Birmingham");
    expect(result.header.dateRange).toBe("10 November 2025 to 11 November 2025");
    expect(result.header.version).toBe("1.0");
  });

  it("should format lastUpdated with date and time from PublishedTime", async () => {
    const result = await renderCrownWarnedListData(baseInput, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    expect(result.header.lastUpdated).toBe("12 November 2025 at 9am");
  });

  it("should set weekCommencing from contentDate option when date is a Monday", async () => {
    const result = await renderCrownWarnedListData(baseInput, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    expect(result.header.weekCommencing).toBe("10 November 2025");
  });

  it("should move weekCommencing back to the previous Monday when contentDate is a Wednesday", async () => {
    const result = await renderCrownWarnedListData(baseInput, {
      locationId: "102",
      contentDate: new Date("2025-11-12"),
      locale: "en"
    });

    expect(result.header.weekCommencing).toBe("10 November 2025");
  });

  it("should move weekCommencing back to the previous Monday when contentDate is a Sunday", async () => {
    const result = await renderCrownWarnedListData(baseInput, {
      locationId: "102",
      contentDate: new Date("2025-11-09"),
      locale: "en"
    });

    expect(result.header.weekCommencing).toBe("3 November 2025");
  });

  it("should return empty groupedCategories when no court lists", async () => {
    const result = await renderCrownWarnedListData(baseInput, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    expect(result.groupedCategories).toHaveLength(0);
  });

  it("should group WithFixedDate cases by HearingDescription from Case.Hearing[0]", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CourtLists: [
          {
            WithFixedDate: [
              {
                Fixture: [
                  {
                    FixedDate: "2025-11-22",
                    Cases: [
                      {
                        CaseNumber: "T20250001",
                        Hearing: [{ HearingDescription: "TestHearingDescription", ListNote: "" }],
                        Defendants: [
                          {
                            PersonalDetails: {
                              Name: { CitizenNameForename: ["Alice"], CitizenNameSurname: "Williams" },
                              IsMasked: "NO" as const
                            }
                          }
                        ],
                        Prosecution: { ProsecutingAuthority: "CPS" }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    expect(result.groupedCategories).toHaveLength(1);
    const group = result.groupedCategories.find((g) => g.category === "TestHearingDescription");
    expect(group?.cases).toHaveLength(1);
    expect(group?.cases[0].caseNumber).toBe("T20250001");
    expect(group?.cases[0].defendants).toBe("Alice Williams");
    expect(group?.cases[0].fixedFor).toBe("22/11/2025");
  });

  it("should use empty string as category key when HearingDescription is absent", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CourtLists: [
          {
            WithFixedDate: [
              {
                Fixture: [
                  {
                    FixedDate: "2025-11-22",
                    Cases: [
                      {
                        CaseNumber: "T20250001",
                        Defendants: [],
                        Prosecution: { ProsecutingAuthority: "CPS" }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    expect(result.groupedCategories).toHaveLength(1);
    const group = result.groupedCategories.find((g) => g.category === "");
    expect(group?.cases).toHaveLength(1);
    expect(group?.cases[0].fixedFor).toBe("22/11/2025");
  });

  it("should group WithoutFixedDate cases under TO_BE_ALLOCATED_KEY", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CourtLists: [
          {
            WithoutFixedDate: [
              {
                Fixture: [
                  {
                    Cases: [
                      {
                        CaseNumber: "T20250002",
                        Defendants: [],
                        Prosecution: { ProsecutingAuthority: "CPS" }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    expect(result.groupedCategories).toHaveLength(1);
    const group = result.groupedCategories.find((g) => g.category === TO_BE_ALLOCATED_KEY);
    expect(group?.cases).toHaveLength(1);
    expect(group?.cases[0].caseNumber).toBe("T20250002");
    expect(group?.cases[0].fixedFor).toBe("");
  });

  it("should set isInCustody=true when defendant has CustodyStatus On remand", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CourtLists: [
          {
            WithFixedDate: [
              {
                Fixture: [
                  {
                    FixedDate: "2025-11-22",
                    Cases: [
                      {
                        CaseNumber: "T20250010",
                        Hearing: [{ HearingDescription: "TestCategory", ListNote: "" }],
                        Defendants: [
                          {
                            PersonalDetails: {
                              Name: { CitizenNameForename: ["Tom"], CitizenNameSurname: "Hardy" },
                              IsMasked: "NO" as const,
                              CustodyStatus: "On remand"
                            }
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
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    const group = result.groupedCategories.find((g) => g.category === "TestCategory");
    expect(group?.cases[0].isInCustody).toBe(true);
    expect(group?.cases[0].defendants).toBe("Tom Hardy");
  });

  it("should set isInCustody=true when defendant has CustodyStatus In custody", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CourtLists: [
          {
            WithoutFixedDate: [
              {
                Fixture: [
                  {
                    Cases: [
                      {
                        CaseNumber: "T20250011",
                        Defendants: [
                          {
                            PersonalDetails: {
                              Name: { CitizenNameForename: ["Jane"], CitizenNameSurname: "Doe" },
                              IsMasked: "NO" as const,
                              CustodyStatus: "In custody"
                            }
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
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    const group = result.groupedCategories.find((g) => g.category === TO_BE_ALLOCATED_KEY);
    expect(group?.cases[0].isInCustody).toBe(true);
  });

  it("should set isInCustody=false for non-custody defendants", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CourtLists: [
          {
            WithoutFixedDate: [
              {
                Fixture: [
                  {
                    Cases: [
                      {
                        CaseNumber: "T20250012",
                        Defendants: [
                          {
                            PersonalDetails: {
                              Name: { CitizenNameForename: ["John"], CitizenNameSurname: "Smith" },
                              IsMasked: "NO" as const,
                              CustodyStatus: "On bail"
                            }
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
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    const group = result.groupedCategories.find((g) => g.category === TO_BE_ALLOCATED_KEY);
    expect(group?.cases[0].isInCustody).toBe(false);
  });

  it("should extract linkedCases from LinkedCases[].CaseNumber", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CourtLists: [
          {
            WithoutFixedDate: [
              {
                Fixture: [
                  {
                    Cases: [
                      {
                        CaseNumber: "T20250020",
                        LinkedCases: [{ CaseNumber: "T20240001" }, { CaseNumber: "T20240002" }],
                        Defendants: []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    const group = result.groupedCategories.find((g) => g.category === TO_BE_ALLOCATED_KEY);
    expect(group?.cases[0].linkedCases).toBe("T20240001, T20240002");
  });

  it("should get listingNotes from Case.Hearing[0].ListNote", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CourtLists: [
          {
            WithFixedDate: [
              {
                Fixture: [
                  {
                    FixedDate: "2025-11-22",
                    Cases: [
                      {
                        CaseNumber: "T20250030",
                        Hearing: [{ HearingDescription: "TestCategory", ListNote: "Interpreter required" }],
                        Defendants: []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    const group = result.groupedCategories.find((g) => g.category === "TestCategory");
    expect(group?.cases[0].listingNotes).toBe("Interpreter required");
  });

  it("should use Welsh dateSeparator 'i' when locale is cy", async () => {
    const result = await renderCrownWarnedListData(baseInput, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "cy"
    });

    expect(result.header.dateRange).toContain(" i ");
  });

  it("should use location name from getLocationById when available", async () => {
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 102, name: "Birmingham Crown Court", welshName: null });

    const result = await renderCrownWarnedListData(baseInput, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    expect(result.header.locationName).toBe("Birmingham Crown Court");
  });

  it("should use Welsh location name when locale is cy and welshName is available", async () => {
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 102, name: "Birmingham Crown Court", welshName: "Llys y Goron Birmingham" });

    const result = await renderCrownWarnedListData(baseInput, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "cy"
    });

    expect(result.header.locationName).toBe("Llys y Goron Birmingham");
  });

  it("should render dateRange with only StartDate when EndDate is missing", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        ListHeader: {
          StartDate: "2025-11-10",
          PublishedTime: "2025-11-12T09:00:00",
          Version: "1.0"
        }
      }
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    expect(result.header.dateRange).toBe("10 November 2025");
  });

  it("should render empty dateRange when neither StartDate nor EndDate", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        ListHeader: {
          PublishedTime: "2025-11-12T09:00:00",
          Version: "1.0"
        }
      }
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    expect(result.header.dateRange).toBe("");
  });

  it("should set isInCustody=true for In care custody status", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CourtLists: [
          {
            WithFixedDate: [
              {
                Fixture: [
                  {
                    FixedDate: "2025-11-22",
                    Cases: [
                      {
                        CaseNumber: "T20250050",
                        Defendants: [
                          {
                            PersonalDetails: {
                              Name: { CitizenNameForename: ["Sam"], CitizenNameSurname: "Jones" },
                              IsMasked: "NO" as const,
                              CustodyStatus: "In care"
                            }
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
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    const group = result.groupedCategories.find((g) => g.category === "");
    expect(group?.cases[0].isInCustody).toBe(true);
  });

  it("should handle defendant with CivizenNameTitle in name", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CourtLists: [
          {
            WithoutFixedDate: [
              {
                Fixture: [
                  {
                    Cases: [
                      {
                        CaseNumber: "T20250060",
                        Defendants: [
                          {
                            PersonalDetails: {
                              Name: { CitizenNameTitle: "Dr", CitizenNameForename: ["Emma"], CitizenNameSurname: "Watson" },
                              IsMasked: "NO" as const
                            }
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
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    const group = result.groupedCategories.find((g) => g.category === TO_BE_ALLOCATED_KEY);
    expect(group?.cases[0].defendants).toContain("Emma Watson");
  });

  it("should handle court with no address", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CrownCourt: {
          CourtHouseName: "No Address Court"
        }
      }
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    expect(result.header.addressLines).toEqual([]);
  });

  it("should use MaskedName when IsMasked is yes", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CourtLists: [
          {
            WithoutFixedDate: [
              {
                Fixture: [
                  {
                    Cases: [
                      {
                        CaseNumber: "T20250040",
                        Defendants: [
                          {
                            PersonalDetails: {
                              Name: { CitizenNameForename: ["Real"], CitizenNameSurname: "Name" },
                              MaskedName: "Restricted",
                              IsMasked: "YES" as const
                            }
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
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    const group = result.groupedCategories.find((g) => g.category === TO_BE_ALLOCATED_KEY);
    expect(group?.cases[0].defendants).toBe("Restricted");
  });

  it("should use MaskedName over CitizenNameRequestedName when IsMasked is yes", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CourtLists: [
          {
            WithoutFixedDate: [
              {
                Fixture: [
                  {
                    Cases: [
                      {
                        CaseNumber: "T20250041",
                        Defendants: [
                          {
                            PersonalDetails: {
                              Name: {
                                CitizenNameForename: ["Real"],
                                CitizenNameSurname: "Name",
                                CitizenNameRequestedName: "TestDefendantRequestedName"
                              },
                              MaskedName: "TestMaskedName2",
                              IsMasked: "YES" as const
                            }
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
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    const group = result.groupedCategories.find((g) => g.category === TO_BE_ALLOCATED_KEY);
    expect(group?.cases[0].defendants).toBe("TestMaskedName2");
  });

  it("should use CitizenNameRequestedName for defendant when present", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CourtLists: [
          {
            WithFixedDate: [
              {
                Fixture: [
                  {
                    FixedDate: "2025-11-22",
                    Cases: [
                      {
                        CaseNumber: "T20250099",
                        Defendants: [
                          {
                            PersonalDetails: {
                              Name: {
                                CitizenNameTitle: "Mr",
                                CitizenNameForename: ["RealForename"],
                                CitizenNameSurname: "RealSurname",
                                CitizenNameRequestedName: "RequestedName"
                              },
                              IsMasked: "NO" as const
                            }
                          }
                        ],
                        Hearing: [{ HearingDescription: "For Trial" }]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    const group = result.groupedCategories.find((g) => g.category === "For Trial");
    expect(group?.cases[0].defendants).toBe("RequestedName");
  });

  it("should place a case in multiple categories when it has multiple HearingDescriptions", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CourtLists: [
          {
            WithFixedDate: [
              {
                Fixture: [
                  {
                    FixedDate: "2025-11-22",
                    Cases: [
                      {
                        CaseNumber: "T20250100",
                        Defendants: [],
                        Hearing: [{ HearingDescription: "For Trial" }, { HearingDescription: "For Appeal" }]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    expect(result.groupedCategories.find((g) => g.category === "For Trial")?.cases[0].caseNumber).toBe("T20250100");
    expect(result.groupedCategories.find((g) => g.category === "For Appeal")?.cases[0].caseNumber).toBe("T20250100");
  });

  it("should return original FixedDate string when it is not a valid ISO date", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CourtLists: [
          {
            WithFixedDate: [
              {
                Fixture: [
                  {
                    FixedDate: "not-a-date",
                    Cases: [{ CaseNumber: "T20250200", Defendants: [] }]
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    const group = result.groupedCategories.find((g) => g.category === "");
    expect(group?.cases[0].fixedFor).toBe("not-a-date");
  });

  it("should use empty string for caseNumber when CaseNumber is absent", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CourtLists: [
          {
            WithFixedDate: [
              {
                Fixture: [
                  {
                    FixedDate: "2025-11-22",
                    Cases: [{ Defendants: [] } as any]
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    const group = result.groupedCategories.find((g) => g.category === "");
    expect(group?.cases[0].caseNumber).toBe("");
  });

  it("should use empty string for linkedCase entry when CaseNumber is absent", async () => {
    const input = {
      ...baseInput,
      WarnedList: {
        ...baseInput.WarnedList,
        CourtLists: [
          {
            WithFixedDate: [
              {
                Fixture: [
                  {
                    FixedDate: "2025-11-22",
                    Cases: [
                      {
                        CaseNumber: "T20250300",
                        Defendants: [],
                        LinkedCases: [{}] as any
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    const group = result.groupedCategories.find((g) => g.category === "");
    expect(group?.cases[0].linkedCases).toBe("");
  });
});
