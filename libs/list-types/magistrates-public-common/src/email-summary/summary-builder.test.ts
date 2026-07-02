import { describe, expect, it } from "vitest";
import type { MagistratesPublicListData } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

const makeData = (cases: object[]): MagistratesPublicListData => ({
  document: { publicationDate: "2025-06-12T10:00:00Z" },
  venue: { venueName: "Oxford Magistrates' Court", venueAddress: { line: ["The Law Courts"], postCode: "OX1 1TL" } },
  courtLists: [
    {
      courtHouse: {
        courtHouseName: "Oxford Magistrates' Court",
        courtRoom: [{ courtRoomName: "Court 1", session: [{ sittings: [{ hearing: [{ case: cases }] }] }] }]
      }
    }
  ]
});

describe("extractCaseSummary", () => {
  it("should extract defendant and case number", () => {
    const data = makeData([
      {
        caseNumber: "MAG-001",
        party: [{ partyRole: "DEFENDANT", individualDetails: { individualForenames: "John", individualSurname: "Smith" } }]
      }
    ]);

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Defendant", value: "John Smith" },
      { label: "Case number", value: "MAG-001" }
    ]);
  });

  it("should omit defendant field when no DEFENDANT party present", () => {
    const data = makeData([{ caseNumber: "MAG-002", party: [] }]);

    const result = extractCaseSummary(data);

    expect(result[0].find((f) => f.label === "Defendant")).toBeUndefined();
    expect(result[0].find((f) => f.label === "Case number")?.value).toBe("MAG-002");
  });

  it("should use organisation name as defendant", () => {
    const data = makeData([{ caseNumber: "MAG-003", party: [{ partyRole: "DEFENDANT", organisationDetails: { organisationName: "Acme Corp" } }] }]);

    const result = extractCaseSummary(data);

    expect(result[0].find((f) => f.label === "Defendant")?.value).toBe("Acme Corp");
  });

  it("should not expose offence or address fields for the public list", () => {
    const data = makeData([
      {
        caseNumber: "MAG-004",
        party: [{ partyRole: "DEFENDANT", individualDetails: { individualForenames: "Jane", individualSurname: "Doe" } }]
      }
    ]);

    const result = extractCaseSummary(data);

    expect(result[0].find((f) => f.label === "Offence")).toBeUndefined();
    expect(result[0].find((f) => f.label === "Address")).toBeUndefined();
    expect(result[0]).toHaveLength(2);
  });

  it("should handle missing case number with empty string", () => {
    const data = makeData([{ party: [{ partyRole: "DEFENDANT", individualDetails: { individualForenames: "Sam", individualSurname: "Lee" } }] }]);

    const result = extractCaseSummary(data);

    expect(result[0].find((f) => f.label === "Case number")?.value).toBe("");
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format defendant and case number for email", () => {
    const summaries = [
      [
        { label: "Defendant", value: "John Smith" },
        { label: "Case number", value: "MAG-001" }
      ]
    ];

    const result = formatCaseSummaryForEmail(summaries);

    expect(result).toContain("Defendant - John Smith");
    expect(result).toContain("Case number - MAG-001");
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
