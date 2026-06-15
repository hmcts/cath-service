import { describe, expect, it } from "vitest";
import type { CrownDailyListData } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

const buildTestData = (overrides?: Partial<CrownDailyListData["DailyList"]>): CrownDailyListData => ({
  DailyList: {
    DocumentID: "CDL-2025-001",
    ListHeader: { LastPublicationDate: "2025-01-28" },
    CrownCourt: { CourtHouseName: "Crown Court at Leeds" },
    CourtLists: [],
    ...overrides
  }
});

describe("extractCaseSummary", () => {
  it("should extract case summaries with defendant name and hearing type", () => {
    const testData = buildTestData({
      CourtLists: [
        {
          Sittings: [
            {
              CourtRoomNumber: "Court 1",
              Judiciary: { Judge: {} },
              Hearings: [
                {
                  HearingDetails: { HearingDescription: "Trial" },
                  CaseNumber: "T20250001",
                  Prosecution: { ProsecutingAuthority: "CPS" },
                  Defendants: [
                    {
                      PersonalDetails: {
                        Name: { CitizenNameForename: "John", CitizenNameSurname: "Smith" },
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

  it("should not include defendant field when no defendants present", () => {
    const testData = buildTestData({
      CourtLists: [
        {
          Sittings: [
            {
              CourtRoomNumber: "Court 1",
              Judiciary: { Judge: {} },
              Hearings: [
                {
                  HearingDetails: { HearingDescription: "Plea" },
                  CaseNumber: "T20250002",
                  Defendants: []
                }
              ]
            }
          ]
        }
      ]
    });

    const result = extractCaseSummary(testData);

    expect(result[0].find((f) => f.label === "Defendant")).toBeUndefined();
  });

  it("should use hearingType fallback when hearingDescription is absent", () => {
    const testData = buildTestData({
      CourtLists: [
        {
          Sittings: [
            {
              CourtRoomNumber: "Court 1",
              Judiciary: { Judge: {} },
              Hearings: [
                {
                  HearingDetails: { HearingType: "Sentence" },
                  CaseNumber: "T20250003"
                }
              ]
            }
          ]
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
