import { describe, expect, it } from "vitest";
import type { CrownDailyListData } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

const buildTestData = (overrides?: Partial<CrownDailyListData>): CrownDailyListData => ({
  document: { publicationDate: "2025-01-28T10:00:00Z" },
  venue: {
    venueName: "Crown Court at Leeds",
    venueAddress: { line: ["1 Oxford Row"], postCode: "LS1 3BG" }
  },
  courtLists: [],
  ...overrides
});

describe("extractCaseSummary", () => {
  it("should extract case summaries with defendant name and hearing type", () => {
    const testData = buildTestData({
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Leeds",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-01-28T10:00:00Z",
                        hearing: [
                          {
                            hearingDescription: "Trial",
                            case: [
                              {
                                caseNumber: "T20250001",
                                prosecutingAuthority: "CPS",
                                party: [
                                  {
                                    partyRole: "DEFENDANT",
                                    individualDetails: {
                                      individualForenames: "John",
                                      individualSurname: "Smith"
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
      { label: "Defendant", value: "John Smith" },
      { label: "Case reference", value: "T20250001" },
      { label: "Prosecuting authority", value: "CPS" },
      { label: "Hearing type", value: "Trial" }
    ]);
  });

  it("should not include defendant field when no defendant party present", () => {
    const testData = buildTestData({
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Leeds",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-01-28T10:00:00Z",
                        hearing: [
                          {
                            hearingDescription: "Plea",
                            case: [
                              {
                                caseNumber: "T20250002",
                                party: []
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

    expect(result[0].find((f) => f.label === "Defendant")).toBeUndefined();
  });

  it("should use hearingType fallback when hearingDescription is absent", () => {
    const testData = buildTestData({
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Leeds",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-01-28T10:00:00Z",
                        hearing: [
                          {
                            hearingType: "Sentence",
                            case: [
                              {
                                caseNumber: "T20250003",
                                party: []
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

    expect(result[0].find((f) => f.label === "Hearing type")?.value).toBe("Sentence");
  });

  it("should return empty array for data with no court lists", () => {
    const result = extractCaseSummary(buildTestData());
    expect(result).toHaveLength(0);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format case summaries for email", () => {
    const summaries = [
      [
        { label: "Defendant", value: "John Smith" },
        { label: "Case reference", value: "T20250001" },
        { label: "Prosecuting authority", value: "CPS" },
        { label: "Hearing type", value: "Trial" }
      ]
    ];

    const result = formatCaseSummaryForEmail(summaries);

    expect(result).toContain("Defendant - John Smith");
    expect(result).toContain("Case reference - T20250001");
    expect(result).toContain("Prosecuting authority - CPS");
    expect(result).toContain("Hearing type - Trial");
  });

  it("should handle empty case list", () => {
    const result = formatCaseSummaryForEmail([]);
    expect(result).toBe("No cases scheduled.");
  });
});

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});
