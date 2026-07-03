import { describe, expect, it } from "vitest";
import { validateCrownFirmList } from "./json-validator.js";

describe("validateCrownFirmList", () => {
  it("should validate a correct crown firm list", () => {
    const validData = {
      FirmList: {
        DocumentID: { UniqueID: "CFPL-2025-001", DocumentType: "crown_firm_pdda_list" },
        ListHeader: {
          StartDate: "2025-11-12",
          PublishedTime: "2025-11-12T09:00:00",
          Version: "1.0"
        },
        CrownCourt: {
          CourtHouseType: "Crown Court",
          CourtHouseCode: 1001,
          CourtHouseName: "Crown Court at Manchester",
          CourtHouseAddress: {
            Line: ["Crown Square"],
            PostCode: "M3 3FL"
          }
        },
        CourtLists: [
          {
            SittingDate: "2025-11-12",
            CourtHouse: {
              CourtHouseType: "Crown Court",
              CourtHouseCode: 1001,
              CourtHouseName: "Crown Court at Manchester"
            },
            Sittings: [
              {
                CourtRoomNumber: 3,
                Judiciary: {
                  Judge: { CitizenNameSurname: "Brown" }
                }
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
