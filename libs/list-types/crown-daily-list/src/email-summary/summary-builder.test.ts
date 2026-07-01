import { describe, expect, it } from "vitest";
import type { CrownDailyListData } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

const buildTestData = (overrides?: Partial<CrownDailyListData["DailyList"]>): CrownDailyListData => ({
  DailyList: {
    DocumentID: { UniqueID: "CDL-2025-001", DocumentType: "crown_daily_pdda_list" },
    ListHeader: { StartDate: "2025-01-28", PublishedTime: "2025-01-28T09:00:00", Version: "1.0" },
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
              CourtRoomNumber: 1,
              Judiciary: { Judge: {} },
              Hearings: [
                {
                  HearingDetails: { HearingDescription: "Trial" },
                  CaseNumber: "T20250001",
                  Prosecution: { ProsecutingAuthority: "CPS" },
                  Defendants: [
                    {
                      PersonalDetails: {
                        Name: { CitizenNameForename: ["John"], CitizenNameSurname: "Smith" },
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
      { label: "Defendant Name(s)", value: "John Smith" },
      { label: "Prosecuting Authority", value: "CPS" },
      { label: "Case Reference", value: "T20250001" },
      { label: "Hearing Type", value: "Trial" }
    ]);
  });

  it("should include defendant field with empty value when no defendants present", () => {
    const testData = buildTestData({
      CourtLists: [
        {
          Sittings: [
            {
              CourtRoomNumber: 1,
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

    expect(result[0].find((f) => f.label === "Defendant Name(s)")?.value).toBe("");
  });

  it("should use hearingType fallback when hearingDescription is absent", () => {
    const testData = buildTestData({
      CourtLists: [
        {
          Sittings: [
            {
              CourtRoomNumber: 1,
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

    expect(result[0].find((f) => f.label === "Hearing Type")?.value).toBe("Sentence");
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
        { label: "Defendant Name(s)", value: "John Smith" },
        { label: "Case Reference", value: "T20250001" },
        { label: "Prosecuting Authority", value: "CPS" },
        { label: "Hearing Type", value: "Trial" }
      ]
    ];

    const result = formatCaseSummaryForEmail(summaries);

    expect(result).toContain("Defendant Name(s) - John Smith");
    expect(result).toContain("Case Reference - T20250001");
    expect(result).toContain("Prosecuting Authority - CPS");
    expect(result).toContain("Hearing Type - Trial");
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
