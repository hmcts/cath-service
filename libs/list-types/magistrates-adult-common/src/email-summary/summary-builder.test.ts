import { describe, expect, it } from "vitest";
import type { MagistratesAdultListData } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

function makeData(caseOverrides: Record<string, unknown>): MagistratesAdultListData {
  return {
    document: { publicationDate: "2025-11-12T09:00:00.000Z" },
    venue: { venueName: "Test Court", venueAddress: { line: ["Address"], postCode: "AB1 2CD" } },
    courtLists: [
      {
        courtHouse: {
          courtHouseName: "Test Court",
          courtRoom: [
            {
              courtRoomName: "Court 1",
              session: [{ sittings: [{ sittingStart: "2025-11-12T10:00:00.000Z", hearing: [{ case: [caseOverrides] }] }] }]
            }
          ]
        }
      }
    ]
  } as MagistratesAdultListData;
}

describe("extractCaseSummary", () => {
  it("should extract defendant, case number and offence", () => {
    const summaries = extractCaseSummary(
      makeData({
        caseNumber: "MAG-2025-001",
        party: [
          {
            partyRole: "DEFENDANT",
            individualDetails: { individualForenames: "John", individualSurname: "Smith" },
            offence: [{ offenceTitle: "Theft" }]
          }
        ]
      })
    );

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toEqual([
      { label: "Defendant", value: "John Smith" },
      { label: "Case number", value: "MAG-2025-001" },
      { label: "Offence", value: "Theft" }
    ]);
  });

  it("should omit defendant when no defendant party is present", () => {
    const summaries = extractCaseSummary(makeData({ caseNumber: "MAG-2025-002", party: [{ partyRole: "PROSECUTOR" }] }));

    expect(summaries[0]).toEqual([{ label: "Case number", value: "MAG-2025-002" }]);
  });

  it("should join multiple offence titles", () => {
    const summaries = extractCaseSummary(
      makeData({
        caseNumber: "MAG-2025-003",
        party: [
          { partyRole: "DEFENDANT", individualDetails: { individualSurname: "Jones" }, offence: [{ offenceTitle: "Theft" }, { offenceTitle: "Assault" }] }
        ]
      })
    );

    expect(summaries[0]).toContainEqual({ label: "Offence", value: "Theft, Assault" });
  });

  it("should default empty case number to an empty string", () => {
    const summaries = extractCaseSummary(makeData({ party: [{ partyRole: "DEFENDANT", individualDetails: { individualSurname: "Doe" } }] }));

    expect(summaries[0]).toContainEqual({ label: "Case number", value: "" });
  });

  it("should use organisation name when defendant has no individual details", () => {
    const summaries = extractCaseSummary(
      makeData({
        caseNumber: "MAG-2025-004",
        party: [{ partyRole: "DEFENDANT", organisationDetails: { organisationName: "Acme Ltd" } }]
      })
    );

    expect(summaries[0]).toContainEqual({ label: "Defendant", value: "Acme Ltd" });
  });

  it("should re-export formatCaseSummaryForEmail and SPECIAL_CATEGORY_DATA_WARNING", () => {
    expect(typeof formatCaseSummaryForEmail).toBe("function");
    expect(typeof SPECIAL_CATEGORY_DATA_WARNING).toBe("string");
  });
});
