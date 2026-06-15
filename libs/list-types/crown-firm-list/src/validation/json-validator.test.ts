import { describe, expect, it } from "vitest";
import { validateCrownFirmList } from "./json-validator.js";

describe("validateCrownFirmList", () => {
  it("should validate a correct crown firm list", () => {
    const validData = {
      FirmList: {
        DocumentID: "CFPL-2025-001",
        ListHeader: {
          ListDate: "2025-11-12",
          LastPublicationDate: "2025-11-12",
          PublishedTime: "09:00:00"
        },
        CrownCourt: {
          CourtHouseName: "Crown Court at Manchester",
          CourtHouseAddress: {
            CourtHouseAddressLine: ["Crown Square"],
            CourtHouseAddressTown: "Manchester",
            CourtHouseAddressPostCode: "M3 3FL"
          }
        },
        CourtLists: [
          {
            SittingDate: "2025-11-12",
            Sittings: [
              {
                CourtRoomNumber: "Court 3",
                Judiciary: {
                  Judge: { CitizenNameSurname: "Brown" }
                },
                Hearings: [
                  {
                    HearingDetails: { HearingDescription: "Plea" },
                    CaseNumber: "M20250001"
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = validateCrownFirmList(validData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return errors for missing required fields", () => {
    const result = validateCrownFirmList({});

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return errors for missing CrownCourt", () => {
    const result = validateCrownFirmList({
      FirmList: {
        DocumentID: "CFPL-2025-001",
        ListHeader: {},
        CourtLists: []
      }
    });

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing CourtLists", () => {
    const result = validateCrownFirmList({
      FirmList: {
        DocumentID: "CFPL-2025-001",
        ListHeader: {},
        CrownCourt: { CourtHouseName: "Crown Court at Manchester" }
      }
    });

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing CourtRoomNumber in sitting", () => {
    const result = validateCrownFirmList({
      FirmList: {
        DocumentID: "CFPL-2025-001",
        ListHeader: {},
        CrownCourt: { CourtHouseName: "Crown Court at Manchester" },
        CourtLists: [
          {
            SittingDate: "2025-11-12",
            Sittings: [
              {
                Judiciary: { Judge: {} }
              }
            ]
          }
        ]
      }
    });

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing SittingDate in court list", () => {
    const result = validateCrownFirmList({
      FirmList: {
        DocumentID: "CFPL-2025-001",
        ListHeader: {},
        CrownCourt: { CourtHouseName: "Crown Court at Manchester" },
        CourtLists: [
          {
            Sittings: []
          }
        ]
      }
    });

    expect(result.isValid).toBe(false);
  });
});
