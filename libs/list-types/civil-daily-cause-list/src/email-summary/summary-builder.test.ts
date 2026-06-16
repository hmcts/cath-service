import { describe, expect, it } from "vitest";
import type { CauseListData } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

const makeData = (cases: object[]): CauseListData => ({
  document: { publicationDate: "2025-06-12T10:00:00Z" },
  venue: { venueName: "Birmingham Civil and Family Justice Centre", venueAddress: { line: ["33 Bull Street"], postCode: "B4 6DS" } },
  courtLists: [
    {
      courtHouse: {
        courtHouseName: "Birmingham Civil and Family Justice Centre",
        courtRoom: [{ courtRoomName: "Court 1", session: [{ sittings: [{ hearing: [{ hearingType: "Trial", case: cases }] }] }] }]
      }
    }
  ]
});

describe("extractCaseSummary", () => {
  it("should extract case summary with applicant", () => {
    const data = makeData([
      {
        caseNumber: "A12345",
        caseName: "Smith v Jones",
        caseType: "Civil",
        party: [{ partyRole: "APPLICANT_PETITIONER", individualDetails: { individualForenames: "John", individualSurname: "Smith" } }]
      }
    ]);

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Applicant", value: "John Smith" },
      { label: "Case reference", value: "A12345" },
      { label: "Case name", value: "Smith v Jones" },
      { label: "Case type", value: "Civil" },
      { label: "Hearing type", value: "Trial" }
    ]);
  });

  it("should not include applicant field when no APPLICANT_PETITIONER party present", () => {
    const data = makeData([{ caseNumber: "B99999", caseName: "No Party Case", caseType: "Civil", party: [] }]);

    const result = extractCaseSummary(data);

    expect(result[0].find((f) => f.label === "Applicant")).toBeUndefined();
  });

  it("should use organisation name as applicant", () => {
    const data = makeData([
      {
        caseNumber: "C11111",
        caseName: "Org v Ltd",
        caseType: "Civil",
        party: [{ partyRole: "APPLICANT_PETITIONER", organisationDetails: { organisationName: "Acme Corp" } }]
      }
    ]);

    const result = extractCaseSummary(data);

    expect(result[0].find((f) => f.label === "Applicant")?.value).toBe("Acme Corp");
  });

  it("should include title and middle name in applicant name", () => {
    const data = makeData([
      {
        caseNumber: "D22222",
        caseName: "Test",
        caseType: "Civil",
        party: [
          {
            partyRole: "APPLICANT_PETITIONER",
            individualDetails: { title: "Mr", individualForenames: "James", individualMiddleName: "Edward", individualSurname: "Brown" }
          }
        ]
      }
    ]);

    const result = extractCaseSummary(data);

    expect(result[0].find((f) => f.label === "Applicant")?.value).toBe("Mr James Edward Brown");
  });

  it("should handle multiple cases across court rooms", () => {
    const data: CauseListData = {
      document: { publicationDate: "2025-06-12T10:00:00Z" },
      venue: { venueName: "Test Court", venueAddress: { line: ["1 Test St"], postCode: "TE1 1ST" } },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  { sittings: [{ hearing: [{ hearingType: "Trial", case: [{ caseNumber: "E11111", caseName: "Case A", caseType: "Civil", party: [] }] }] }] }
                ]
              },
              {
                courtRoomName: "Court 2",
                session: [
                  { sittings: [{ hearing: [{ hearingType: "Hearing", case: [{ caseNumber: "E22222", caseName: "Case B", caseType: "Civil", party: [] }] }] }] }
                ]
              }
            ]
          }
        }
      ]
    };

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(2);
    expect(result[0].find((f) => f.label === "Case reference")?.value).toBe("E11111");
    expect(result[1].find((f) => f.label === "Case reference")?.value).toBe("E22222");
  });

  it("should handle missing optional fields with empty strings", () => {
    const data: CauseListData = {
      document: { publicationDate: "2025-06-12T10:00:00Z" },
      venue: { venueName: "Test Court", venueAddress: { line: ["1 Test St"], postCode: "TE1 1ST" } },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court",
            courtRoom: [{ courtRoomName: "Court 1", session: [{ sittings: [{ hearing: [{ case: [{ party: [] }] }] }] }] }]
          }
        }
      ]
    };

    const result = extractCaseSummary(data);

    expect(result[0]).toEqual([
      { label: "Case reference", value: "" },
      { label: "Case name", value: "" },
      { label: "Case type", value: "" },
      { label: "Hearing type", value: "" }
    ]);
  });

  it("should not include respondent field (civil list only extracts applicant)", () => {
    const data = makeData([
      {
        caseNumber: "F55555",
        caseName: "Civil Case",
        caseType: "Civil",
        party: [
          { partyRole: "APPLICANT_PETITIONER", individualDetails: { individualForenames: "Alice", individualSurname: "Green" } },
          { partyRole: "RESPONDENT", individualDetails: { individualForenames: "Bob", individualSurname: "Blue" } }
        ]
      }
    ]);

    const result = extractCaseSummary(data);

    expect(result[0].find((f) => f.label === "Respondent")).toBeUndefined();
    expect(result[0].find((f) => f.label === "Applicant")?.value).toBe("Alice Green");
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format case summaries for email", () => {
    const summaries = [
      [
        { label: "Case reference", value: "12345" },
        { label: "Hearing type", value: "Trial" }
      ]
    ];

    const result = formatCaseSummaryForEmail(summaries);

    expect(result).toContain("Case reference - 12345");
    expect(result).toContain("Hearing type - Trial");
  });

  it("should return no cases message for empty list", () => {
    expect(formatCaseSummaryForEmail([])).toBe("No cases scheduled.");
  });
});

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});
