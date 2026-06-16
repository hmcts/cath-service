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
        courtRoom: [{ courtRoomName: "Court 1", session: [{ sittings: [{ hearing: [{ hearingType: "Final Hearing", case: cases }] }] }] }]
      }
    }
  ]
});

describe("extractCaseSummary", () => {
  it("should extract applicant and respondent", () => {
    const data = makeData([
      {
        caseNumber: "FA12345",
        caseName: "Smith v Jones",
        caseType: "Family",
        party: [
          { partyRole: "APPLICANT_PETITIONER", individualDetails: { individualForenames: "Alice", individualSurname: "Smith" } },
          { partyRole: "RESPONDENT", individualDetails: { individualForenames: "Bob", individualSurname: "Jones" } }
        ]
      }
    ]);

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Applicant", value: "Alice Smith" },
      { label: "Respondent", value: "Bob Jones" },
      { label: "Case reference", value: "FA12345" },
      { label: "Case name", value: "Smith v Jones" },
      { label: "Case type", value: "Family" },
      { label: "Hearing type", value: "Final Hearing" }
    ]);
  });

  it("should not include applicant field when no APPLICANT_PETITIONER party present", () => {
    const data = makeData([{ caseNumber: "FB99999", caseName: "No Party", caseType: "Family", party: [] }]);

    const result = extractCaseSummary(data);

    expect(result[0].find((f) => f.label === "Applicant")).toBeUndefined();
  });

  it("should not include respondent field when no RESPONDENT party present", () => {
    const data = makeData([
      {
        caseNumber: "FC11111",
        caseName: "Applicant Only",
        caseType: "Family",
        party: [{ partyRole: "APPLICANT_PETITIONER", individualDetails: { individualForenames: "Jane", individualSurname: "Doe" } }]
      }
    ]);

    const result = extractCaseSummary(data);

    expect(result[0].find((f) => f.label === "Respondent")).toBeUndefined();
    expect(result[0].find((f) => f.label === "Applicant")?.value).toBe("Jane Doe");
  });

  it("should use organisation name for respondent", () => {
    const data = makeData([
      {
        caseNumber: "FD22222",
        caseName: "Person v Org",
        caseType: "Family",
        party: [{ partyRole: "RESPONDENT", organisationDetails: { organisationName: "Family Services Ltd" } }]
      }
    ]);

    const result = extractCaseSummary(data);

    expect(result[0].find((f) => f.label === "Respondent")?.value).toBe("Family Services Ltd");
  });

  it("should include title and middle name in names", () => {
    const data = makeData([
      {
        caseNumber: "FE33333",
        caseName: "Test",
        caseType: "Family",
        party: [
          {
            partyRole: "APPLICANT_PETITIONER",
            individualDetails: { title: "Ms", individualForenames: "Mary", individualMiddleName: "Ann", individualSurname: "Taylor" }
          }
        ]
      }
    ]);

    const result = extractCaseSummary(data);

    expect(result[0].find((f) => f.label === "Applicant")?.value).toBe("Ms Mary Ann Taylor");
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
                  {
                    sittings: [{ hearing: [{ hearingType: "Hearing", case: [{ caseNumber: "FF11111", caseName: "Case A", caseType: "Family", party: [] }] }] }]
                  }
                ]
              },
              {
                courtRoomName: "Court 2",
                session: [
                  {
                    sittings: [{ hearing: [{ hearingType: "Hearing", case: [{ caseNumber: "FF22222", caseName: "Case B", caseType: "Family", party: [] }] }] }]
                  }
                ]
              }
            ]
          }
        }
      ]
    };

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(2);
    expect(result[0].find((f) => f.label === "Case reference")?.value).toBe("FF11111");
    expect(result[1].find((f) => f.label === "Case reference")?.value).toBe("FF22222");
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
});

describe("formatCaseSummaryForEmail", () => {
  it("should format case summaries for email", () => {
    const summaries = [
      [
        { label: "Applicant", value: "Alice Smith" },
        { label: "Respondent", value: "Bob Jones" },
        { label: "Case reference", value: "FA12345" }
      ]
    ];

    const result = formatCaseSummaryForEmail(summaries);

    expect(result).toContain("Applicant - Alice Smith");
    expect(result).toContain("Respondent - Bob Jones");
    expect(result).toContain("Case reference - FA12345");
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
