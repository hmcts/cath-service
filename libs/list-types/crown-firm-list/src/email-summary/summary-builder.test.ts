import { describe, expect, it } from "vitest";
import type { CrownFirmListData } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

const buildTestData = (overrides?: Partial<CrownFirmListData>): CrownFirmListData => ({
  document: { publicationDate: "2025-01-28T10:00:00Z" },
  venue: {
    venueName: "Crown Court at Manchester",
    venueAddress: { line: ["Crown Square"], postCode: "M3 3FL" }
  },
  courtLists: [],
  ...overrides
});

describe("extractCaseSummary", () => {
  it("should extract case summaries with defendant name, case number, prosecuting authority and hearing type", () => {
    const testData = buildTestData({
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Manchester",
            courtRoom: [
              {
                courtRoomName: "Court 3",
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
                                caseNumber: "M20250001",
                                prosecutingAuthority: "CPS",
                                party: [
                                  {
                                    partyRole: "DEFENDANT",
                                    individualDetails: {
                                      individualForenames: "Jane",
                                      individualSurname: "Doe"
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
      { label: "Defendant", value: "Jane Doe" },
      { label: "Case number", value: "M20250001" },
      { label: "Prosecuting authority", value: "CPS" },
      { label: "Hearing type", value: "Plea" }
    ]);
  });

  it("should not include defendant field when no defendant present", () => {
    const testData = buildTestData({
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Crown Court at Manchester",
            courtRoom: [
              {
                courtRoomName: "Court 3",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-01-28T10:00:00Z",
                        hearing: [{ case: [{ caseNumber: "M20250002", party: [] }] }]
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
        { label: "Defendant", value: "Jane Doe" },
        { label: "Case number", value: "M20250001" }
      ]
    ]);

    expect(result).toContain("Defendant - Jane Doe");
    expect(result).toContain("Case number - M20250001");
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
