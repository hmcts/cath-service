import { getLocationWithDetails } from "@hmcts/location";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CauseListData } from "../models/types.js";
import { renderEtDailyList } from "./renderer.js";

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
                            party: [
                              {
                                partyRole: "APPLICANT_PETITIONER",
                                individualDetails: { title: "Mr", individualForenames: "John", individualSurname: "Smith" }
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

describe("renderEtDailyList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use the region name in the header, not the location name", async () => {
    // Arrange
    vi.mocked(getLocationWithDetails).mockResolvedValue({
      locationId: 1,
      name: "Leeds Employment Tribunal",
      welshName: "",
      regions: [{ name: "North East", welshName: "Gogledd Ddwyrain" }],
      subJurisdictions: []
    });

    // Act
    const result = await renderEtDailyList(structuredClone(baseJsonData), { locationId: "1", contentDate: new Date("2025-01-13"), locale: "en" });

    // Assert
    expect(result.header.regionName).toBe("North East");
  });

  it("should use the Welsh region name when locale is cy", async () => {
    // Arrange
    vi.mocked(getLocationWithDetails).mockResolvedValue({
      locationId: 1,
      name: "Leeds Employment Tribunal",
      welshName: "",
      regions: [{ name: "North East", welshName: "Gogledd Ddwyrain" }],
      subJurisdictions: []
    });

    // Act
    const result = await renderEtDailyList(structuredClone(baseJsonData), { locationId: "1", contentDate: new Date("2025-01-13"), locale: "cy" });

    // Assert
    expect(result.header.regionName).toBe("Gogledd Ddwyrain");
  });

  it("should format applicant individual names as initials and respondent organisation as its name", async () => {
    // Arrange
    vi.mocked(getLocationWithDetails).mockResolvedValue({
      locationId: 1,
      name: "Leeds",
      welshName: "",
      regions: [{ name: "North East", welshName: "" }],
      subJurisdictions: []
    });

    // Act
    const result = await renderEtDailyList(structuredClone(baseJsonData), { locationId: "1", contentDate: new Date("2025-01-13"), locale: "en" });
    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0] as any;

    // Assert
    expect(caseItem.applicant).toBe("Mr J. Smith");
    expect(caseItem.respondent).toBe("Acme Ltd");
  });

  it("should compute the sitting time, duration and hearing channel", async () => {
    // Arrange
    vi.mocked(getLocationWithDetails).mockResolvedValue({
      locationId: 1,
      name: "Leeds",
      welshName: "",
      regions: [{ name: "North East", welshName: "" }],
      subJurisdictions: []
    });

    // Act
    const result = await renderEtDailyList(structuredClone(baseJsonData), { locationId: "1", contentDate: new Date("2025-01-13"), locale: "en" });
    const sitting = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0] as any;

    // Assert
    expect(sitting.time).toBe("9am");
    expect(sitting.durationAsHours).toBe(1);
    expect(sitting.durationAsMinutes).toBe(30);
    expect(sitting.caseHearingChannel).toBe("VIDEO HEARING");
  });

  it("should fall back to an empty region name when the location has no regions", async () => {
    // Arrange
    vi.mocked(getLocationWithDetails).mockResolvedValue({
      locationId: 1,
      name: "Leeds",
      welshName: "",
      regions: [],
      subJurisdictions: []
    });

    // Act
    const result = await renderEtDailyList(structuredClone(baseJsonData), { locationId: "1", contentDate: new Date("2025-01-13"), locale: "en" });

    // Assert
    expect(result.header.regionName).toBe("");
  });
});
