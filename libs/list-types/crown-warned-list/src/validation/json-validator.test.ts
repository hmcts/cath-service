import { describe, expect, it } from "vitest";
import { validateCrownWarnedList } from "./json-validator.js";

const VALID_DATA = {
  WarnedList: {
    DocumentID: { UniqueID: "CWPL-2025-001", DocumentType: "crown_warned_pdda_list" },
    ListHeader: { StartDate: "2025-01-01", PublishedTime: "2025-01-01T09:00:00", Version: "1.0" },
    CrownCourt: { CourtHouseType: "Crown Court", CourtHouseCode: 1001, CourtHouseName: "Crown Court at Birmingham" },
    CourtLists: []
  }
};

describe("validateCrownWarnedList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateCrownWarnedList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when WarnedList is missing", () => {
    const data = { ...VALID_DATA } as Record<string, unknown>;
    delete data.WarnedList;

    const result = validateCrownWarnedList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
