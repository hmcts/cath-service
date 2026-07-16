import type { CauseListData, Hearing } from "@hmcts/daily-cause-list-common";
import { describe, expect, it } from "vitest";
import { extractEtCaseSummary } from "./et-summary-builder.js";

function buildData(cases: Hearing[]): CauseListData {
  return {
    document: { publicationDate: "2025-01-28T10:00:00Z" },
    venue: {
      venueName: "Leeds Employment Tribunal",
      venueAddress: { line: ["City Exchange"], postCode: "LS1 4DA" }
    },
    courtLists: [
      {
        courtHouse: {
          courtHouseName: "Leeds",
          courtRoom: [{ courtRoomName: "Court 1", session: [{ sittings: [{ hearing: cases }] }] }]
        }
      }
    ]
  } as CauseListData;
}

describe("extractEtCaseSummary", () => {
  it("should extract Claimant, Respondent, Case reference and Hearing type per case", () => {
    // Arrange
    const data = buildData([
      {
        hearingType: "Preliminary Hearing",
        case: [
          {
            caseName: "",
            caseNumber: "1234567/2025",
            party: [
              { partyRole: "APPLICANT_PETITIONER", individualDetails: { individualForenames: "John", individualSurname: "Smith" } },
              { partyRole: "RESPONDENT", organisationDetails: { organisationName: "Acme Ltd" } }
            ]
          }
        ]
      }
    ]);

    // Act
    const result = extractEtCaseSummary(data);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Claimant", value: "J. Smith" },
      { label: "Respondent", value: "Acme Ltd" },
      { label: "Case reference", value: "1234567/2025" },
      { label: "Hearing type", value: "Preliminary Hearing" }
    ]);
  });

  it("should format individual party names as initials with title", () => {
    // Arrange
    const data = buildData([
      {
        hearingType: "Final Hearing",
        case: [
          {
            caseName: "",
            caseNumber: "9999/2025",
            party: [
              {
                partyRole: "APPLICANT_PETITIONER",
                individualDetails: { individualForenames: "Claimant", individualSurname: "surname" }
              },
              {
                partyRole: "RESPONDENT",
                individualDetails: { title: "Capt.", individualForenames: "Test forename", individualSurname: "Test Surname" }
              }
            ]
          }
        ]
      }
    ]);

    // Act
    const result = extractEtCaseSummary(data);

    // Assert
    expect(result[0].find((f) => f.label === "Claimant")?.value).toBe("C. surname");
    expect(result[0].find((f) => f.label === "Respondent")?.value).toBe("Capt. T. Test Surname");
  });

  it("should return empty strings for missing claimant, respondent, case reference and hearing type", () => {
    // Arrange
    const data = buildData([{ case: [{ caseName: "", caseNumber: "", party: [] }] }]);

    // Act
    const result = extractEtCaseSummary(data);

    // Assert
    expect(result[0]).toEqual([
      { label: "Claimant", value: "" },
      { label: "Respondent", value: "" },
      { label: "Case reference", value: "" },
      { label: "Hearing type", value: "" }
    ]);
  });

  it("should extract one summary per case across multiple hearings", () => {
    // Arrange
    const data = buildData([
      { hearingType: "Hearing A", case: [{ caseName: "", caseNumber: "AAA" }] },
      { hearingType: "Hearing B", case: [{ caseName: "", caseNumber: "BBB" }] }
    ]);

    // Act
    const result = extractEtCaseSummary(data);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].find((f) => f.label === "Case reference")?.value).toBe("AAA");
    expect(result[1].find((f) => f.label === "Case reference")?.value).toBe("BBB");
  });

  it("should return an empty list when there are no court lists", () => {
    // Arrange
    const data = buildData([]);
    data.courtLists = [];

    // Act
    const result = extractEtCaseSummary(data);

    // Assert
    expect(result).toHaveLength(0);
  });
});
