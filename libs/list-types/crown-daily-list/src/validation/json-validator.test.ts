import { describe, expect, it } from "vitest";
import { validateCrownDailyList } from "./json-validator.js";

describe("validateCrownDailyList", () => {
  it("should validate a correct crown daily list", () => {
    const validData = {
      DailyList: {
        DocumentID: { UniqueID: "CDPL-2025-001", DocumentType: "crown_daily_pdda_list" },
        ListHeader: {
          StartDate: "2025-11-12",
          PublishedTime: "2025-11-12T09:00:00",
          Version: "1.0"
        },
        CrownCourt: {
          CourtHouseType: "Crown Court",
          CourtHouseCode: 1001,
          CourtHouseName: "Crown Court at Leeds",
          CourtHouseAddress: {
            Line: ["1 Oxford Row"],
            PostCode: "LS1 3BG"
          }
        },
        CourtLists: [
          {
            CourtHouse: {
              CourtHouseType: "Crown Court",
              CourtHouseCode: 1001,
              CourtHouseName: "Crown Court at Leeds"
            },
            Sittings: [
              {
                CourtRoomNumber: 1,
                Judiciary: {
                  Judge: {
                    CitizenNameForename: ["James"],
                    CitizenNameSurname: "Smith"
                  }
                }
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
