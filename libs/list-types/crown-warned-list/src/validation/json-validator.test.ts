import { describe, expect, it } from "vitest";
import { validateCrownWarnedList } from "./json-validator.js";

describe("validateCrownWarnedList", () => {
  it("should validate a correct crown warned list", () => {
    const validData = {
      WarnedList: {
        DocumentID: { UniqueID: "CWPL-2025-001", DocumentType: "crown_warned_pdda_list" },
        ListHeader: {
          StartDate: "2025-11-10",
          PublishedTime: "2025-11-10T09:00:00",
          Version: "1.0"
        },
        CrownCourt: {
          CourtHouseType: "Crown Court",
          CourtHouseCode: 1001,
          CourtHouseName: "Crown Court at Birmingham",
          CourtHouseAddress: {
            Line: ["Newton Street"],
            PostCode: "B4 7NA"
          }
        },
        CourtLists: [
          {
            CourtHouse: {
              CourtHouseType: "Crown Court",
              CourtHouseCode: 1001,
              CourtHouseName: "Crown Court at Birmingham"
            },
            WithFixedDate: [
              {
                Fixture: [
                  {
                    FixedDate: "2025-11-22",
                    Cases: [
                      {
                        CaseNumber: "T20250001",
                        CaseNumberCaTH: "CaTH001",
                        Defendants: [
                          {
                            PersonalDetails: {
                              Name: { CitizenNameForename: ["Alice"], CitizenNameSurname: "Williams" },
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
        ]
      }
    };

    const result = validateCrownWarnedList(validData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return errors for missing required fields", () => {
    const result = validateCrownWarnedList({});

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return errors when WarnedList is missing DocumentID", () => {
    const result = validateCrownWarnedList({
      WarnedList: {
        ListHeader: { StartDate: "2025-11-10" },
        CrownCourt: { CourtHouseName: "Crown Court at Birmingham" },
        CourtLists: []
      }
    });

    expect(result.isValid).toBe(false);
  });

  it("should return errors when WarnedList is missing CrownCourt", () => {
    const result = validateCrownWarnedList({
      WarnedList: {
        DocumentID: "CWPL-2025-001",
        ListHeader: { StartDate: "2025-11-10" },
        CourtLists: []
      }
    });

    expect(result.isValid).toBe(false);
  });

  it("should return errors when CrownCourt is missing CourtHouseName", () => {
    const result = validateCrownWarnedList({
      WarnedList: {
        DocumentID: "CWPL-2025-001",
        ListHeader: { StartDate: "2025-11-10" },
        CrownCourt: {},
        CourtLists: []
      }
    });

    expect(result.isValid).toBe(false);
  });

  it("should return errors for HTML injection in DocumentID", () => {
    const result = validateCrownWarnedList({
      WarnedList: {
        DocumentID: "<script>alert(1)</script>",
        ListHeader: { StartDate: "2025-11-10" },
        CrownCourt: { CourtHouseName: "Crown Court at Birmingham" },
        CourtLists: []
      }
    });

    expect(result.isValid).toBe(false);
  });
});
