import { describe, expect, it } from "vitest";
import type { CrownFirmListData } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

const testCourtHouse = { CourtHouseName: "Crown Court at Manchester" };

const buildTestData = (overrides?: Partial<CrownFirmListData["FirmList"]>): CrownFirmListData => ({
  FirmList: {
    DocumentID: { UniqueID: "CFPL-2025-001", DocumentType: "crown_firm_pdda_list" },
    ListHeader: { StartDate: "2025-01-28", PublishedTime: "2025-01-28T09:00:00", Version: "1.0" },
    CrownCourt: { CourtHouseName: "Crown Court at Manchester" },
    CourtLists: [],
    ...overrides
  }
});

describe("extractCaseSummary", () => {
  it("should extract case summaries with defendant name, case number, prosecuting authority and hearing type", () => {
    const testData = buildTestData({
      CourtLists: [
        {
          SittingDate: "2025-01-28",
          CourtHouse: testCourtHouse,
          Sittings: [
            {
              CourtRoomNumber: 3,
              Judiciary: { Judge: {} },
              Hearings: [
                {
                  HearingDetails: { HearingDescription: "Plea" },
                  CaseNumber: "M20250001",
                  Prosecution: { ProsecutingAuthority: "CPS" },
                  Defendants: [
                    {
                      PersonalDetails: {
                        Name: { CitizenNameForename: ["Jane"], CitizenNameSurname: "Doe" },
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
      { label: "Defendant name(s)", value: "Jane Doe" },
      { label: "Case number", value: "M20250001" },
      { label: "Prosecuting authority", value: "CPS" },
      { label: "Hearing type", value: "Plea" }
    ]);
  });

  it("should not include defendant field when no defendants present", () => {
    const testData = buildTestData({
      CourtLists: [
        {
          SittingDate: "2025-01-28",
          CourtHouse: testCourtHouse,
          Sittings: [
            {
              CourtRoomNumber: 3,
              Judiciary: { Judge: {} },
              Hearings: [
                {
                  HearingDetails: { HearingDescription: "Trial" },
                  CaseNumber: "M20250002",
                  Defendants: []
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
        { label: "Defendant name(s)", value: "Jane Doe" },
        { label: "Case number", value: "M20250001" }
      ]
    ]);

    expect(result).toContain("Defendant name(s) - Jane Doe");
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
