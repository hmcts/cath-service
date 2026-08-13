import { describe, expect, it } from "vitest";
import type { IacDailyList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail } from "./summary-builder.js";

function buildList(): IacDailyList {
  return {
    document: { publicationDate: "2026-01-14T12:00:00Z" },
    venue: { venueName: "Manchester" },
    courtLists: [
      {
        courtListName: "Substantive List",
        courtHouse: {
          courtRoom: [
            {
              courtRoomName: "Court 1",
              session: [
                {
                  sessionChannel: ["VIDEO HEARING"],
                  sittings: [
                    {
                      sittingStart: "2026-01-15T09:30:00Z",
                      sittingEnd: "2026-01-15T12:30:00Z",
                      hearing: [
                        {
                          hearingType: "Substantive",
                          case: [
                            {
                              caseNumber: "45684548",
                              language: "English",
                              party: [
                                { partyRole: "CLAIMANT_PETITIONER", individualDetails: { individualForenames: "John", individualSurname: "Doe" } },
                                { partyRole: "PROSECUTING_AUTHORITY", organisationDetails: { organisationName: "Home Office" } }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  };
}

describe("extractCaseSummary", () => {
  it("should produce one summary per case with appellant, prosecuting authority and case reference", () => {
    const result = extractCaseSummary(buildList());

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Appellant/Applicant", value: "John Doe" },
      { label: "Prosecuting authority", value: "Home Office" },
      { label: "Case reference", value: "45684548" }
    ]);
  });

  it("should map raw party role codes through the pip role mappings", () => {
    const list = buildList();
    list.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0].party = [
      { partyRole: "PET", individualDetails: { individualForenames: "Jane", individualSurname: "Roe" } }
    ];

    const result = extractCaseSummary(list);

    expect(result[0][0]).toEqual({ label: "Appellant/Applicant", value: "" });
  });

  it("should return an empty array when there are no court lists", () => {
    const list = buildList();
    list.courtLists = [];

    const result = extractCaseSummary(list);

    expect(result).toHaveLength(0);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format each case as labelled lines separated by dividers", () => {
    const summaries = extractCaseSummary(buildList());

    const result = formatCaseSummaryForEmail(summaries);

    expect(result).toContain("Appellant/Applicant - John Doe");
    expect(result).toContain("Prosecuting authority - Home Office");
    expect(result).toContain("Case reference - 45684548");
  });

  it("should return a no-cases message when there are no summaries", () => {
    const result = formatCaseSummaryForEmail([]);

    expect(result).toBe("No cases scheduled.");
  });
});
