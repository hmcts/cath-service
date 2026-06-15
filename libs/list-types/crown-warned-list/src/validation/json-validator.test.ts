import { describe, expect, it } from "vitest";
import { validateCrownWarnedList } from "./json-validator.js";

describe("validateCrownWarnedList", () => {
  it("should validate a correct crown warned list", () => {
    const validData = {
      WarnedList: {
        DocumentID: "CWPL-2025-001",
        ListHeader: {
          StartDate: "2025-11-10",
          LastPublicationDate: "2025-11-12",
          PublishedTime: "09:00:00"
        },
        CrownCourt: {
          CourtHouseName: "Crown Court at Birmingham",
          CourtHouseAddress: {
            CourtHouseAddressLine: ["Newton Street"],
            CourtHouseAddressTown: "Birmingham",
            CourtHouseAddressPostCode: "B4 7NA"
          }
        },
        CourtLists: [
          {
            CourtHouse: { CourtHouseName: "Crown Court at Birmingham" },
            WithFixedDate: [
              {
                Fixture: [
                  {
                    FixedDate: "2025-11-22",
                    Cases: [
                      {
                        CaseNumber: "T20250001",
                        Defendants: [
                          {
                            PersonalDetails: {
                              Name: { CitizenNameForename: "Alice", CitizenNameSurname: "Williams" },
                              IsMasked: "no"
                            }
                          }
                        ],
                        Prosecution: { ProsecutingAuthority: "CPS" }
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
