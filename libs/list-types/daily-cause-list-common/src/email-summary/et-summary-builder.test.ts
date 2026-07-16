import { describe, expect, it } from "vitest";
import type { CauseListData, Hearing } from "../models/types.js";
import { extractEtCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./et-summary-builder.js";

function buildData(cases: Hearing[]): CauseListData {
  return {
    document: { publicationDate: "2025-01-28T10:00:00Z" },
    venue: {
      venueName: "Leeds Employment Tribunal",
      venueAddress: { line: ["City Exchange"], postCode: "LS1 4DA" }
    },
    courtLists: [
      {
        courtHouse: {
          courtHouseName: "Leeds",
          courtRoom: [{ courtRoomName: "Court 1", session: [{ sittings: [{ hearing: cases }] }] }]
        }
      }
    ]
  } as CauseListData;
}

describe("extractEtCaseSummary", () => {
  it("should extract Claimant, Respondent, Case reference and Hearing type per case", () => {
    // Arrange
    const data = buildData([
      {
        hearingType: "Preliminary Hearing",
        case: [
          {
            caseNumber: "1234567/2025",
            party: [
              { partyRole: "APPLICANT_PETITIONER", individualDetails: { individualForenames: "John", individualSurname: "Smith" } },
              { partyRole: "RESPONDENT", organisationDetails: { organisationName: "Acme Ltd" } }
            ]
          }
        ]
      }
    ]);

    // Act
    const result = extractEtCaseSummary(data);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Claimant", value: "John Smith" },
      { label: "Respondent", value: "Acme Ltd" },
      { label: "Case reference", value: "1234567/2025" },
      { label: "Hearing type", value: "Preliminary Hearing" }
    ]);
  });

  it("should return empty strings for missing claimant, respondent, case reference and hearing type", () => {
    // Arrange
    const data = buildData([{ case: [{ party: [] }] }]);

    // Act
    const result = extractEtCaseSummary(data);

    // Assert
    expect(result[0]).toEqual([
      { label: "Claimant", value: "" },
      { label: "Respondent", value: "" },
      { label: "Case reference", value: "" },
      { label: "Hearing type", value: "" }
    ]);
  });

  it("should extract one summary per case across multiple hearings", () => {
    // Arrange
    const data = buildData([
      { hearingType: "Hearing A", case: [{ caseNumber: "AAA" }] },
      { hearingType: "Hearing B", case: [{ caseNumber: "BBB" }] }
    ]);

    // Act
    const result = extractEtCaseSummary(data);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].find((f) => f.label === "Case reference")?.value).toBe("AAA");
    expect(result[1].find((f) => f.label === "Case reference")?.value).toBe("BBB");
  });

  it("should return an empty list when there are no court lists", () => {
    // Arrange
    const data = buildData([]);
    data.courtLists = [];

    // Act
    const result = extractEtCaseSummary(data);

    // Assert
    expect(result).toHaveLength(0);
  });
});

describe("formatCaseSummaryForEmail (ET re-export)", () => {
  it("should format the ET fields for email", () => {
    // Arrange
    const summaries = [
      [
        { label: "Claimant", value: "John Smith" },
        { label: "Respondent", value: "Acme Ltd" },
        { label: "Case reference", value: "1234567/2025" },
        { label: "Hearing type", value: "Preliminary Hearing" }
      ]
    ];

    // Act
    const result = formatCaseSummaryForEmail(summaries);

    // Assert
    expect(result).toContain("Claimant - John Smith");
    expect(result).toContain("Respondent - Acme Ltd");
    expect(result).toContain("Case reference - 1234567/2025");
    expect(result).toContain("Hearing type - Preliminary Hearing");
  });

  it("should handle an empty case list", () => {
    // Act / Assert
    expect(formatCaseSummaryForEmail([])).toBe("No cases scheduled.");
  });
});

describe("SPECIAL_CATEGORY_DATA_WARNING (ET re-export)", () => {
  it("should be re-exported for consumers", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
  });
});
