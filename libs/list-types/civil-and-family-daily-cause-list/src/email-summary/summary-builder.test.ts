import { describe, expect, it } from "vitest";
import type { CauseListData } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail } from "./summary-builder.js";

describe("extractCaseSummary", () => {
  it("should extract case summaries from valid data", () => {
    const testData: CauseListData = {
      document: {
        publicationDate: "2025-01-28T10:00:00Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["123 Test Street"],
          postCode: "TEST 123"
        }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Courthouse",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        hearing: [
                          {
                            hearingType: "Trial",
                            case: [
                              {
                                caseNumber: "12345",
                                caseName: "Smith v Jones",
                                caseType: "Civil",
                                party: [
                                  {
                                    partyRole: "APPLICANT_PETITIONER",
                                    individualDetails: {
                                      individualForenames: "John",
                                      individualSurname: "Smith"
                                    }
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
            ]
          }
        }
      ]
    };

    const result = extractCaseSummary(testData);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Applicant", value: "John Smith" },
      { label: "Case reference", value: "12345" },
      { label: "Case name", value: "Smith v Jones" },
      { label: "Case type", value: "Civil" },
      { label: "Hearing type", value: "Trial" }
    ]);
  });

  it("should handle multiple cases across multiple court rooms", () => {
    const testData: CauseListData = {
      document: {
        publicationDate: "2025-01-28T10:00:00Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["123 Test Street"],
          postCode: "TEST 123"
        }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Courthouse",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        hearing: [
                          {
                            hearingType: "Trial",
                            case: [
                              {
                                caseNumber: "12345",
                                caseName: "Smith v Jones",
                                caseType: "Civil",
                                party: []
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                courtRoomName: "Court 2",
                session: [
                  {
                    sittings: [
                      {
                        hearing: [
                          {
                            hearingType: "Hearing",
                            case: [
                              {
                                caseNumber: "67890",
                                caseName: "Brown v Green",
                                caseType: "Family",
                                party: []
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

    const result = extractCaseSummary(testData);

    expect(result).toHaveLength(2);
    expect(result[0].find((f) => f.label === "Case reference")?.value).toBe("12345");
    expect(result[1].find((f) => f.label === "Case reference")?.value).toBe("67890");
  });

  it("should not include applicant field when missing", () => {
    const testData: CauseListData = {
      document: {
        publicationDate: "2025-01-28T10:00:00Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["123 Test Street"],
          postCode: "TEST 123"
        }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Courthouse",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        hearing: [
                          {
                            hearingType: "Trial",
                            case: [
                              {
                                caseNumber: "12345",
                                caseName: "Smith v Jones",
                                caseType: "Civil",
                                party: []
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

    const result = extractCaseSummary(testData);

    expect(result[0].find((f) => f.label === "Applicant")).toBeUndefined();
  });

  it("should handle organisation as applicant", () => {
    const testData: CauseListData = {
      document: {
        publicationDate: "2025-01-28T10:00:00Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["123 Test Street"],
          postCode: "TEST 123"
        }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Courthouse",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        hearing: [
                          {
                            hearingType: "Trial",
                            case: [
                              {
                                caseNumber: "12345",
                                caseName: "Company Ltd v Jones",
                                caseType: "Civil",
                                party: [
                                  {
                                    partyRole: "APPLICANT_PETITIONER",
                                    organisationDetails: {
                                      organisationName: "Test Company Ltd"
                                    }
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
            ]
          }
        }
      ]
    };

    const result = extractCaseSummary(testData);

    expect(result[0].find((f) => f.label === "Applicant")?.value).toBe("Test Company Ltd");
  });

  it("should handle missing optional fields with N/A", () => {
    const testData: CauseListData = {
      document: {
        publicationDate: "2025-01-28T10:00:00Z"
      },
      venue: {
        venueName: "Test Court",
        venueAddress: {
          line: ["123 Test Street"],
          postCode: "TEST 123"
        }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Courthouse",
            courtRoom: [
              {
                courtRoomName: "Court 1",
                session: [
                  {
                    sittings: [
                      {
                        hearing: [
                          {
                            case: [
                              {
                                party: []
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

    const result = extractCaseSummary(testData);

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
        { label: "Applicant", value: "John Smith" },
        { label: "Case reference", value: "12345" },
        { label: "Case name", value: "Smith v Jones" },
        { label: "Case type", value: "Civil" },
        { label: "Hearing type", value: "Trial" }
      ]
    ];

    const result = formatCaseSummaryForEmail(summaries);

    expect(result).toContain("Case reference - 12345");
    expect(result).toContain("Case name - Smith v Jones");
    expect(result).toContain("Applicant - John Smith");
    expect(result).toContain("Case type - Civil");
    expect(result).toContain("Hearing type - Trial");
  });

  it("should handle empty case list", () => {
    const result = formatCaseSummaryForEmail([]);

    expect(result).toBe("No cases scheduled.");
  });
});

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});
