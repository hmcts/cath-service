import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CrownFirmListData } from "../models/types.js";
import { renderCrownFirmListData } from "./renderer.js";

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

import { getLocationById } from "@hmcts/location";

const testCourtHouse = {
  CourtHouseName: "Test Court House",
  CourtHouseAddress: { Line: ["1 Test Street"], PostCode: "TE1 1ST" },
  CourtHouseTelephone: "01234567890"
};

const baseInput: CrownFirmListData = {
  FirmList: {
    DocumentID: { UniqueID: "CFPL-2025-001", DocumentType: "crown_firm_pdda_list" },
    ListHeader: {
      StartDate: "2025-11-12",
      PublishedTime: "2025-11-12T09:00:00",
      Version: "1.0"
    },
    CrownCourt: {
      CourtHouseName: "Crown Court at Manchester",
      CourtHouseTelephone: "0161 954 1800",
      CourtHouseAddress: {
        Line: ["Crown Square"],
        PostCode: "M3 3FL"
      }
    },
    CourtLists: []
  }
};

describe("renderCrownFirmListData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("should render header with location name from CrownCourt", async () => {
    const result = await renderCrownFirmListData(baseInput, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    expect(result.header.locationName).toBe("Crown Court at Manchester");
    expect(result.header.addressLines).toEqual(["Crown Square", "M3 3FL"]);
    expect(result.header.contentDate).toBe("12 November 2025");
  });

  it("should format date range when EndDate is present", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        ListHeader: { ...baseInput.FirmList.ListHeader, StartDate: "2025-09-10", EndDate: "2025-09-11" }
      }
    };

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-09-10"),
      locale: "en"
    });

    expect(result.header.contentDate).toBe("10 September 2025 to 11 September 2025");
  });

  it("should group sittings by SittingDate into groupedListData with courtHouseInfo", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        CourtLists: [
          {
            SittingDate: "2025-04-22",
            CourtHouse: testCourtHouse,
            Sittings: [
              {
                CourtRoomNumber: 3,
                SittingAt: "10:00:00",
                Judiciary: {
                  Judge: { CitizenNameTitle: "HHJ", CitizenNameForename: [], CitizenNameSurname: "Brown" }
                },
                Hearings: [
                  {
                    HearingDetails: { HearingDescription: "Sentence" },
                    CaseNumber: "M20250001",
                    Defendants: []
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    expect(result.groupedListData).toHaveLength(1);
    expect(result.groupedListData[0].day).toBe("Tuesday 22 April 2025");
    expect(result.groupedListData[0].courtHouseInfo.name).toBe("Test Court House");
    expect(result.groupedListData[0].courtHouseInfo.addressLines).toEqual(["1 Test Street", "TE1 1ST"]);
    expect(result.groupedListData[0].sittings).toHaveLength(1);
    expect(result.groupedListData[0].sittings[0].courtRoomName).toBe("3");
  });

  it("should format sitting time from SittingAt HH:MM:SS", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        CourtLists: [
          {
            SittingDate: "2025-04-22",
            CourtHouse: testCourtHouse,
            Sittings: [
              {
                CourtRoomNumber: 1,
                SittingAt: "09:30:00",
                Judiciary: { Judge: {} },
                Hearings: []
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    expect(result.groupedListData[0].sittings[0].time).toBe("9:30am");
  });

  it("should map TimeMarkingNote and ListNote to timeMarkingNote and listingNotes", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        CourtLists: [
          {
            SittingDate: "2025-04-22",
            CourtHouse: testCourtHouse,
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: { Judge: {} },
                Hearings: [
                  {
                    HearingDetails: { HearingDescription: "Trial" },
                    CaseNumber: "M20250010",
                    TimeMarkingNote: "10am",
                    ListNote: "After lunch",
                    Defendants: []
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    const caseItem = result.groupedListData[0].sittings[0].hearing[0].case[0];
    expect(caseItem.timeMarkingNote).toBe("10am");
    expect(caseItem.listingNotes).toBe("After lunch");
  });

  it("should format defendants from PersonalDetails", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        CourtLists: [
          {
            SittingDate: "2025-04-22",
            CourtHouse: testCourtHouse,
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: { Judge: {} },
                Hearings: [
                  {
                    HearingDetails: { HearingDescription: "Trial" },
                    CaseNumber: "M20250005",
                    Defendants: [
                      {
                        PersonalDetails: {
                          Name: { CitizenNameForename: ["Bob"], CitizenNameSurname: "Green" },
                          IsMasked: "no"
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

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    const caseItem = result.groupedListData[0].sittings[0].hearing[0].case[0];
    expect(caseItem.defendants).toBe("Bob Green");
  });

  it("should extract representative from Counsel Solicitor Party", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        CourtLists: [
          {
            SittingDate: "2025-04-22",
            CourtHouse: testCourtHouse,
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: { Judge: {} },
                Hearings: [
                  {
                    HearingDetails: { HearingDescription: "Sentence" },
                    CaseNumber: "M20250006",
                    Defendants: [
                      {
                        PersonalDetails: {
                          Name: { CitizenNameForename: ["Alice"], CitizenNameSurname: "Smith" },
                          IsMasked: "no"
                        },
                        Counsel: [
                          {
                            Solicitor: [
                              {
                                Party: {
                                  Organisation: { OrganisationName: "Smith & Co Solicitors" }
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
    };

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    const caseItem = result.groupedListData[0].sittings[0].hearing[0].case[0];
    expect(caseItem.representative).toBe("Smith & Co Solicitors");
  });

  it("should use Welsh locale for content date", async () => {
    const result = await renderCrownFirmListData(baseInput, {
      locationId: "101",
      contentDate: new Date("2025-01-15"),
      locale: "cy"
    });

    expect(result.header.contentDate).toContain("Tachwedd");
  });

  it("should use Welsh dateSeparator 'i' when locale is cy and EndDate is present", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        ListHeader: { ...baseInput.FirmList.ListHeader, StartDate: "2025-09-10", EndDate: "2025-09-11" }
      }
    };

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-09-10"),
      locale: "cy"
    });

    expect(result.header.contentDate).toContain(" i ");
  });

  it("should use location name from getLocationById when available", async () => {
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 101, name: "Manchester Crown Court", welshName: null });

    const result = await renderCrownFirmListData(baseInput, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    expect(result.header.locationName).toBe("Manchester Crown Court");
  });

  it("should use Welsh location name when locale is cy and welshName is available", async () => {
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 101, name: "Manchester Crown Court", welshName: "Llys y Goron Manceinion" });

    const result = await renderCrownFirmListData(baseInput, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "cy"
    });

    expect(result.header.locationName).toBe("Llys y Goron Manceinion");
  });

  it("should return empty lastUpdated when PublishedTime is absent", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        ListHeader: { StartDate: "2025-03-15", Version: "1.0" }
      }
    };

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    expect(result.header.lastUpdated).toBe("");
  });

  it("should handle court with no address", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        CrownCourt: { CourtHouseName: "No Address Court" }
      }
    };

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    expect(result.header.addressLines).toEqual([]);
  });

  it("should include judiciary with Justice array", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        CourtLists: [
          {
            SittingDate: "2025-04-22",
            CourtHouse: testCourtHouse,
            Sittings: [
              {
                CourtRoomNumber: 1,
                SittingAt: "10:00:00",
                Judiciary: {
                  Judge: { CitizenNameTitle: "HHJ", CitizenNameForename: [], CitizenNameSurname: "Brown" },
                  Justice: [{ CitizenNameTitle: "Mr", CitizenNameForename: ["John"], CitizenNameSurname: "Doe" }]
                },
                Hearings: []
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    expect(result.groupedListData[0].sittings[0].formattedJudiciaries).toContain("Brown");
    expect(result.groupedListData[0].sittings[0].formattedJudiciaries).toContain("John Doe");
  });

  it("should extract representative from Counsel Solicitor Person", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        CourtLists: [
          {
            SittingDate: "2025-04-22",
            CourtHouse: testCourtHouse,
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: { Judge: {} },
                Hearings: [
                  {
                    HearingDetails: { HearingDescription: "Sentence" },
                    CaseNumber: "M20250099",
                    Defendants: [
                      {
                        PersonalDetails: {
                          Name: { CitizenNameForename: ["Alice"], CitizenNameSurname: "Smith" },
                          IsMasked: "no"
                        },
                        Counsel: [
                          {
                            Solicitor: [
                              {
                                Party: {
                                  Person: {
                                    CitizenNameForename: ["Jane"],
                                    CitizenNameSurname: "Counsel"
                                  }
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
    };

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    const caseItem = result.groupedListData[0].sittings[0].hearing[0].case[0];
    expect(caseItem.representative).toContain("Jane Counsel");
  });

  it("should use HearingType when HearingDescription is absent", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        CourtLists: [
          {
            SittingDate: "2025-04-22",
            CourtHouse: testCourtHouse,
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: { Judge: {} },
                Hearings: [
                  {
                    HearingDetails: { HearingType: "PCM" },
                    CaseNumber: "M20250098",
                    Defendants: []
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    expect(result.groupedListData[0].sittings[0].hearing[0].displayHearingType).toBe("PCM");
  });

  it("should handle sitting at undefined time", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        CourtLists: [
          {
            SittingDate: "2025-04-22",
            CourtHouse: testCourtHouse,
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: { Judge: {} },
                Hearings: []
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    expect(result.groupedListData[0].sittings[0].time).toBe("");
  });

  it("should accumulate sittings from same day across court lists", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        CourtLists: [
          {
            SittingDate: "2025-04-22",
            CourtHouse: testCourtHouse,
            Sittings: [
              {
                CourtRoomNumber: 1,
                SittingAt: "09:00:00",
                Judiciary: { Judge: {} },
                Hearings: []
              }
            ]
          },
          {
            SittingDate: "2025-04-22",
            CourtHouse: testCourtHouse,
            Sittings: [
              {
                CourtRoomNumber: 2,
                SittingAt: "10:00:00",
                Judiciary: { Judge: {} },
                Hearings: []
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    expect(result.groupedListData).toHaveLength(1);
    expect(result.groupedListData[0].sittings).toHaveLength(2);
  });

  it("should use MaskedName when IsMasked is yes", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        CourtLists: [
          {
            SittingDate: "2025-04-22",
            CourtHouse: testCourtHouse,
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: { Judge: {} },
                Hearings: [
                  {
                    HearingDetails: { HearingDescription: "Plea" },
                    CaseNumber: "M20250007",
                    Defendants: [
                      {
                        PersonalDetails: {
                          Name: { CitizenNameForename: ["Real"], CitizenNameSurname: "Name" },
                          MaskedName: "Reporting Restriction Applied",
                          IsMasked: "yes"
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

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    const caseItem = result.groupedListData[0].sittings[0].hearing[0].case[0];
    expect(caseItem.defendants).toBe("Reporting Restriction Applied");
  });

  it("should return empty displayHearingType when both HearingDescription and HearingType are absent", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        CourtLists: [
          {
            SittingDate: "2025-04-22",
            CourtHouse: testCourtHouse,
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: { Judge: {} },
                Hearings: [
                  {
                    HearingDetails: {},
                    CaseNumber: "M20250097",
                    Defendants: []
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    expect(result.groupedListData[0].sittings[0].hearing[0].displayHearingType).toBe("");
  });

  it("should skip representative when solicitor has no Party Organisation or Person", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        CourtLists: [
          {
            SittingDate: "2025-04-22",
            CourtHouse: testCourtHouse,
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: { Judge: {} },
                Hearings: [
                  {
                    HearingDetails: { HearingDescription: "Plea" },
                    CaseNumber: "M20250096",
                    Defendants: [
                      {
                        PersonalDetails: {
                          Name: { CitizenNameForename: ["A"], CitizenNameSurname: "B" },
                          IsMasked: "no"
                        },
                        Counsel: [
                          {
                            Solicitor: [
                              {
                                Party: {}
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
    };

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    const caseItem = result.groupedListData[0].sittings[0].hearing[0].case[0];
    expect(caseItem.representative).toBe("");
  });

  it("should skip representative when solicitor Person has no name parts", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        CourtLists: [
          {
            SittingDate: "2025-04-22",
            CourtHouse: testCourtHouse,
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: { Judge: {} },
                Hearings: [
                  {
                    HearingDetails: { HearingDescription: "Plea" },
                    CaseNumber: "M20250095",
                    Defendants: [
                      {
                        PersonalDetails: {
                          Name: { CitizenNameForename: ["A"], CitizenNameSurname: "B" },
                          IsMasked: "no"
                        },
                        Counsel: [
                          {
                            Solicitor: [
                              {
                                Party: {
                                  Person: {}
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
    };

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    const caseItem = result.groupedListData[0].sittings[0].hearing[0].case[0];
    expect(caseItem.representative).toBe("");
  });

  it("should use CitizenNameRequestedName for judge when present", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        CourtLists: [
          {
            SittingDate: "2025-04-22",
            CourtHouse: testCourtHouse,
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: {
                  Judge: {
                    CitizenNameTitle: "Mr",
                    CitizenNameForename: ["TestForename"],
                    CitizenNameSurname: "TestSurname",
                    CitizenNameRequestedName: "TestRequestedName"
                  }
                },
                Hearings: [
                  {
                    HearingDetails: { HearingDescription: "Trial" },
                    CaseNumber: "M20250008",
                    Defendants: []
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    expect(result.groupedListData[0].sittings[0].formattedJudiciaries).toBe("Mr TestRequestedName");
  });

  it("should use CitizenNameRequestedName for defendant when present", async () => {
    const input: CrownFirmListData = {
      ...baseInput,
      FirmList: {
        ...baseInput.FirmList,
        CourtLists: [
          {
            SittingDate: "2025-04-22",
            CourtHouse: testCourtHouse,
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: { Judge: {} },
                Hearings: [
                  {
                    HearingDetails: { HearingDescription: "Trial" },
                    CaseNumber: "M20250009",
                    Defendants: [
                      {
                        PersonalDetails: {
                          Name: {
                            CitizenNameTitle: "Ms",
                            CitizenNameForename: ["RealForename"],
                            CitizenNameSurname: "RealSurname",
                            CitizenNameRequestedName: "RequestedName"
                          },
                          IsMasked: "no"
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

    const result = await renderCrownFirmListData(input, {
      locationId: "101",
      contentDate: new Date("2025-03-15"),
      locale: "en"
    });

    const caseItem = result.groupedListData[0].sittings[0].hearing[0].case[0];
    expect(caseItem.defendants).toBe("Ms RequestedName");
  });
});
