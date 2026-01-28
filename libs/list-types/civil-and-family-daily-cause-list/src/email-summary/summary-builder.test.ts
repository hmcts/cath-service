import { describe, expect, it } from "vitest";
import type { CauseListData } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

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
    expect(result[0]).toEqual({
      applicant: "John Smith",
      caseReferenceNumber: "12345",
      caseName: "Smith v Jones",
      caseType: "Trial",
      hearingType: "Civil"
    });
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
    expect(result[0].caseReferenceNumber).toBe("12345");
    expect(result[1].caseReferenceNumber).toBe("67890");
  });

  it("should handle missing party information", () => {
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

    expect(result[0].applicant).toBe("");
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

    expect(result[0].applicant).toBe("Test Company Ltd");
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

    expect(result[0]).toEqual({
      applicant: "",
      caseReferenceNumber: "N/A",
      caseName: "N/A",
      caseType: "N/A",
      hearingType: "N/A"
    });
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format case summaries for email", () => {
    const summaries = [
      {
        applicant: "John Smith",
        caseReferenceNumber: "12345",
        caseName: "Smith v Jones",
        caseType: "Trial",
        hearingType: "Civil"
      }
    ];

    const result = formatCaseSummaryForEmail(summaries);

    expect(result).toContain("Case: 12345");
    expect(result).toContain("Name: Smith v Jones");
    expect(result).toContain("Applicant: John Smith");
    expect(result).toContain("Type: Trial");
    expect(result).toContain("Hearing: Civil");
  });

  it("should handle multiple cases with proper spacing", () => {
    const summaries = [
      {
        applicant: "John Smith",
        caseReferenceNumber: "12345",
        caseName: "Smith v Jones",
        caseType: "Trial",
        hearingType: "Civil"
      },
      {
        applicant: "Jane Brown",
        caseReferenceNumber: "67890",
        caseName: "Brown v Green",
        caseType: "Hearing",
        hearingType: "Family"
      }
    ];

    const result = formatCaseSummaryForEmail(summaries);

    expect(result).toContain("Case: 12345");
    expect(result).toContain("Case: 67890");
    // Each case should be separated by an empty line
    expect(result.split("\n\n").length).toBeGreaterThanOrEqual(2);
  });

  it("should handle empty applicant field", () => {
    const summaries = [
      {
        applicant: "",
        caseReferenceNumber: "12345",
        caseName: "Smith v Jones",
        caseType: "Trial",
        hearingType: "Civil"
      }
    ];

    const result = formatCaseSummaryForEmail(summaries);

    expect(result).toContain("Case: 12345");
    expect(result).not.toContain("Applicant:");
  });

  it("should return message for empty list", () => {
    const result = formatCaseSummaryForEmail([]);

    expect(result).toBe("No cases scheduled.");
  });
});

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Sensitive Personal Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("reporting restrictions");
  });
});
