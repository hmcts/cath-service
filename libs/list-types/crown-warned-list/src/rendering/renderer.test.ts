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

  it("should set weekCommencing from contentDate option", async () => {
    const result = await renderCrownWarnedListData(baseInput, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    expect(result.header.weekCommencing).toBe("10 November 2025");
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
                              IsMasked: "no" as const
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
                              IsMasked: "no" as const,
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
                              IsMasked: "no" as const,
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
                              IsMasked: "no" as const,
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
                              IsMasked: "yes" as const
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
});
