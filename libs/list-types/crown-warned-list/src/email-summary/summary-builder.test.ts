import { describe, expect, it } from "vitest";
import type { CrownWarnedListData } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

const buildTestData = (overrides?: Partial<CrownWarnedListData["WarnedList"]>): CrownWarnedListData => ({
  WarnedList: {
    DocumentID: { UniqueID: "CWL-2025-001", DocumentType: "crown_warned_pdda_list" },
    ListHeader: { StartDate: "2025-01-27" },
    CrownCourt: { CourtHouseName: "Crown Court at Birmingham" },
    CourtLists: [],
    ...overrides
  }
});

describe("extractCaseSummary", () => {
  it("should extract case summaries from WithFixedDate cases", () => {
    const testData = buildTestData({
      CourtLists: [
        {
          WithFixedDate: [
            {
              Fixture: [
                {
                  FixedDate: "2025-02-10",
                  Cases: [
                    {
                      CaseNumber: "B20250001",
                      Prosecution: { ProsecutingAuthority: "CPS" },
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
    });

    const result = extractCaseSummary(testData);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Fixed for", value: "10/02/2025" },
      { label: "Case reference", value: "B20250001" },
      { label: "Defendant name(s)", value: "Alice Williams" },
      { label: "Prosecuting authority", value: "CPS" }
    ]);
  });

  it("should extract case summaries from WithoutFixedDate cases", () => {
    const testData = buildTestData({
      CourtLists: [
        {
          WithoutFixedDate: [
            {
              Fixture: [
                {
                  Cases: [
                    {
                      CaseNumber: "B20250002",
                      Prosecution: { ProsecutingAuthority: "CPS" },
                      Defendants: [
                        {
                          PersonalDetails: {
                            Name: { CitizenNameForename: ["Tom"], CitizenNameSurname: "Hardy" },
                            IsMasked: "no",
                            CustodyStatus: "On remand"
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
    });

    const result = extractCaseSummary(testData);

    expect(result[0].find((f) => f.label === "Defendant name(s)")?.value).toBe("Tom Hardy");
    expect(result[0].find((f) => f.label === "Fixed for")?.value).toBe("");
  });

  it("should not include defendant field when no defendants", () => {
    const testData = buildTestData({
      CourtLists: [
        {
          WithFixedDate: [
            {
              Fixture: [
                {
                  Cases: [
                    {
                      CaseNumber: "B20250003",
                      Defendants: []
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    });

    const result = extractCaseSummary(testData);

    expect(result[0].find((f) => f.label === "Defendant name(s)")).toBeUndefined();
  });

  it("should return empty array when no court lists", () => {
    expect(extractCaseSummary(buildTestData())).toHaveLength(0);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format summaries for email", () => {
    const result = formatCaseSummaryForEmail([
      [
        { label: "Fixed for", value: "10/02/2025" },
        { label: "Case reference", value: "B20250001" },
        { label: "Defendant name(s)", value: "Alice Williams" },
        { label: "Prosecuting authority", value: "CPS" }
      ]
    ]);

    expect(result).toContain("Fixed for - 10/02/2025");
    expect(result).toContain("Case reference - B20250001");
    expect(result).toContain("Defendant name(s) - Alice Williams");
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
