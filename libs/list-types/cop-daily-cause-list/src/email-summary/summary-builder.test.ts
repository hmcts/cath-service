import { describe, expect, it } from "vitest";
import type { CauseListData } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

function buildData(courtRoom: unknown[]): CauseListData {
  return {
    document: { publicationDate: "2025-01-28T10:00:00Z" },
    venue: {
      venueName: "Test Court",
      venueAddress: { line: ["123 Test Street"], postCode: "TEST 123" }
    },
    courtLists: [{ courtHouse: { courtHouseName: "Test Courthouse", courtRoom } }]
  } as CauseListData;
}

describe("extractCaseSummary", () => {
  it("should extract the four COP fields per case", () => {
    const data = buildData([
      {
        courtRoomName: "Court 1",
        session: [
          {
            sittings: [
              {
                sittingStart: "2025-01-28T10:00:00Z",
                sittingEnd: "2025-01-28T11:00:00Z",
                hearing: [{ hearingType: "Directions", case: [{ caseNumber: "12345", caseName: "Re X", caseType: "COP" }] }]
              }
            ]
          }
        ]
      }
    ]);

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Case reference", value: "12345" },
      { label: "Case details", value: "Re X" },
      { label: "Case type", value: "COP" },
      { label: "Hearing type", value: "Directions" }
    ]);
  });

  it("should aggregate multiple cases across court rooms into a single ungrouped list", () => {
    const data = buildData([
      {
        courtRoomName: "Court 1",
        session: [
          {
            sittings: [
              { sittingStart: "", sittingEnd: "", hearing: [{ hearingType: "Directions", case: [{ caseNumber: "12345", caseName: "Re X", caseType: "COP" }] }] }
            ]
          }
        ]
      },
      {
        courtRoomName: "Court 2",
        session: [
          {
            sittings: [
              { sittingStart: "", sittingEnd: "", hearing: [{ hearingType: "Hearing", case: [{ caseNumber: "67890", caseName: "Re Y", caseType: "COP" }] }] }
            ]
          }
        ]
      }
    ]);

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(2);
    expect(result[0].find((f) => f.label === "Case reference")?.value).toBe("12345");
    expect(result[1].find((f) => f.label === "Case reference")?.value).toBe("67890");
  });

  it("should use empty strings for missing optional fields", () => {
    const data = buildData([
      {
        courtRoomName: "Court 1",
        session: [{ sittings: [{ sittingStart: "", sittingEnd: "", hearing: [{ case: [{ caseNumber: "999" }] }] }] }]
      }
    ]);

    const result = extractCaseSummary(data);

    expect(result[0]).toEqual([
      { label: "Case reference", value: "999" },
      { label: "Case details", value: "" },
      { label: "Case type", value: "" },
      { label: "Hearing type", value: "" }
    ]);
  });

  it("should return an empty list when there are no court lists", () => {
    const data = buildData([]);

    const result = extractCaseSummary(data);

    expect(result).toEqual([]);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format the ungrouped case summaries for email", () => {
    const summaries = [
      [
        { label: "Case reference", value: "12345" },
        { label: "Case details", value: "Re X" },
        { label: "Case type", value: "COP" },
        { label: "Hearing type", value: "Directions" }
      ]
    ];

    const result = formatCaseSummaryForEmail(summaries);

    expect(result).toContain("Case reference - 12345");
    expect(result).toContain("Case details - Re X");
    expect(result).toContain("Case type - COP");
    expect(result).toContain("Hearing type - Directions");
  });

  it("should handle an empty case list", () => {
    expect(formatCaseSummaryForEmail([])).toBe("No cases scheduled.");
  });
});

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain the required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});
