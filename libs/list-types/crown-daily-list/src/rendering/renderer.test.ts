import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderCrownDailyListData } from "./renderer.js";

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

import { getLocationById } from "@hmcts/location";

const baseInput = {
  DailyList: {
    DocumentID: { UniqueID: "CDPL-2025-001", DocumentType: "crown_daily_pdda_list" },
    ListHeader: {
      StartDate: "2025-11-12",
      PublishedTime: "2025-11-12T09:00:00",
      Version: "1.0"
    },
    CrownCourt: {
      CourtHouseName: "Crown Court at Leeds",
      CourtHouseTelephone: "0113 306 2500",
      CourtHouseAddress: {
        Line: ["1 Oxford Row"],
        PostCode: "LS1 3BG"
      }
    },
    CourtLists: []
  }
};

describe("renderCrownDailyListData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("should render header with location name from CrownCourt when no DB location", async () => {
    const result = await renderCrownDailyListData(baseInput, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    expect(result.header.locationName).toBe("Crown Court at Leeds");
    expect(result.header.addressLines).toEqual(["1 Oxford Row", "LS1 3BG"]);
    expect(result.header.contentDate).toBe("12 November 2025");
  });

  it("should use Welsh location name when locale is cy and welshName is present", async () => {
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: "Crown Court at Leeds",
      welshName: "Llys y Goron yn Leeds"
    });

    const result = await renderCrownDailyListData(baseInput, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "cy"
    });

    expect(result.header.locationName).toBe("Llys y Goron yn Leeds");
  });

  it("should render open justice contact details from CrownCourt.CourtHouseAddress", async () => {
    const result = await renderCrownDailyListData(baseInput, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    expect(result.openJustice.venueName).toBe("Crown Court at Leeds");
    expect(result.openJustice.email).toBe("");
    expect(result.openJustice.phone).toBe("0113 306 2500");
  });

  it("should group sittings by CourtRoomNumber into courtRoom", async () => {
    const input = {
      ...baseInput,
      DailyList: {
        ...baseInput.DailyList,
        CourtLists: [
          {
            Sittings: [
              {
                CourtRoomNumber: 1,
                SittingAt: "10:00:00",
                Judiciary: { Judge: { CitizenNameForename: ["HHJ"], CitizenNameSurname: "Smith" } },
                Hearings: []
              },
              {
                CourtRoomNumber: 2,
                SittingAt: "11:00:00",
                Judiciary: { Judge: { CitizenNameForename: ["HHJ"], CitizenNameSurname: "Jones" } },
                Hearings: []
              },
              {
                CourtRoomNumber: 1,
                SittingAt: "14:00:00",
                Judiciary: { Judge: { CitizenNameForename: ["HHJ"], CitizenNameSurname: "Smith" } },
                Hearings: []
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownDailyListData(input, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const courtRooms = result.listData.courtLists[0].courtHouse.courtRoom;
    expect(courtRooms).toHaveLength(2);
    expect(courtRooms[0].courtRoomName).toBe("1");
    expect(courtRooms[0].session).toHaveLength(2);
    expect(courtRooms[1].courtRoomName).toBe("2");
    expect(courtRooms[1].session).toHaveLength(1);
  });

  it("should format sitting time from SittingAt HH:MM:SS", async () => {
    const input = {
      ...baseInput,
      DailyList: {
        ...baseInput.DailyList,
        CourtLists: [
          {
            Sittings: [
              {
                CourtRoomNumber: 1,
                SittingAt: "10:00:00",
                Judiciary: {
                  Judge: { CitizenNameForename: ["John"], CitizenNameSurname: "Smith" }
                },
                Hearings: [
                  {
                    HearingDetails: { HearingDescription: "Trial" },
                    CaseNumber: "T20250001",
                    Defendants: [
                      {
                        PersonalDetails: {
                          Name: { CitizenNameForename: ["Jane"], CitizenNameSurname: "Doe" },
                          IsMasked: "no" as const
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
    };

    const result = await renderCrownDailyListData(input, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0];
    expect(session.sittings[0].time).toBe("10am");
  });

  it("should format afternoon sitting time with minutes from SittingAt", async () => {
    const input = {
      ...baseInput,
      DailyList: {
        ...baseInput.DailyList,
        CourtLists: [
          {
            Sittings: [
              {
                CourtRoomNumber: 1,
                SittingAt: "14:30:00",
                Judiciary: { Judge: {} },
                Hearings: []
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownDailyListData(input, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    expect(result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].time).toBe("2:30pm");
  });

  it("should extract defendant names from Defendants[].PersonalDetails", async () => {
    const input = {
      ...baseInput,
      DailyList: {
        ...baseInput.DailyList,
        CourtLists: [
          {
            Sittings: [
              {
                CourtRoomNumber: 1,
                SittingAt: "10:00:00",
                Judiciary: { Judge: { CitizenNameForename: ["HHJ"], CitizenNameSurname: "Smith" } },
                Hearings: [
                  {
                    HearingDetails: { HearingDescription: "Trial" },
                    CaseNumber: "T20250001",
                    Prosecution: { ProsecutingAuthority: "CPS" },
                    Defendants: [
                      {
                        PersonalDetails: {
                          Name: { CitizenNameForename: ["John"], CitizenNameSurname: "Smith" },
                          IsMasked: "no" as const
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
    };

    const result = await renderCrownDailyListData(input, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect(caseItem.defendants).toBe("John Smith");
    expect(caseItem.prosecutingAuthority).toBe("CPS");
    expect(caseItem.caseNumber).toBe("T20250001");
  });

  it("should use MaskedName when IsMasked is yes", async () => {
    const input = {
      ...baseInput,
      DailyList: {
        ...baseInput.DailyList,
        CourtLists: [
          {
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: { Judge: {} },
                Hearings: [
                  {
                    HearingDetails: {},
                    CaseNumber: "T20250002",
                    Defendants: [
                      {
                        PersonalDetails: {
                          Name: { CitizenNameForename: ["John"], CitizenNameSurname: "Smith" },
                          MaskedName: "Defendant A",
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
    };

    const result = await renderCrownDailyListData(input, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect(caseItem.defendants).toBe("Defendant A");
  });

  it("should format judiciary names from Judge and Justice[]", async () => {
    const input = {
      ...baseInput,
      DailyList: {
        ...baseInput.DailyList,
        CourtLists: [
          {
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: {
                  Judge: {
                    CitizenNameTitle: "HHJ",
                    CitizenNameForename: ["James"],
                    CitizenNameSurname: "Smith"
                  },
                  Justice: [
                    { CitizenNameForename: ["Alice"], CitizenNameSurname: "Jones" },
                    { CitizenNameForename: ["Bob"], CitizenNameSurname: "Brown" }
                  ]
                },
                Hearings: []
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownDailyListData(input, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0];
    expect(session.formattedJudiciaries).toBe("HHJ James Smith, Alice Jones, Bob Brown");
  });

  it("should use Welsh locale for content date", async () => {
    const result = await renderCrownDailyListData(baseInput, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "cy"
    });

    expect(result.header.contentDate).toContain("Tachwedd");
  });

  it("should include version in header from ListHeader.Version", async () => {
    const result = await renderCrownDailyListData(baseInput, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    expect(result.header.version).toBe("1.0");
  });

  it("should use CitizenNameRequestedName as primary name when present", async () => {
    const input = {
      ...baseInput,
      DailyList: {
        ...baseInput.DailyList,
        CourtLists: [
          {
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: {
                  Judge: {
                    CitizenNameTitle: "HHJ",
                    CitizenNameForename: ["James"],
                    CitizenNameSurname: "Smith",
                    CitizenNameRequestedName: "JudgeRequested"
                  }
                },
                Hearings: []
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownDailyListData(input, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0];
    expect(session.formattedJudiciaries).toBe("HHJ JudgeRequested");
  });

  it("should append CitizenNameSuffix when present", async () => {
    const input = {
      ...baseInput,
      DailyList: {
        ...baseInput.DailyList,
        CourtLists: [
          {
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: {
                  Judge: {},
                  Justice: [
                    {
                      CitizenNameTitle: "Ms",
                      CitizenNameForename: ["Alice"],
                      CitizenNameSurname: "Jones",
                      CitizenNameSuffix: "Sr"
                    }
                  ]
                },
                Hearings: []
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownDailyListData(input, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0];
    expect(session.formattedJudiciaries).toBe("Ms Alice Jones Sr");
  });

  it("should include timeMarkingNote in rendered case", async () => {
    const input = {
      ...baseInput,
      DailyList: {
        ...baseInput.DailyList,
        CourtLists: [
          {
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: { Judge: {} },
                Hearings: [
                  {
                    HearingDetails: { HearingDescription: "Trial" },
                    CaseNumber: "T20250001",
                    TimeMarkingNote: "10:00 FIXED",
                    Defendants: []
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownDailyListData(input, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect(caseItem.timeMarkingNote).toBe("10:00 FIXED");
  });

  it("should set hasListingNotes true when a hearing has ListNote", async () => {
    const input = {
      ...baseInput,
      DailyList: {
        ...baseInput.DailyList,
        CourtLists: [
          {
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: { Judge: {} },
                Hearings: [
                  {
                    HearingDetails: {},
                    CaseNumber: "T20250001",
                    ListNote: "Custody time limit expires",
                    Defendants: []
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownDailyListData(input, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0];
    expect(session.hasListingNotes).toBe(true);
  });

  it("should set hasListingNotes false when no hearings have ListNote", async () => {
    const result = await renderCrownDailyListData(baseInput, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const session = result.listData.courtLists[0]?.courtHouse.courtRoom[0]?.session[0];
    expect(session?.hasListingNotes ?? false).toBe(false);
  });

  it("should include courtHouseAddressLines and courtHousePhone from CourtHouse", async () => {
    const input = {
      ...baseInput,
      DailyList: {
        ...baseInput.DailyList,
        CourtLists: [
          {
            CourtHouse: {
              CourtHouseName: "Crown Court at Leeds",
              CourtHouseAddress: { Line: ["1 Oxford Row"], PostCode: "LS1 3BG" },
              CourtHouseTelephone: "0113 306 2500"
            },
            Sittings: []
          }
        ]
      }
    };

    const result = await renderCrownDailyListData(input as any, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const courtHouse = result.listData.courtLists[0].courtHouse;
    expect(courtHouse.courtHouseAddressLines).toEqual(["1 Oxford Row", "LS1 3BG"]);
    expect(courtHouse.courtHousePhone).toBe("0113 306 2500");
  });
});
