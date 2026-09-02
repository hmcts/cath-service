import { describe, expect, it } from "vitest";
import {
  createPartyDetails,
  extractPddaSittingsSummary,
  formatContentDate,
  formatCrownLastUpdated,
  formatPublicationDateTime,
  formatTime
} from "./crown-utilities.js";

describe("createPartyDetails", () => {
  it("should return individual full name with title, forenames, middle name, and surname", () => {
    const result = createPartyDetails({
      partyRole: "defendant",
      individualDetails: { title: "Mr", individualForenames: "John", individualMiddleName: "Paul", individualSurname: "Smith" }
    });
    expect(result).toBe("Mr John Paul Smith");
  });

  it("should return name without optional parts", () => {
    const result = createPartyDetails({
      partyRole: "defendant",
      individualDetails: { individualSurname: "Smith" }
    });
    expect(result).toBe("Smith");
  });

  it("should return organisation name", () => {
    const result = createPartyDetails({
      partyRole: "claimant",
      organisationDetails: { organisationName: "Acme Ltd" }
    });
    expect(result).toBe("Acme Ltd");
  });

  it("should return empty string when no individual or organisation", () => {
    const result = createPartyDetails({ partyRole: "defendant" });
    expect(result).toBe("");
  });

  it("should return empty string for organisation with no name", () => {
    const result = createPartyDetails({ partyRole: "defendant", organisationDetails: {} });
    expect(result).toBe("");
  });
});

describe("formatTime", () => {
  it("should format morning time without minutes", () => {
    expect(formatTime("2025-01-15T09:00:00.000Z")).toBe("9am");
  });

  it("should format afternoon time without minutes", () => {
    expect(formatTime("2025-01-15T14:00:00.000Z")).toBe("2pm");
  });

  it("should format time with minutes", () => {
    expect(formatTime("2025-01-15T09:30:00.000Z")).toBe("9:30am");
  });

  it("should format noon as 12pm", () => {
    expect(formatTime("2025-01-15T12:00:00.000Z")).toBe("12pm");
  });

  it("should format midnight as 12am", () => {
    expect(formatTime("2025-01-15T00:00:00.000Z")).toBe("12am");
  });
});

describe("formatContentDate", () => {
  it("should format date in English", () => {
    const result = formatContentDate(new Date("2025-03-15"), "en");
    expect(result).toBe("15 March 2025");
  });

  it("should format single-digit day without leading zero in English", () => {
    const result = formatContentDate(new Date("2025-03-05"), "en");
    expect(result).toBe("5 March 2025");
  });

  it("should format single-digit day without leading zero in Welsh", () => {
    const result = formatContentDate(new Date("2025-01-05"), "cy");
    expect(result).toBe("5 Ionawr 2025");
  });
});

describe("formatCrownLastUpdated", () => {
  it("should format ISO datetime with two-digit day", () => {
    const result = formatCrownLastUpdated("2025-11-12T09:00:00.000Z", "en");
    expect(result).toBe("12 November 2025 at 9am");
  });

  it("should format single-digit day without leading zero", () => {
    const result = formatCrownLastUpdated("2025-11-03T09:00:00.000Z", "en");
    expect(result).toBe("3 November 2025 at 9am");
  });

  it("should retain leading zero for single-digit minutes", () => {
    const result = formatCrownLastUpdated("2025-11-03T09:05:00.000Z", "en");
    expect(result).toBe("3 November 2025 at 9:05am");
  });
});

describe("formatPublicationDateTime", () => {
  it("should format datetime in English", () => {
    const result = formatPublicationDateTime("2025-03-15T09:00:00.000Z", "en");
    expect(result).toContain("at");
    expect(result).toContain("2025");
  });

  it("should include minutes when non-zero", () => {
    const result = formatPublicationDateTime("2025-03-15T09:30:00.000Z", "en");
    expect(result).toContain(":30");
  });
});

describe("extractPddaSittingsSummary", () => {
  it("should return empty array when court lists are empty", () => {
    expect(extractPddaSittingsSummary([])).toHaveLength(0);
  });

  it("should return empty array when sittings have no hearings", () => {
    const result = extractPddaSittingsSummary([
      {
        Sittings: [{ Hearings: undefined }]
      }
    ]);
    expect(result).toHaveLength(0);
  });

  it("should return empty array when hearings array is empty", () => {
    const result = extractPddaSittingsSummary([
      {
        Sittings: [{ Hearings: [] }]
      }
    ]);
    expect(result).toHaveLength(0);
  });

  it("should extract summary with unmasked defendant name", () => {
    const result = extractPddaSittingsSummary([
      {
        Sittings: [
          {
            Hearings: [
              {
                CaseNumber: "T20250001",
                HearingDetails: { HearingDescription: "Trial" },
                Prosecution: { ProsecutingAuthority: "CPS" },
                Defendants: [
                  {
                    PersonalDetails: {
                      IsMasked: "NO",
                      Name: { CitizenNameForename: ["Alice"], CitizenNameSurname: "Williams" }
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Defendant Name(s)", value: "Alice Williams" },
      { label: "Prosecuting Authority", value: "CPS" },
      { label: "Case Reference", value: "T20250001" },
      { label: "Hearing Type", value: "Trial" }
    ]);
  });

  it("should use MaskedName when IsMasked is yes", () => {
    const result = extractPddaSittingsSummary([
      {
        Sittings: [
          {
            Hearings: [
              {
                CaseNumber: "T20250002",
                HearingDetails: { HearingDescription: "Sentence" },
                Defendants: [
                  {
                    PersonalDetails: {
                      IsMasked: "YES",
                      MaskedName: "Reporting Restriction Applied",
                      Name: { CitizenNameForename: ["Real"], CitizenNameSurname: "Name" }
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]);

    expect(result[0][0]).toEqual({ label: "Defendant Name(s)", value: "Reporting Restriction Applied" });
  });

  it("should use MaskedName over requested name when IsMasked is yes", () => {
    const result = extractPddaSittingsSummary([
      {
        Sittings: [
          {
            Hearings: [
              {
                CaseNumber: "T20250003",
                HearingDetails: { HearingDescription: "Plea" },
                Defendants: [
                  {
                    PersonalDetails: {
                      IsMasked: "YES",
                      MaskedName: "Reporting Restriction Applied",
                      Name: { CitizenNameRequestedName: "Requested Name", CitizenNameForename: ["Bob"], CitizenNameSurname: "Jones" }
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]);

    expect(result[0][0]).toEqual({ label: "Defendant Name(s)", value: "Reporting Restriction Applied" });
  });

  it("should use requested name when IsMasked is yes but no MaskedName", () => {
    const result = extractPddaSittingsSummary([
      {
        Sittings: [
          {
            Hearings: [
              {
                CaseNumber: "T20250004",
                HearingDetails: { HearingDescription: "Plea" },
                Defendants: [
                  {
                    PersonalDetails: {
                      IsMasked: "YES",
                      Name: { CitizenNameRequestedName: "Requested Name", CitizenNameForename: ["Bob"], CitizenNameSurname: "Jones" }
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]);

    expect(result[0][0]).toEqual({ label: "Defendant Name(s)", value: "Requested Name" });
  });

  it("should use requested name when IsMasked is no and requested name is present", () => {
    const result = extractPddaSittingsSummary([
      {
        Sittings: [
          {
            Hearings: [
              {
                CaseNumber: "T20250005",
                HearingDetails: { HearingDescription: "Plea" },
                Defendants: [
                  {
                    PersonalDetails: {
                      IsMasked: "NO",
                      Name: { CitizenNameRequestedName: "Requested Name", CitizenNameForename: ["Bob"], CitizenNameSurname: "Jones" }
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]);

    expect(result[0][0]).toEqual({ label: "Defendant Name(s)", value: "Requested Name" });
  });

  it("should use full name when IsMasked is yes but no MaskedName or requested name", () => {
    const result = extractPddaSittingsSummary([
      {
        Sittings: [
          {
            Hearings: [
              {
                CaseNumber: "T20250006",
                HearingDetails: { HearingDescription: "Plea" },
                Defendants: [
                  {
                    PersonalDetails: {
                      IsMasked: "YES",
                      Name: { CitizenNameForename: ["Bob"], CitizenNameSurname: "Jones" }
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]);

    expect(result[0][0]).toEqual({ label: "Defendant Name(s)", value: "Bob Jones" });
  });

  it("should include defendant field with empty value when no defendants", () => {
    const result = extractPddaSittingsSummary([
      {
        Sittings: [
          {
            Hearings: [
              {
                CaseNumber: "T20250004",
                HearingDetails: { HearingDescription: "Mention" },
                Defendants: []
              }
            ]
          }
        ]
      }
    ]);

    const summary = result[0];
    expect(summary.find((f) => f.label === "Defendant Name(s)")?.value).toBe("");
    expect(summary.find((f) => f.label === "Case Reference")?.value).toBe("T20250004");
  });

  it("should include defendant field with empty value when defendants is undefined", () => {
    const result = extractPddaSittingsSummary([
      {
        Sittings: [
          {
            Hearings: [
              {
                CaseNumber: "T20250005",
                HearingDetails: { HearingDescription: "Mention" },
                Defendants: undefined
              }
            ]
          }
        ]
      }
    ]);

    expect(result[0].find((f) => f.label === "Defendant Name(s)")?.value).toBe("");
  });

  it("should fall back to HearingType when HearingDescription is absent", () => {
    const result = extractPddaSittingsSummary([
      {
        Sittings: [
          {
            Hearings: [
              {
                CaseNumber: "T20250006",
                HearingDetails: { HearingType: "PCM" },
                Defendants: []
              }
            ]
          }
        ]
      }
    ]);

    expect(result[0].find((f) => f.label === "Hearing Type")?.value).toBe("PCM");
  });

  it("should use empty string for hearing type when both HearingDescription and HearingType absent", () => {
    const result = extractPddaSittingsSummary([
      {
        Sittings: [
          {
            Hearings: [
              {
                CaseNumber: "T20250007",
                HearingDetails: {},
                Defendants: []
              }
            ]
          }
        ]
      }
    ]);

    expect(result[0].find((f) => f.label === "Hearing Type")?.value).toBe("");
  });

  it("should use empty string for prosecuting authority when Prosecution is absent", () => {
    const result = extractPddaSittingsSummary([
      {
        Sittings: [
          {
            Hearings: [
              {
                CaseNumber: "T20250008",
                HearingDetails: { HearingDescription: "Mention" },
                Defendants: []
              }
            ]
          }
        ]
      }
    ]);

    expect(result[0].find((f) => f.label === "Prosecuting Authority")?.value).toBe("");
  });

  it("should handle multiple defendants and join their names", () => {
    const result = extractPddaSittingsSummary([
      {
        Sittings: [
          {
            Hearings: [
              {
                CaseNumber: "T20250009",
                HearingDetails: { HearingDescription: "Trial" },
                Defendants: [
                  {
                    PersonalDetails: {
                      IsMasked: "NO",
                      Name: { CitizenNameForename: ["Alice"], CitizenNameSurname: "Smith" }
                    }
                  },
                  {
                    PersonalDetails: {
                      IsMasked: "NO",
                      Name: { CitizenNameForename: ["Bob"], CitizenNameSurname: "Jones" }
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]);

    expect(result[0][0]).toEqual({ label: "Defendant Name(s)", value: "Alice Smith, Bob Jones" });
  });

  it("should aggregate across multiple court lists and sittings", () => {
    const result = extractPddaSittingsSummary([
      {
        Sittings: [
          {
            Hearings: [
              {
                CaseNumber: "A1",
                HearingDetails: { HearingDescription: "Trial" },
                Defendants: []
              }
            ]
          }
        ]
      },
      {
        Sittings: [
          {
            Hearings: [
              {
                CaseNumber: "B1",
                HearingDetails: { HearingDescription: "Sentence" },
                Defendants: []
              }
            ]
          },
          {
            Hearings: [
              {
                CaseNumber: "C1",
                HearingDetails: { HearingDescription: "Mention" },
                Defendants: []
              }
            ]
          }
        ]
      }
    ]);

    expect(result).toHaveLength(3);
    expect(result[0].find((f) => f.label === "Case Reference")?.value).toBe("A1");
    expect(result[1].find((f) => f.label === "Case Reference")?.value).toBe("B1");
    expect(result[2].find((f) => f.label === "Case Reference")?.value).toBe("C1");
  });

  it("should include defendant field with empty value when all defendant names are empty", () => {
    const result = extractPddaSittingsSummary([
      {
        Sittings: [
          {
            Hearings: [
              {
                CaseNumber: "T20250010",
                HearingDetails: { HearingDescription: "Trial" },
                Defendants: [
                  {
                    PersonalDetails: {
                      IsMasked: "NO",
                      Name: { CitizenNameForename: [], CitizenNameSurname: undefined }
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]);

    expect(result[0].find((f) => f.label === "Defendant Name(s)")?.value).toBe("");
  });
});
