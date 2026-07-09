import { describe, expect, it } from "vitest";
import { validateCrownDailyList } from "./json-validator.js";

const VALID_DATA = {
  DailyList: {
    DocumentID: { UniqueID: "CDPL-2025-001", DocumentType: "crown_daily_pdda_list" },
    ListHeader: { StartDate: "2025-01-01", PublishedTime: "2025-01-01T09:00:00", Version: "1.0" },
    CrownCourt: { CourtHouseType: "Crown Court", CourtHouseCode: 1001, CourtHouseName: "Crown Court at Leeds" },
    CourtLists: [
      {
        CourtHouse: { CourtHouseType: "Crown Court", CourtHouseCode: 1001, CourtHouseName: "Crown Court at Leeds" },
        Sittings: [{ CourtRoomNumber: 1, Judiciary: { Judge: { CitizenNameSurname: "Smith" } } }]
      }
    ]
  }
};

describe("validateCrownDailyList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateCrownDailyList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when DailyList is missing", () => {
    const data = { ...VALID_DATA } as Record<string, unknown>;
    delete data.DailyList;

    const result = validateCrownDailyList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
