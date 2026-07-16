import type { CauseListCase } from "@hmcts/daily-cause-list-common";
import { describe, expect, it } from "vitest";
import { extractEtParty, formatEtPartyName } from "./party-formatting.js";

describe("formatEtPartyName", () => {
  it("should format an individual as title, forename initial and surname", () => {
    // Act
    const result = formatEtPartyName({
      partyRole: "APPLICANT_PETITIONER",
      individualDetails: { title: "Capt.", individualForenames: "Test forename", individualSurname: "Test Surname" }
    });

    // Assert
    expect(result).toBe("Capt. T. Test Surname");
  });

  it("should format an individual without a title", () => {
    // Act
    const result = formatEtPartyName({
      partyRole: "APPLICANT_PETITIONER",
      individualDetails: { individualForenames: "John", individualSurname: "Smith" }
    });

    // Assert
    expect(result).toBe("J. Smith");
  });

  it("should use the organisation name when there are no individual details", () => {
    // Act
    const result = formatEtPartyName({ partyRole: "RESPONDENT", organisationDetails: { organisationName: "Acme Ltd" } });

    // Assert
    expect(result).toBe("Acme Ltd");
  });

  it("should return an empty string when there are no details", () => {
    // Act / Assert
    expect(formatEtPartyName({ partyRole: "RESPONDENT" })).toBe("");
  });
});

describe("extractEtParty", () => {
  const caseItem: CauseListCase = {
    caseName: "",
    caseNumber: "1/2025",
    party: [
      { partyRole: "APPLICANT_PETITIONER", individualDetails: { title: "Mr", individualForenames: "John", individualSurname: "Smith" } },
      { partyRole: "APPLICANT_PETITIONER", organisationDetails: { organisationName: "Union Co" } },
      { partyRole: "RESPONDENT", organisationDetails: { organisationName: "Acme Ltd" } }
    ]
  };

  it("should join all parties matching the target role", () => {
    // Act / Assert
    expect(extractEtParty(caseItem, "APPLICANT_PETITIONER")).toBe("Mr J. Smith, Union Co");
    expect(extractEtParty(caseItem, "RESPONDENT")).toBe("Acme Ltd");
  });

  it("should return an empty string when no party matches", () => {
    // Act / Assert
    expect(extractEtParty(caseItem, "RESPONDENT_REPRESENTATIVE")).toBe("");
    expect(extractEtParty({ caseName: "", caseNumber: "" }, "APPLICANT_PETITIONER")).toBe("");
  });
});
