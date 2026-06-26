import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MagistratesListData } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

const baseData: MagistratesListData = {
  document: { publicationDate: "2025-01-28T10:00:00Z" },
  venue: {
    venueName: "Test Court",
    venueAddress: { line: ["123 Test Street"], postCode: "TEST 123" }
  },
  courtLists: []
};

function makeCourtList(cases: object[]) {
  return [
    {
      courtHouse: {
        courtHouseName: "Test Courthouse",
        courtRoom: [
          {
            courtRoomName: "Court 1",
            session: [
              {
                sittings: [
                  {
                    sittingStart: "2025-01-28T10:00:00Z",
                    hearing: [{ case: cases }]
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  ];
}

describe("extractCaseSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should extract case summaries from valid data", () => {
    // Arrange
    const testData: MagistratesListData = {
      ...baseData,
      courtLists: makeCourtList([
        {
          caseNumber: "MAG-001",
          offence: "Speeding",
          plea: "Guilty",
          results: "Fine £100",
          party: [
            {
              partyRole: "DEFENDANT",
              individualDetails: { individualForenames: "John", individualSurname: "Smith" }
            }
          ]
        }
      ]) as any
    };

    // Act
    const result = extractCaseSummary(testData);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Defendant name", value: "John Smith" },
      { label: "Case number", value: "MAG-001" },
      { label: "Offence", value: "Speeding" },
      { label: "Plea", value: "Guilty" },
      { label: "Results", value: "Fine £100" }
    ]);
  });

  it("should handle multiple cases across multiple court rooms", () => {
    // Arrange
    const testData: MagistratesListData = {
      ...baseData,
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Courthouse",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [{ sittings: [{ sittingStart: "2025-01-28T10:00:00Z", hearing: [{ case: [{ caseNumber: "MAG-001", party: [] }] }] }] }]
              },
              {
                courtRoomName: "Court 2",
                session: [{ sittings: [{ sittingStart: "2025-01-28T10:00:00Z", hearing: [{ case: [{ caseNumber: "MAG-002", party: [] }] }] }] }]
              }
            ]
          }
        }
      ] as any
    };

    // Act
    const result = extractCaseSummary(testData);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].find((f) => f.label === "Case number")?.value).toBe("MAG-001");
    expect(result[1].find((f) => f.label === "Case number")?.value).toBe("MAG-002");
  });

  it("should omit defendant field when no defendant party present", () => {
    // Arrange
    const testData: MagistratesListData = {
      ...baseData,
      courtLists: makeCourtList([{ caseNumber: "MAG-001", party: [] }]) as any
    };

    // Act
    const result = extractCaseSummary(testData);

    // Assert
    expect(result[0].find((f) => f.label === "Defendant name")).toBeUndefined();
  });

  it("should handle missing optional fields with empty string", () => {
    // Arrange
    const testData: MagistratesListData = {
      ...baseData,
      courtLists: makeCourtList([{ party: [] }]) as any
    };

    // Act
    const result = extractCaseSummary(testData);

    // Assert
    expect(result[0]).toEqual([
      { label: "Case number", value: "" },
      { label: "Offence", value: "" },
      { label: "Plea", value: "" },
      { label: "Results", value: "" }
    ]);
  });

  it("should handle empty case list", () => {
    // Arrange
    const testData: MagistratesListData = { ...baseData };

    // Act
    const result = extractCaseSummary(testData);

    // Assert
    expect(result).toHaveLength(0);
  });
});

describe("formatCaseSummaryForEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should format case summaries for email", () => {
    // Arrange
    const summaries = [
      [
        { label: "Defendant name", value: "John Smith" },
        { label: "Case number", value: "MAG-001" },
        { label: "Offence", value: "Speeding" },
        { label: "Plea", value: "Guilty" },
        { label: "Results", value: "Fine £100" }
      ]
    ];

    // Act
    const result = formatCaseSummaryForEmail(summaries);

    // Assert
    expect(result).toContain("Case number - MAG-001");
    expect(result).toContain("Defendant name - John Smith");
    expect(result).toContain("Offence - Speeding");
  });

  it("should handle empty case list", () => {
    // Act
    const result = formatCaseSummaryForEmail([]);

    // Assert
    expect(result).toBe("No cases scheduled.");
  });

  it("should format multiple case summaries for email", () => {
    // Arrange
    const summaries = [
      [
        { label: "Case number", value: "MAG-001" },
        { label: "Offence", value: "Speeding" }
      ],
      [
        { label: "Case number", value: "MAG-002" },
        { label: "Offence", value: "Assault" }
      ]
    ];

    // Act
    const result = formatCaseSummaryForEmail(summaries);

    // Assert
    expect(result).toContain("MAG-001");
    expect(result).toContain("MAG-002");
    expect(result).toContain("Speeding");
    expect(result).toContain("Assault");
  });
});

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});
