import { describe, expect, it } from "vitest";
import type { MagistratesPublicListData } from "../rendering/renderer.js";
import { extractCaseSummary, formatCaseSummaryForEmail } from "./summary-builder.js";

const buildMinimalData = (overrides: Partial<MagistratesPublicListData> = {}): MagistratesPublicListData => ({
  document: { publicationDate: "2025-09-13T09:00:00Z" },
  courtLists: [],
  ...overrides
});

const buildCourtList = (hearings: object[]) => ({
  courtHouse: {
    courtRoom: [
      {
        courtRoomName: "Room 1",
        session: [
          {
            sittings: [
              {
                sittingStart: "2025-09-13T10:00:00Z",
                hearing: hearings
              }
            ]
          }
        ]
      }
    ]
  }
});

describe("extractCaseSummary", () => {
  it("should return empty array when there are no court lists", () => {
    const result = extractCaseSummary(buildMinimalData());
    expect(result).toHaveLength(0);
  });

  it("should extract case summary for a defendant with forenames and surname", () => {
    const data = buildMinimalData({
      courtLists: [
        buildCourtList([
          {
            hearingType: "Trial",
            case: [
              {
                caseUrn: "URN123456",
                party: [
                  {
                    partyRole: "DEFENDANT",
                    individualDetails: { individualForenames: "John", individualSurname: "Smith" }
                  },
                  {
                    partyRole: "PROSECUTING_AUTHORITY",
                    organisationDetails: { organisationName: "Crown Prosecution Service" }
                  }
                ]
              }
            ]
          }
        ])
      ]
    });

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Name", value: "Smith, John" },
      { label: "Prosecuting authority", value: "Crown Prosecution Service" },
      { label: "URN", value: "URN123456" },
      { label: "Hearing type", value: "Trial" }
    ]);
  });

  it("should extract case summary for defendant with organisation name", () => {
    const data = buildMinimalData({
      courtLists: [
        buildCourtList([
          {
            hearingType: "Hearing",
            case: [
              {
                caseUrn: "URN789",
                party: [
                  {
                    partyRole: "DEFENDANT",
                    organisationDetails: { organisationName: "Acme Corp" }
                  }
                ]
              }
            ]
          }
        ])
      ]
    });

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0][0]).toEqual({ label: "Name", value: "Acme Corp" });
  });

  it("should use empty string when defendant has no party details", () => {
    const data = buildMinimalData({
      courtLists: [
        buildCourtList([
          {
            hearingType: "Hearing",
            case: [{ caseUrn: "URN000", party: [] }]
          }
        ])
      ]
    });

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0][0]).toEqual({ label: "Name", value: "" });
    expect(result[0][1]).toEqual({ label: "Prosecuting authority", value: "" });
  });

  it("should extract summary for application with subject party", () => {
    const data = buildMinimalData({
      courtLists: [
        buildCourtList([
          {
            hearingType: "Application",
            application: [
              {
                applicationReference: "APP123",
                party: [
                  {
                    subject: true,
                    individualDetails: { individualForenames: "Jane", individualSurname: "Doe" }
                  },
                  {
                    partyRole: "PROSECUTING_AUTHORITY",
                    individualDetails: { individualForenames: "Mark", individualSurname: "Brown" }
                  }
                ]
              }
            ]
          }
        ])
      ]
    });

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Name", value: "Doe, Jane" },
      { label: "Prosecuting authority", value: "Brown, Mark" },
      { label: "URN", value: "APP123" },
      { label: "Hearing type", value: "Application" }
    ]);
  });

  it("should handle hearing with both cases and applications", () => {
    const data = buildMinimalData({
      courtLists: [
        buildCourtList([
          {
            hearingType: "Mixed",
            case: [
              {
                caseUrn: "CASE001",
                party: [{ partyRole: "DEFENDANT", individualDetails: { individualSurname: "Adams" } }]
              }
            ],
            application: [
              {
                applicationReference: "APP001",
                party: [{ subject: true, individualDetails: { individualSurname: "Baker" } }]
              }
            ]
          }
        ])
      ]
    });

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(2);
    expect(result[0][0]).toEqual({ label: "Name", value: "Adams" });
    expect(result[1][0]).toEqual({ label: "Name", value: "Baker" });
  });

  it("should handle multiple court lists", () => {
    const courtList1 = buildCourtList([
      {
        hearingType: "Trial",
        case: [{ caseUrn: "CASE001", party: [] }]
      }
    ]);
    const courtList2 = buildCourtList([
      {
        hearingType: "Hearing",
        case: [{ caseUrn: "CASE002", party: [] }]
      }
    ]);

    const data = buildMinimalData({ courtLists: [courtList1, courtList2] });

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(2);
    expect(result[0][2]).toEqual({ label: "URN", value: "CASE001" });
    expect(result[1][2]).toEqual({ label: "URN", value: "CASE002" });
  });

  it("should use empty string for missing caseUrn and hearingType", () => {
    const data = buildMinimalData({
      courtLists: [
        buildCourtList([
          {
            case: [{ party: [] }]
          }
        ])
      ]
    });

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0][2]).toEqual({ label: "URN", value: "" });
    expect(result[0][3]).toEqual({ label: "Hearing type", value: "" });
  });

  it("should use empty string for missing applicationReference", () => {
    const data = buildMinimalData({
      courtLists: [
        buildCourtList([
          {
            application: [{ party: [] }]
          }
        ])
      ]
    });

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0][2]).toEqual({ label: "URN", value: "" });
  });

  it("should use empty string when party has no name details", () => {
    const data = buildMinimalData({
      courtLists: [
        buildCourtList([
          {
            case: [
              {
                caseUrn: "URN999",
                party: [{ partyRole: "DEFENDANT" }]
              }
            ]
          }
        ])
      ]
    });

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0][0]).toEqual({ label: "Name", value: "" });
  });

  it("should use surname only when forenames absent in defendant", () => {
    const data = buildMinimalData({
      courtLists: [
        buildCourtList([
          {
            case: [
              {
                caseUrn: "URN998",
                party: [{ partyRole: "DEFENDANT", individualDetails: { individualSurname: "Morrison" } }]
              }
            ]
          }
        ])
      ]
    });

    const result = extractCaseSummary(data);

    expect(result[0][0]).toEqual({ label: "Name", value: "Morrison" });
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should return 'No cases scheduled.' for empty summary", () => {
    expect(formatCaseSummaryForEmail([])).toBe("No cases scheduled.");
  });

  it("should format a single case summary", () => {
    const summaries = [
      [
        { label: "Name", value: "Smith, John" },
        { label: "URN", value: "URN123" }
      ]
    ];

    const result = formatCaseSummaryForEmail(summaries);

    expect(result).toContain("Name - Smith, John");
    expect(result).toContain("URN - URN123");
    expect(result).toContain("---");
  });

  it("should format multiple case summaries with separators", () => {
    const summaries = [[{ label: "Name", value: "Smith, John" }], [{ label: "Name", value: "Doe, Jane" }]];

    const result = formatCaseSummaryForEmail(summaries);

    expect(result).toContain("Smith, John");
    expect(result).toContain("Doe, Jane");
  });
});
