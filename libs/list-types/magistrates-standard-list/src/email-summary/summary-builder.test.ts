import { describe, expect, it } from "vitest";
import type { MagistratesStandardList } from "../models/types.js";
import { extractCaseSummary } from "./summary-builder.js";

const BASE: MagistratesStandardList = {
  document: { publicationDate: "2025-01-13T09:30:00.000Z" },
  venue: {},
  courtLists: []
};

function makeJson(
  hearings: MagistratesStandardList["courtLists"][0]["courtHouse"]["courtRoom"][0]["session"][0]["sittings"][0]["hearing"]
): MagistratesStandardList {
  return {
    ...BASE,
    courtLists: [
      {
        courtHouse: {
          courtHouseName: "Test Court",
          courtRoom: [
            {
              courtRoomName: "Court 1",
              session: [{ sittings: [{ sittingStart: "2025-01-13T10:00:00.000Z", hearing: hearings }] }]
            }
          ]
        }
      }
    ]
  };
}

describe("extractCaseSummary", () => {
  it("should include middle name in defendant name", () => {
    const result = extractCaseSummary(
      makeJson([
        {
          case: [
            {
              caseUrn: "URN001",
              party: [
                {
                  partyRole: "DEFENDANT",
                  individualDetails: {
                    individualForenames: "John",
                    individualMiddleName: "Edward",
                    individualSurname: "Smith"
                  }
                }
              ]
            }
          ]
        }
      ])
    );

    expect(result[0].find((f) => f.label === "Name")?.value).toBe("Smith, John Edward");
  });

  it("should include middle name in applicant name", () => {
    const result = extractCaseSummary(
      makeJson([
        {
          application: [
            {
              applicationReference: "APP001",
              party: [
                {
                  subject: true,
                  individualDetails: {
                    individualForenames: "Jane",
                    individualMiddleName: "Marie",
                    individualSurname: "Doe"
                  }
                }
              ]
            }
          ]
        }
      ])
    );

    expect(result[0].find((f) => f.label === "Name")?.value).toBe("Doe, Jane Marie");
  });

  it("should join all offence titles with comma for defendant", () => {
    const result = extractCaseSummary(
      makeJson([
        {
          case: [
            {
              caseUrn: "URN002",
              party: [
                {
                  partyRole: "DEFENDANT",
                  individualDetails: { individualForenames: "Bob", individualSurname: "Jones" },
                  offence: [{ offenceTitle: "Drink driving" }, { offenceTitle: "Assault by beating" }, { offenceTitle: "Criminal damage" }]
                }
              ]
            }
          ]
        }
      ])
    );

    expect(result[0].find((f) => f.label === "Offence")?.value).toBe("Drink driving, Assault by beating, Criminal damage");
  });

  it("should display offences for application subject party", () => {
    const result = extractCaseSummary(
      makeJson([
        {
          application: [
            {
              applicationReference: "APP002",
              party: [
                {
                  subject: true,
                  organisationDetails: { organisationName: "Respondent Ltd" },
                  offence: [{ offenceTitle: "Breach of order" }, { offenceTitle: "Contempt of court" }]
                }
              ]
            }
          ]
        }
      ])
    );

    expect(result[0].find((f) => f.label === "Offence")?.value).toBe("Breach of order, Contempt of court");
  });

  it("should not include Offence field when no offences present", () => {
    const result = extractCaseSummary(
      makeJson([
        {
          case: [
            {
              caseUrn: "URN003",
              party: [{ partyRole: "DEFENDANT", individualDetails: { individualForenames: "Ann", individualSurname: "Brown" } }]
            }
          ]
        }
      ])
    );

    expect(result[0].find((f) => f.label === "Offence")).toBeUndefined();
  });

  it("should include prosecuting authority for cases", () => {
    const result = extractCaseSummary(
      makeJson([
        {
          case: [
            {
              caseUrn: "URN004",
              party: [
                { partyRole: "DEFENDANT", individualDetails: { individualForenames: "Tom", individualSurname: "Hill" } },
                { partyRole: "PROSECUTING_AUTHORITY", organisationDetails: { organisationName: "Crown Prosecution Service" } }
              ]
            }
          ]
        }
      ])
    );

    expect(result[0].find((f) => f.label === "Prosecuting authority")?.value).toBe("Crown Prosecution Service");
  });

  it("should not include Offence field for applications with no offences", () => {
    const result = extractCaseSummary(
      makeJson([
        {
          application: [
            {
              applicationReference: "APP003",
              party: [{ subject: true, organisationDetails: { organisationName: "Test Org" } }]
            }
          ]
        }
      ])
    );

    expect(result[0].find((f) => f.label === "Offence")).toBeUndefined();
  });

  it("should return empty name when party has neither individual nor organisation details", () => {
    const result = extractCaseSummary(
      makeJson([
        {
          case: [
            {
              caseUrn: "URN005",
              party: [{ partyRole: "DEFENDANT" }]
            }
          ]
        }
      ])
    );

    expect(result[0].find((f) => f.label === "Name")).toBeUndefined();
  });

  it("should include hearing type for case hearings when present", () => {
    const result = extractCaseSummary(
      makeJson([
        {
          hearingType: "First hearing",
          case: [
            {
              caseUrn: "URN006",
              party: [{ partyRole: "DEFENDANT", individualDetails: { individualForenames: "Sam", individualSurname: "Green" } }]
            }
          ]
        }
      ])
    );

    expect(result[0].find((f) => f.label === "Hearing type")?.value).toBe("First hearing");
  });

  it("should include hearing type for application hearings when present", () => {
    const result = extractCaseSummary(
      makeJson([
        {
          hearingType: "Restraining order",
          application: [
            {
              applicationReference: "APP004",
              party: [{ subject: true, organisationDetails: { organisationName: "Applicant Org" } }]
            }
          ]
        }
      ])
    );

    expect(result[0].find((f) => f.label === "Hearing type")?.value).toBe("Restraining order");
  });
});
