import { describe, expect, it } from "vitest";
import type { MagistratesAdultCourtListData } from "../rendering/renderer.js";
import { extractCaseSummary, formatCaseSummaryForEmail } from "./summary-builder.js";

const buildMinimalData = (overrides: Partial<MagistratesAdultCourtListData> = {}): MagistratesAdultCourtListData => ({
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

  it("should extract Defendant Name, Informant, Case Number and Offence Title per case", () => {
    const data = buildMinimalData({
      courtLists: [
        buildCourtList([
          {
            hearingType: "Trial",
            case: [
              {
                blockStart: "2025-09-13T09:00:00Z",
                defendantName: "Smith, John",
                informant: "Crown Prosecution Service",
                caseNumber: "AB12345678",
                offenceCode: "RT88191",
                offenceTitle: "Drink driving",
                offenceSummary: "On 01/01/2025 drove a motor vehicle"
              }
            ]
          }
        ])
      ]
    });

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Defendant Name", value: "Smith, John" },
      { label: "Informant", value: "Crown Prosecution Service" },
      { label: "Case Number", value: "AB12345678" },
      { label: "Offence Title", value: "Drink driving" }
    ]);
  });

  it("should use empty string for missing optional fields", () => {
    const data = buildMinimalData({
      courtLists: [
        buildCourtList([
          {
            case: [
              {
                defendantName: "Jones, Mary",
                caseNumber: "CD98765432",
                offenceCode: "TH68001",
                offenceTitle: "Theft"
              }
            ]
          }
        ])
      ]
    });

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0][1]).toEqual({ label: "Informant", value: "" });
  });

  it("should handle multiple cases across multiple court lists", () => {
    const courtList1 = buildCourtList([
      {
        case: [
          {
            defendantName: "Adams, Alice",
            informant: "CPS",
            caseNumber: "CASE001",
            offenceTitle: "Fraud"
          }
        ]
      }
    ]);
    const courtList2 = buildCourtList([
      {
        case: [
          {
            defendantName: "Baker, Bob",
            informant: "Police",
            caseNumber: "CASE002",
            offenceTitle: "Theft"
          }
        ]
      }
    ]);

    const data = buildMinimalData({ courtLists: [courtList1, courtList2] });
    const result = extractCaseSummary(data);

    expect(result).toHaveLength(2);
    expect(result[0][0]).toEqual({ label: "Defendant Name", value: "Adams, Alice" });
    expect(result[1][0]).toEqual({ label: "Defendant Name", value: "Baker, Bob" });
  });

  it("should use empty string for missing defendantName", () => {
    const data = buildMinimalData({
      courtLists: [
        buildCourtList([
          {
            case: [{ caseNumber: "AB123", offenceCode: "RT001", offenceTitle: "Speeding" }]
          }
        ])
      ]
    });

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0][0]).toEqual({ label: "Defendant Name", value: "" });
  });

  it("should use empty string for missing caseNumber", () => {
    const data = buildMinimalData({
      courtLists: [
        buildCourtList([
          {
            case: [{ defendantName: "Smith, John", offenceTitle: "Speeding" }]
          }
        ])
      ]
    });

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0][2]).toEqual({ label: "Case Number", value: "" });
  });

  it("should use empty string for missing offenceTitle", () => {
    const data = buildMinimalData({
      courtLists: [
        buildCourtList([
          {
            case: [{ defendantName: "Smith, John", caseNumber: "AB123", offenceCode: "RT001" }]
          }
        ])
      ]
    });

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0][3]).toEqual({ label: "Offence Title", value: "" });
  });

  it("should handle multiple cases in the same hearing", () => {
    const data = buildMinimalData({
      courtLists: [
        buildCourtList([
          {
            case: [
              { defendantName: "First, Person", caseNumber: "CASE001", offenceTitle: "Speeding" },
              { defendantName: "Second, Person", caseNumber: "CASE002", offenceTitle: "Fraud" }
            ]
          }
        ])
      ]
    });

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(2);
    expect(result[0][2]).toEqual({ label: "Case Number", value: "CASE001" });
    expect(result[1][2]).toEqual({ label: "Case Number", value: "CASE002" });
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should return 'No cases scheduled.' for empty summary", () => {
    expect(formatCaseSummaryForEmail([])).toBe("No cases scheduled.");
  });

  it("should format a single case summary", () => {
    const summaries = [
      [
        { label: "Defendant Name", value: "Smith, John" },
        { label: "Case Number", value: "AB123" }
      ]
    ];

    const result = formatCaseSummaryForEmail(summaries);

    expect(result).toContain("Defendant Name - Smith, John");
    expect(result).toContain("Case Number - AB123");
    expect(result).toContain("---");
  });

  it("should format multiple case summaries with separators", () => {
    const summaries = [[{ label: "Defendant Name", value: "Smith, John" }], [{ label: "Defendant Name", value: "Doe, Jane" }]];

    const result = formatCaseSummaryForEmail(summaries);

    expect(result).toContain("Smith, John");
    expect(result).toContain("Doe, Jane");
  });
});
