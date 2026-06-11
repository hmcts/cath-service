import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderCrownWarnedListData } from "./renderer.js";

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

import { getLocationById } from "@hmcts/location";

const baseInput = {
  document: {
    publicationDate: "2025-11-12T09:00:00.000Z",
    weekCommencing: "2025-11-10T00:00:00.000Z"
  },
  venue: {
    venueName: "Crown Court at Birmingham",
    venueAddress: { line: ["Newton Street"], town: "Birmingham", postCode: "B4 7NA" },
    venueContact: { venueTelephone: "0121 681 3400", venueEmail: "birminghamcc@justice.gov.uk" }
  },
  courtLists: []
};

describe("renderCrownWarnedListData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("should render header with correct location name and dates", async () => {
    const result = await renderCrownWarnedListData(baseInput, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    expect(result.header.locationName).toBe("Crown Court at Birmingham");
    expect(result.header.contentDate).toBe("10 November 2025");
    expect(result.header.weekCommencing).toBeTruthy();
  });

  it("should group cases by hearing category", async () => {
    const input = {
      ...baseInput,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Birmingham",
            courtRoom: [
              {
                courtRoomName: "Court 2",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        hearing: [
                          {
                            hearingDescription: "For Trial",
                            case: [
                              {
                                caseNumber: "B20250001",
                                prosecutingAuthority: "CPS",
                                party: [
                                  {
                                    partyRole: "DEFENDANT",
                                    individualDetails: { individualForenames: "Alice", individualSurname: "Williams" }
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            hearingDescription: "For Plea",
                            case: [
                              {
                                caseNumber: "B20250002",
                                prosecutingAuthority: "CPS",
                                party: []
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
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    expect(result.groupedCategories).toHaveLength(2);
    const trialGroup = result.groupedCategories.find((g) => g.category === "For Trial");
    const pleaGroup = result.groupedCategories.find((g) => g.category === "For Plea");

    expect(trialGroup?.cases).toHaveLength(1);
    expect(trialGroup?.cases[0].caseNumber).toBe("B20250001");
    expect(trialGroup?.cases[0].defendants).toBe("Alice Williams");
    expect(pleaGroup?.cases).toHaveLength(1);
  });

  it("should mark defendant in custody with isInCustody flag", async () => {
    const input = {
      ...baseInput,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Birmingham",
            courtRoom: [
              {
                courtRoomName: "Court 2",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        hearing: [
                          {
                            hearingDescription: "For Sentence",
                            case: [
                              {
                                caseNumber: "B20250010",
                                party: [
                                  {
                                    partyRole: "DEFENDANT_IN_CUSTODY",
                                    individualDetails: { individualForenames: "Tom", individualSurname: "Hardy" }
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
            ]
          }
        }
      ]
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    const sentenceGroup = result.groupedCategories.find((g) => g.category === "For Sentence");
    expect(sentenceGroup?.cases[0].isInCustody).toBe(true);
    expect(sentenceGroup?.cases[0].defendants).toBe("Tom Hardy");
  });

  it("should include linked cases as comma-separated string", async () => {
    const input = {
      ...baseInput,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Birmingham",
            courtRoom: [
              {
                courtRoomName: "Court 2",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        hearing: [
                          {
                            hearingDescription: "For Appeal",
                            case: [
                              {
                                caseNumber: "B20250020",
                                linkedCases: [{ caseReference: "B20240001" }, { caseReference: "B20240002" }],
                                party: []
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
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    const appealGroup = result.groupedCategories.find((g) => g.category === "For Appeal");
    expect(appealGroup?.cases[0].linkedCases).toBe("B20240001, B20240002");
  });

  it("should allocate unknown hearing descriptions to To be allocated", async () => {
    const input = {
      ...baseInput,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Birmingham",
            courtRoom: [
              {
                courtRoomName: "Court 2",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        hearing: [
                          {
                            hearingDescription: "Something else",
                            case: [{ caseNumber: "B20250099", party: [] }]
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
    };

    const result = await renderCrownWarnedListData(input, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    const unallocatedGroup = result.groupedCategories.find((g) => g.category === "To be allocated");
    expect(unallocatedGroup?.cases).toHaveLength(1);
  });

  it("should return empty groupedCategories when no court lists", async () => {
    const result = await renderCrownWarnedListData(baseInput, {
      locationId: "102",
      contentDate: new Date("2025-11-10"),
      locale: "en"
    });

    expect(result.groupedCategories).toHaveLength(0);
  });
});
