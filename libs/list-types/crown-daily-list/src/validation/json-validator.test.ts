import { describe, expect, it } from "vitest";
import { validateCrownDailyList } from "./json-validator.js";

describe("validateCrownDailyList", () => {
  it("should validate a correct crown daily list", () => {
    const validData = {
      DailyList: {
        DocumentID: "CDPL-2025-001",
        ListHeader: {
          ListDate: "2025-11-12",
          LastPublicationDate: "2025-11-12",
          PublishedTime: "09:00:00",
          Version: "1.0"
        },
        CrownCourt: {
          CourtHouseName: "Crown Court at Leeds",
          CourtHouseAddress: {
            CourtHouseAddressLine: ["1 Oxford Row"],
            CourtHouseAddressTown: "Leeds",
            CourtHouseAddressPostCode: "LS1 3BG"
          }
        },
        CourtLists: [
          {
            Sittings: [
              {
                CourtRoomNumber: "Court 1",
                Judiciary: {
                  Judge: {
                    CitizenNameForename: "James",
                    CitizenNameSurname: "Smith"
                  }
                },
                Hearings: [
                  {
                    HearingDetails: { HearingDescription: "Trial" },
                    CaseNumber: "T20250001"
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const result = validateCrownDailyList(validData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.schemaVersion).toBe("1.0");
  });

  it("should return errors for missing required DailyList", () => {
    const invalidData = {};

    const result = validateCrownDailyList(invalidData);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return errors for missing DocumentID", () => {
    const invalidData = {
      DailyList: {
        ListHeader: {},
        CrownCourt: { CourtHouseName: "Crown Court at Leeds" },
        CourtLists: []
      }
    };

    const result = validateCrownDailyList(invalidData);

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing CourtHouseName in CrownCourt", () => {
    const invalidData = {
      DailyList: {
        DocumentID: "CDPL-2025-001",
        ListHeader: {},
        CrownCourt: {},
        CourtLists: []
      }
    };

    const result = validateCrownDailyList(invalidData);

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing Judiciary in Sittings", () => {
    const invalidData = {
      DailyList: {
        DocumentID: "CDPL-2025-001",
        ListHeader: {},
        CrownCourt: { CourtHouseName: "Crown Court at Leeds" },
        CourtLists: [
          {
            Sittings: [
              {
                CourtRoomNumber: "Court 1"
              }
            ]
          }
        ]
      }
    };

    const result = validateCrownDailyList(invalidData);

    expect(result.isValid).toBe(false);
  });

  it("should return errors for missing CourtRoomNumber in Sittings", () => {
    const invalidData = {
      DailyList: {
        DocumentID: "CDPL-2025-001",
        ListHeader: {},
        CrownCourt: { CourtHouseName: "Crown Court at Leeds" },
        CourtLists: [
          {
            Sittings: [
              {
                Judiciary: { Judge: {} }
              }
            ]
          }
        ]
      }
    };

    const result = validateCrownDailyList(invalidData);

    expect(result.isValid).toBe(false);
  });
});
