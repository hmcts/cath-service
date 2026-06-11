import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderCrownFirmListData } from "./renderer.js";

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

import { getLocationById } from "@hmcts/location";

const baseInput = {
  document: { publicationDate: "2025-11-12T09:00:00.000Z" },
  venue: {
    venueName: "Crown Court at Manchester",
    venueAddress: { line: ["Crown Square"], town: "Manchester", postCode: "M3 3FL" },
    venueContact: { venueTelephone: "0161 954 1800", venueEmail: "manchestercc@justice.gov.uk" }
  },
  courtLists: []
};

describe("renderCrownFirmListData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("should render header correctly", async () => {
    const result = await renderCrownFirmListData(baseInput, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    expect(result.header.locationName).toBe("Crown Court at Manchester");
    expect(result.header.addressLines).toEqual(["Crown Square", "Manchester", "M3 3FL"]);
    expect(result.header.contentDate).toBe("15 March 2025");
  });

  it("should add sittingDay and time to each sitting", async () => {
    const input = {
      ...baseInput,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Manchester",
            courtRoom: [
              {
                courtRoomName: "Court 3",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-11-12T09:30:00.000Z",
                        hearing: [{ case: [{ caseNumber: "M001" }] }]
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

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0];
    expect(sitting.time).toBe("9:30am");
    expect(sitting.sittingDay).toBeTruthy();
  });

  it("should process defendant and representative from parties", async () => {
    const input = {
      ...baseInput,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Manchester",
            courtRoom: [
              {
                courtRoomName: "Court 3",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        hearing: [
                          {
                            hearingDescription: "Sentence",
                            case: [
                              {
                                caseNumber: "M20250005",
                                party: [
                                  {
                                    partyRole: "DEFENDANT",
                                    individualDetails: { individualForenames: "Bob", individualSurname: "Green" }
                                  },
                                  {
                                    partyRole: "DEFENDANT_REPRESENTATIVE",
                                    organisationDetails: { organisationName: "Smith & Co Solicitors" }
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

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect(caseItem.defendants).toBe("Bob Green");
    expect(caseItem.representative).toBe("Smith & Co Solicitors");
  });

  it("should build groupedListData grouped by day", async () => {
    const input = {
      ...baseInput,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Manchester",
            courtRoom: [
              {
                courtRoomName: "Court 3",
                session: [
                  {
                    judiciary: [{ johKnownAs: "HHJ Brown", isPresiding: true }],
                    sittings: [
                      {
                        sittingStart: "2025-11-12T10:00:00.000Z",
                        hearing: [{ case: [{ caseNumber: "M001" }] }]
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

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    expect(result.groupedListData).toHaveLength(1);
    expect(result.groupedListData[0].day).toBeTruthy();
    expect(result.groupedListData[0].sittings).toHaveLength(1);
    expect(result.groupedListData[0].sittings[0].courtRoomName).toBe("Court 3");
    expect(result.groupedListData[0].sittings[0].formattedJudiciaries).toBe("HHJ Brown");
  });

  it("should handle Welsh locale for content date", async () => {
    const result = await renderCrownFirmListData(baseInput, {
      locationId: "101",
      contentDate: new Date("2025-01-15"),
      locale: "cy"
    });

    expect(result.header.contentDate).toContain("Ionawr");
  });
});
