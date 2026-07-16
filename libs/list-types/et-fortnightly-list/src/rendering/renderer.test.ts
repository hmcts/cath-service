import { getLocationWithDetails } from "@hmcts/location";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CauseListData } from "../models/types.js";
import { renderEtFortnightlyList } from "./renderer.js";

vi.mock("@hmcts/location", () => ({
  getLocationWithDetails: vi.fn()
}));

const baseJsonData: CauseListData = {
  document: { publicationDate: "2025-01-13T09:30:00.000Z" },
  venue: {
    venueName: "Leeds Employment Tribunal",
    venueAddress: { line: ["The Court House"], town: "Leeds", county: "West Yorkshire", postCode: "LS1 2ES" },
    venueContact: { venueTelephone: "0113 245 9741", venueEmail: "leedset@justice.gov.uk" }
  },
  courtLists: [
    {
      courtHouse: {
        courtHouseName: "Leeds",
        courtHouseAddress: { line: ["1 Court Street"], town: "Leeds", county: "West Yorkshire", postCode: "LS1 2ES" },
        courtRoom: [
          {
            courtRoomName: "Court 1",
            session: [
              {
                sessionChannel: ["VIDEO HEARING"],
                sittings: [
                  {
                    sittingStart: "2025-01-13T09:00:00.000Z",
                    sittingEnd: "2025-01-13T10:30:00.000Z",
                    hearing: [
                      {
                        hearingType: "Preliminary Hearing",
                        case: [
                          {
                            caseName: "",
                            caseNumber: "1234567/2025",
                            caseSequenceIndicator: "1 of 2",
                            party: [
                              {
                                partyRole: "APPLICANT_PETITIONER",
                                individualDetails: { title: "Mr", individualForenames: "John", individualSurname: "Smith" }
                              },
                              {
                                partyRole: "APPLICANT_PETITIONER_REPRESENTATIVE",
                                individualDetails: { title: "Ms", individualForenames: "Anne", individualSurname: "Jones" }
                              },
                              {
                                partyRole: "RESPONDENT",
                                organisationDetails: { organisationName: "Acme Ltd" }
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    // Second sitting on a DIFFERENT day for the same courthouse
                    sittingStart: "2025-01-14T14:00:00.000Z",
                    sittingEnd: "2025-01-14T14:30:00.000Z",
                    hearing: [
                      {
                        hearingType: "Final Hearing",
                        case: [
                          {
                            caseName: "",
                            caseNumber: "7654321/2025",
                            party: [
                              {
                                partyRole: "RESPONDENT",
                                individualDetails: { title: "Mrs", individualForenames: "Beth", individualSurname: "Brown" }
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

const mockLocation = {
  locationId: 1,
  name: "Leeds Employment Tribunal",
  welshName: "",
  regions: [{ name: "Midlands", welshName: "Canolbarth Lloegr" }],
  subJurisdictions: []
};

describe("renderEtFortnightlyList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLocationWithDetails).mockResolvedValue(mockLocation);
  });

  it("should use the region name in the header", async () => {
    // Act
    const result = await renderEtFortnightlyList(structuredClone(baseJsonData), { locationId: "1", contentDate: new Date("2025-01-13"), locale: "en" });

    // Assert
    expect(result.header.regionName).toBe("Midlands");
  });

  it("should use the Welsh region name when locale is cy", async () => {
    // Act
    const result = await renderEtFortnightlyList(structuredClone(baseJsonData), { locationId: "1", contentDate: new Date("2025-01-13"), locale: "cy" });

    // Assert
    expect(result.header.regionName).toBe("Canolbarth Lloegr");
  });

  it("should group sittings by courthouse then by day", async () => {
    // Act
    const result = await renderEtFortnightlyList(structuredClone(baseJsonData), { locationId: "1", contentDate: new Date("2025-01-13"), locale: "en" });

    // Assert
    expect(result.courts).toHaveLength(1);
    expect(result.courts[0].courtName).toBe("Leeds");
    expect(result.courts[0].days).toHaveLength(2);
    expect(result.courts[0].days[0].sittingDate).toBe("Monday 13 January 2025");
    expect(result.courts[0].days[1].sittingDate).toBe("Tuesday 14 January 2025");
  });

  it("should build the courthouse address lines", async () => {
    // Act
    const result = await renderEtFortnightlyList(structuredClone(baseJsonData), { locationId: "1", contentDate: new Date("2025-01-13"), locale: "en" });

    // Assert
    expect(result.courts[0].addressLines).toEqual(["1 Court Street", "Leeds", "West Yorkshire", "LS1 2ES"]);
  });

  it("should initialise applicant, respondent and representative names", async () => {
    // Act
    const result = await renderEtFortnightlyList(structuredClone(baseJsonData), { locationId: "1", contentDate: new Date("2025-01-13"), locale: "en" });
    const row = result.courts[0].days[0].rows[0];

    // Assert
    expect(row.applicant).toBe("Mr J. Smith");
    expect(row.applicantRepresentative).toBe("Ms A. Jones");
    expect(row.respondent).toBe("Acme Ltd");
    expect(row.respondentRepresentative).toBe("");
  });

  it("should compute the sitting time, duration, case sequence indicator and hearing platform", async () => {
    // Act
    const result = await renderEtFortnightlyList(structuredClone(baseJsonData), { locationId: "1", contentDate: new Date("2025-01-13"), locale: "en" });
    const row = result.courts[0].days[0].rows[0];

    // Assert
    expect(row.sittingTime).toBe("9am");
    expect(row.durationAsHours).toBe(1);
    expect(row.durationAsMinutes).toBe(30);
    expect(row.caseSequenceIndicator).toBe("1 of 2");
    expect(row.hearingPlatform).toBe("VIDEO HEARING");
  });

  it("should fall back to an empty region name when the location has no regions", async () => {
    // Arrange
    vi.mocked(getLocationWithDetails).mockResolvedValue({ ...mockLocation, regions: [] });

    // Act
    const result = await renderEtFortnightlyList(structuredClone(baseJsonData), { locationId: "1", contentDate: new Date("2025-01-13"), locale: "en" });

    // Assert
    expect(result.header.regionName).toBe("");
  });
});
