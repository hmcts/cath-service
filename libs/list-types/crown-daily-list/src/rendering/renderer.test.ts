import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderCrownDailyListData } from "./renderer.js";

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

import { getLocationById } from "@hmcts/location";

const baseInput = {
  document: { publicationDate: "2025-11-12T09:00:00.000Z" },
  venue: {
    venueName: "Crown Court at Leeds",
    venueAddress: { line: ["1 Oxford Row"], town: "Leeds", county: "West Yorkshire", postCode: "LS1 3BG" },
    venueContact: { venueTelephone: "0113 306 2500", venueEmail: "leedscc@justice.gov.uk" }
  },
  courtLists: []
};

describe("renderCrownDailyListData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("should render header with location name from venue when no DB location", async () => {
    const result = await renderCrownDailyListData(baseInput, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    expect(result.header.locationName).toBe("Crown Court at Leeds");
    expect(result.header.addressLines).toEqual(["1 Oxford Row", "Leeds", "West Yorkshire", "LS1 3BG"]);
    expect(result.header.contentDate).toBe("01 January 2025");
    expect(result.header.lastUpdated).toBe("12 November 2025 at 9am");
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

  it("should render open justice contact details", async () => {
    const result = await renderCrownDailyListData(baseInput, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    expect(result.openJustice.venueName).toBe("Crown Court at Leeds");
    expect(result.openJustice.email).toBe("leedscc@justice.gov.uk");
    expect(result.openJustice.phone).toBe("0113 306 2500");
  });

  it("should format sitting time and extract defendant names", async () => {
    const inputWithCases = {
      ...baseInput,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Leeds",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    judiciary: [{ johKnownAs: "HHJ Smith", isPresiding: true }],
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        hearing: [
                          {
                            hearingDescription: "Trial",
                            case: [
                              {
                                caseNumber: "T20250001",
                                prosecutingAuthority: "CPS",
                                party: [
                                  {
                                    partyRole: "DEFENDANT",
                                    individualDetails: {
                                      individualForenames: "John",
                                      individualSurname: "Smith"
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
            ]
          }
        }
      ]
    };

    const result = await renderCrownDailyListData(inputWithCases, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0];
    expect(session.formattedJudiciaries).toBe("HHJ Smith");

    const sitting = session.sittings[0];
    expect(sitting.time).toBe("10am");

    const hearing = sitting.hearing[0];
    expect(hearing.displayHearingType).toBe("Trial");

    const caseItem = hearing.case[0];
    expect(caseItem.defendants).toBe("John Smith");
  });

  it("should handle multiple defendants", async () => {
    const inputWithMultipleDefendants = {
      ...baseInput,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Leeds",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        hearing: [
                          {
                            case: [
                              {
                                caseNumber: "T20250002",
                                party: [
                                  {
                                    partyRole: "DEFENDANT",
                                    individualDetails: { individualForenames: "Alice", individualSurname: "Jones" }
                                  },
                                  {
                                    partyRole: "DEFENDANT",
                                    individualDetails: { individualForenames: "Bob", individualSurname: "Brown" }
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

    const result = await renderCrownDailyListData(inputWithMultipleDefendants, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect(caseItem.defendants).toBe("Alice Jones, Bob Brown");
  });

  it("should format afternoon time correctly", async () => {
    const input = {
      ...baseInput,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Leeds",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-11-12T14:30:00.000Z",
                        hearing: [{ case: [{ caseNumber: "T001" }] }]
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

    const result = await renderCrownDailyListData(input, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0];
    expect(sitting.time).toBe("2:30pm");
  });

  it("should handle Welsh locale for content date", async () => {
    const result = await renderCrownDailyListData(baseInput, {
      locationId: "100",
      contentDate: new Date("2025-01-01"),
      locale: "cy"
    });

    expect(result.header.contentDate).toContain("Ionawr");
  });
});
