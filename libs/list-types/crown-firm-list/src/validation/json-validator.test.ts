import { describe, expect, it } from "vitest";
import { validateCrownFirmList } from "./json-validator.js";

const VALID_DATA = {
  FirmList: {
    DocumentID: { UniqueID: "CFPL-2025-001", DocumentType: "crown_firm_pdda_list" },
    ListHeader: { StartDate: "2025-01-01", PublishedTime: "2025-01-01T09:00:00", Version: "1.0" },
    CrownCourt: { CourtHouseType: "Crown Court", CourtHouseCode: 1001, CourtHouseName: "Crown Court at Manchester" },
    CourtLists: [
      {
        SittingDate: "2025-01-01",
        CourtHouse: { CourtHouseType: "Crown Court", CourtHouseCode: 1001, CourtHouseName: "Crown Court at Manchester" },
        Sittings: [{ CourtRoomNumber: 1, Judiciary: { Judge: { CitizenNameSurname: "Brown" } } }]
      }
    ]
  }
};

describe("validateCrownFirmList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateCrownFirmList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when FirmList is missing", () => {
    const data = { ...VALID_DATA } as Record<string, unknown>;
    delete data.FirmList;

    const result = validateCrownFirmList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
