import { describe, expect, it } from "vitest";
import type { CrownWarnedListData } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

const buildTestData = (overrides?: Partial<CrownWarnedListData>): CrownWarnedListData => ({
  document: { publicationDate: "2025-01-28T10:00:00Z", weekCommencing: "2025-01-27" },
  venue: {
    venueName: "Crown Court at Birmingham",
    venueAddress: { line: ["Newton Street"], postCode: "B4 7NA" }
  },
  courtLists: [],
  ...overrides
});

describe("extractCaseSummary", () => {
  it("should extract case summaries with defendant name, case reference and prosecuting authority", () => {
    const testData = buildTestData({
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Birmingham",
            courtRoom: [
              {
                courtRoomName: "Court 2",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-01-28T10:00:00Z",
                        hearing: [
                          {
                            hearingDescription: "For Trial",
                            case: [
                              {
                                caseNumber: "B20250001",
                                prosecutingAuthority: "CPS",
                                party: [
                                  {
                                    partyRole: "DEFENDANT",
                                    individualDetails: {
                                      individualForenames: "Alice",
                                      individualSurname: "Williams"
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
            ]
          }
        }
      ]
    });

    const result = extractCaseSummary(testData);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Defendant", value: "Alice Williams" },
      { label: "Case reference", value: "B20250001" },
      { label: "Prosecuting authority", value: "CPS" }
    ]);
  });

  it("should include defendants in custody using DEFENDANT_IN_CUSTODY role", () => {
    const testData = buildTestData({
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Birmingham",
            courtRoom: [
              {
                courtRoomName: "Court 2",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-01-28T10:00:00Z",
                        hearing: [
                          {
                            case: [
                              {
                                caseNumber: "B20250002",
                                party: [
                                  {
                                    partyRole: "DEFENDANT_IN_CUSTODY",
                                    individualDetails: { individualForenames: "Tom", individualSurname: "Hardy" }
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
    });

    const result = extractCaseSummary(testData);

    expect(result[0].find((f) => f.label === "Defendant")?.value).toBe("Tom Hardy");
  });

  it("should not include defendant field when no defendants", () => {
    const testData = buildTestData({
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Birmingham",
            courtRoom: [
              {
                courtRoomName: "Court 2",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-01-28T10:00:00Z",
                        hearing: [{ case: [{ caseNumber: "B20250003", party: [] }] }]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      ]
    });

    const result = extractCaseSummary(testData);

    expect(result[0].find((f) => f.label === "Defendant")).toBeUndefined();
  });

  it("should return empty array when no court lists", () => {
    expect(extractCaseSummary(buildTestData())).toHaveLength(0);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format summaries for email", () => {
    const result = formatCaseSummaryForEmail([
      [
        { label: "Defendant", value: "Alice Williams" },
        { label: "Case reference", value: "B20250001" },
        { label: "Prosecuting authority", value: "CPS" }
      ]
    ]);

    expect(result).toContain("Defendant - Alice Williams");
    expect(result).toContain("Case reference - B20250001");
    expect(result).toContain("Prosecuting authority - CPS");
  });

  it("should handle empty list", () => {
    expect(formatCaseSummaryForEmail([])).toBe("No cases scheduled.");
  });
});

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});
