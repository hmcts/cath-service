import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SjpHearing, SjpJson } from "./json-parser.js";
import { determineListType, extractAllHearings, extractCaseCount, extractPressCases, extractPublicCases } from "./json-parser.js";

const createMockHearing = (includeDoB: boolean = false) => ({
  case: [{ caseUrn: "REF123" }],
  party: [
    {
      partyRole: "ACCUSED",
      individualDetails: {
        title: "Mr",
        individualForenames: "John",
        individualSurname: "Doe",
        ...(includeDoB && { dateOfBirth: "01/01/1990", age: 35 }),
        address: {
          line: ["123 Test Street"],
          town: "London",
          county: "Greater London",
          postCode: "SW1A 1AA"
        }
      }
    },
    {
      partyRole: "PROSECUTOR",
      organisationDetails: {
        organisationName: "CPS"
      }
    }
  ],
  offence: [
    {
      offenceTitle: "Speeding",
      offenceWording: "Exceeded speed limit",
      reportingRestriction: false
    }
  ]
});

const createMockJson = (includeDoB: boolean = false): SjpJson => ({
  document: {
    publicationDate: "2025-11-28T09:00:00Z"
  },
  courtLists: [
    {
      courtHouse: {
        courtRoom: [
          {
            session: [
              {
                sittings: [
                  {
                    hearing: [createMockHearing(includeDoB)]
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  ]
});

const createMockJsonWithDob = (dateOfBirth: string | undefined): SjpJson => {
  const json = createMockJson(false);
  const hearing = json.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0];
  const accused = hearing.party[0];
  const withDob: SjpHearing = {
    ...hearing,
    party: [{ ...accused, individualDetails: { ...accused.individualDetails, dateOfBirth, age: 35 } }, ...hearing.party.slice(1)]
  };
  return {
    ...json,
    courtLists: [{ courtHouse: { courtRoom: [{ session: [{ sittings: [{ hearing: [withDob] }] }] }] } }]
  };
};

describe("determineListType", () => {
  it("should return press when hearing has date of birth", () => {
    const json = createMockJson(true);
    expect(determineListType(json)).toBe("press");
  });

  it("should return press when the accused's date of birth can't be parsed", () => {
    const json = createMockJsonWithDob("unknown");
    expect(determineListType(json)).toBe("press");
  });

  it("should return public when hearing has no date of birth", () => {
    const json = createMockJson(false);
    expect(determineListType(json)).toBe("public");
  });

  it("should return public for empty court lists", () => {
    const json: SjpJson = {
      document: { publicationDate: "2025-11-28T09:00:00Z" },
      courtLists: []
    };
    expect(determineListType(json)).toBe("public");
  });

  it("should return public when no hearing found", () => {
    const json: SjpJson = {
      document: { publicationDate: "2025-11-28T09:00:00Z" },
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                session: [
                  {
                    sittings: [
                      {
                        hearing: []
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
    expect(determineListType(json)).toBe("public");
  });
});

describe("extractAllHearings", () => {
  it("should extract hearings from nested structure", () => {
    const json = createMockJson(true);
    const hearings = extractAllHearings(json);
    expect(hearings).toHaveLength(1);
    expect(hearings[0].case[0].caseUrn).toBe("REF123");
  });

  it("should return empty array for empty court lists", () => {
    const json: SjpJson = {
      document: { publicationDate: "2025-11-28T09:00:00Z" },
      courtLists: []
    };
    expect(extractAllHearings(json)).toEqual([]);
  });

  it("should extract multiple hearings from multiple sittings", () => {
    const json: SjpJson = {
      document: { publicationDate: "2025-11-28T09:00:00Z" },
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                session: [
                  {
                    sittings: [
                      {
                        hearing: [createMockHearing(true), createMockHearing(true)]
                      },
                      {
                        hearing: [createMockHearing(true)]
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
    expect(extractAllHearings(json)).toHaveLength(3);
  });
});

describe("extractCaseCount", () => {
  it("should return count of all hearings", () => {
    const json = createMockJson(true);
    expect(extractCaseCount(json)).toBe(1);
  });

  it("should return 0 for empty court lists", () => {
    const json: SjpJson = {
      document: { publicationDate: "2025-11-28T09:00:00Z" },
      courtLists: []
    };
    expect(extractCaseCount(json)).toBe(0);
  });

  it("should return correct count for multiple hearings", () => {
    const json: SjpJson = {
      document: { publicationDate: "2025-11-28T09:00:00Z" },
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                session: [
                  {
                    sittings: [
                      {
                        hearing: [createMockHearing(true), createMockHearing(true)]
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
    expect(extractCaseCount(json)).toBe(2);
  });
});

describe("extractPressCases", () => {
  it("should extract press cases with full details", () => {
    const json = createMockJson(true);
    const cases = extractPressCases(json);

    expect(cases).toHaveLength(1);
    expect(cases[0].name).toBe("Mr John Doe");
    expect(cases[0].postcode).toBe("SW1A");
    expect(cases[0].prosecutor).toBe("CPS");
    expect(cases[0].reference).toBe("REF123");
    expect(cases[0].address).toBe("123 Test Street, London, Greater London, SW1A 1AA");
    expect(cases[0].dateOfBirth).toBeInstanceOf(Date);
    expect(cases[0].rawDateOfBirth).toBe("01/01/1990");
    expect(cases[0].age).toBeGreaterThan(0);
    expect(cases[0].offences).toHaveLength(1);
    expect(cases[0].offences[0].offenceTitle).toBe("Speeding");
    expect(cases[0].offences[0].offenceWording).toBe("Exceeded speed limit");
    expect(cases[0].offences[0].reportingRestriction).toBe(false);
  });

  it("should handle missing accused", () => {
    const json: SjpJson = {
      document: { publicationDate: "2025-11-28T09:00:00Z" },
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                session: [
                  {
                    sittings: [
                      {
                        hearing: [
                          {
                            case: [{ caseUrn: "REF123" }],
                            party: [
                              {
                                partyRole: "PROSECUTOR",
                                organisationDetails: {
                                  organisationName: "CPS"
                                }
                              }
                            ],
                            offence: []
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

    const cases = extractPressCases(json);
    expect(cases[0].name).toBe("Unknown");
    expect(cases[0].postcode).toBeNull();
    expect(cases[0].address).toBeNull();
  });

  it("should handle organisation as accused", () => {
    const json: SjpJson = {
      document: { publicationDate: "2025-11-28T09:00:00Z" },
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                session: [
                  {
                    sittings: [
                      {
                        hearing: [
                          {
                            case: [{ caseUrn: "REF123" }],
                            party: [
                              {
                                partyRole: "ACCUSED",
                                organisationDetails: {
                                  organisationName: "Acme Corp",
                                  address: {
                                    postCode: "M1 1AA"
                                  }
                                }
                              }
                            ],
                            offence: []
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

    const cases = extractPressCases(json);
    expect(cases[0].name).toBe("Acme Corp");
    expect(cases[0].postcode).toBe("M1");
  });

  it("should extract postcode outward code correctly", () => {
    const testCases = [
      { input: "SW1A 1AA", expected: "SW1A" },
      { input: "M1 1AA", expected: "M1" },
      { input: "EC1A 1BB", expected: "EC1A" },
      { input: "BS8 1TH", expected: "BS8" }
    ];

    for (const { input, expected } of testCases) {
      const json: SjpJson = {
        document: { publicationDate: "2025-11-28T09:00:00Z" },
        courtLists: [
          {
            courtHouse: {
              courtRoom: [
                {
                  session: [
                    {
                      sittings: [
                        {
                          hearing: [
                            {
                              case: [{ caseUrn: "REF123" }],
                              party: [
                                {
                                  partyRole: "ACCUSED",
                                  individualDetails: {
                                    individualSurname: "Test",
                                    address: {
                                      postCode: input
                                    }
                                  }
                                }
                              ],
                              offence: []
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

      const cases = extractPressCases(json);
      expect(cases[0].postcode).toBe(expected);
    }
  });

  it("should parse date of birth correctly", () => {
    const json: SjpJson = {
      document: { publicationDate: "2025-11-28T09:00:00Z" },
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                session: [
                  {
                    sittings: [
                      {
                        hearing: [
                          {
                            case: [{ caseUrn: "REF123" }],
                            party: [
                              {
                                partyRole: "ACCUSED",
                                individualDetails: {
                                  individualSurname: "Doe",
                                  dateOfBirth: "15/05/1985"
                                }
                              }
                            ],
                            offence: []
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

    const cases = extractPressCases(json);
    expect(cases[0].dateOfBirth).toBeInstanceOf(Date);
    expect(cases[0].dateOfBirth?.getFullYear()).toBe(1985);
    expect(cases[0].dateOfBirth?.getMonth()).toBe(4); // May is month 4 (0-indexed)
    expect(cases[0].dateOfBirth?.getDate()).toBe(15);
  });

  it("should read age from input JSON", () => {
    const json: SjpJson = {
      document: { publicationDate: "2025-11-28T09:00:00Z" },
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                session: [
                  {
                    sittings: [
                      {
                        hearing: [
                          {
                            case: [{ caseUrn: "REF123" }],
                            party: [
                              {
                                partyRole: "ACCUSED",
                                individualDetails: {
                                  individualSurname: "Doe",
                                  dateOfBirth: "01/01/1990",
                                  age: 35
                                }
                              }
                            ],
                            offence: []
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

    const cases = extractPressCases(json);
    expect(cases[0].age).toBe(35);
  });

  it("should handle missing prosecutor", () => {
    const json: SjpJson = {
      document: { publicationDate: "2025-11-28T09:00:00Z" },
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                session: [
                  {
                    sittings: [
                      {
                        hearing: [
                          {
                            case: [{ caseUrn: "REF123" }],
                            party: [
                              {
                                partyRole: "ACCUSED",
                                individualDetails: {
                                  individualSurname: "Doe"
                                }
                              }
                            ],
                            offence: []
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

    const cases = extractPressCases(json);
    expect(cases[0].prosecutor).toBeNull();
  });

  it("should handle multiple offences", () => {
    const json: SjpJson = {
      document: { publicationDate: "2025-11-28T09:00:00Z" },
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                session: [
                  {
                    sittings: [
                      {
                        hearing: [
                          {
                            case: [{ caseUrn: "REF123" }],
                            party: [
                              {
                                partyRole: "ACCUSED",
                                individualDetails: {
                                  individualSurname: "Doe"
                                }
                              }
                            ],
                            offence: [
                              {
                                offenceTitle: "Speeding",
                                offenceWording: "Exceeded speed limit"
                              },
                              {
                                offenceTitle: "No insurance"
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

    const cases = extractPressCases(json);
    expect(cases[0].offences).toHaveLength(2);
    expect(cases[0].offences[0].offenceTitle).toBe("Speeding");
    expect(cases[0].offences[1].offenceTitle).toBe("No insurance");
  });

  describe("date of birth parsing", () => {
    it.each([
      { input: "13/01/1990", expected: [1990, 1, 13], raw: "13/01/1990" },
      { input: "1/2/1990", expected: [1990, 2, 1], raw: "1/2/1990" },
      { input: "1990-01-13", expected: [1990, 1, 13], raw: "1990-01-13" },
      { input: "01-01-1901", expected: [1901, 1, 1], raw: "01-01-1901" },
      { input: "01-02-1990", expected: [1990, 2, 1], raw: "01-02-1990" },
      { input: "13-01-1990", expected: [1990, 1, 13], raw: "13-01-1990" },
      { input: "29/02/1992", expected: [1992, 2, 29], raw: "29/02/1992" },
      { input: " 13/01/1990 ", expected: [1990, 1, 13], raw: "13/01/1990" },
      { input: "31/02/1990", expected: null, raw: "31/02/1990" },
      { input: "29/02/1991", expected: null, raw: "29/02/1991" },
      { input: "00/01/1990", expected: null, raw: "00/01/1990" },
      { input: "13/13/1990", expected: null, raw: "13/13/1990" },
      { input: "1990-01-13T00:00:00Z", expected: null, raw: "1990-01-13T00:00:00Z" },
      { input: "01/02/90", expected: null, raw: "01/02/90" },
      { input: "unknown", expected: null, raw: "unknown" },
      { input: "   ", expected: null, raw: null },
      { input: "", expected: null, raw: null },
      { input: undefined, expected: null, raw: null }
    ])("should parse $input as $expected and keep $raw as sent", ({ input, expected, raw }) => {
      // Arrange
      const json = createMockJsonWithDob(input);

      // Act
      const [pressCase] = extractPressCases(json);

      // Assert
      const parsed = pressCase.dateOfBirth && [pressCase.dateOfBirth.getFullYear(), pressCase.dateOfBirth.getMonth() + 1, pressCase.dateOfBirth.getDate()];
      expect(parsed).toEqual(expected);
      expect(pressCase.rawDateOfBirth).toBe(raw);
    });

    describe("in a timezone behind UTC", () => {
      const originalTz = process.env.TZ;

      beforeEach(() => {
        // Behind UTC, a UTC-midnight date would fall on the previous local day
        process.env.TZ = "America/New_York";
      });

      afterEach(() => {
        process.env.TZ = originalTz;
      });

      it.each(["13/01/1990", "1990-01-13", "13-01-1990"])("should build %s at local midnight on the same day", (input) => {
        // Arrange
        const json = createMockJsonWithDob(input);

        // Act
        const [pressCase] = extractPressCases(json);

        // Assert
        expect(pressCase.dateOfBirth?.getTime()).toBe(new Date(1990, 0, 13).getTime());
        expect(pressCase.dateOfBirth?.getDate()).toBe(13);
      });
    });
  });
});

describe("extractPublicCases", () => {
  it("should extract public cases with limited details", () => {
    const json = createMockJson(true);
    const cases = extractPublicCases(json);

    expect(cases).toHaveLength(1);
    expect(cases[0].name).toBe("Mr John Doe");
    expect(cases[0].postcode).toBe("SW1A");
    expect(cases[0].prosecutor).toBe("CPS");
    expect(cases[0].offence).toBe("Speeding");

    expect(cases[0]).not.toHaveProperty("dateOfBirth");
    expect(cases[0]).not.toHaveProperty("address");
    expect(cases[0]).not.toHaveProperty("reference");
    expect(cases[0]).not.toHaveProperty("offences");
  });

  it("should use offence wording when title is not available", () => {
    const json: SjpJson = {
      document: { publicationDate: "2025-11-28T09:00:00Z" },
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                session: [
                  {
                    sittings: [
                      {
                        hearing: [
                          {
                            case: [{ caseUrn: "REF123" }],
                            party: [
                              {
                                partyRole: "ACCUSED",
                                individualDetails: {
                                  individualSurname: "Doe"
                                }
                              }
                            ],
                            offence: [
                              {
                                offenceWording: "Test offence wording"
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

    const cases = extractPublicCases(json);
    expect(cases[0].offence).toBe("Test offence wording");
  });

  it("should return null offence when no offences present", () => {
    const json: SjpJson = {
      document: { publicationDate: "2025-11-28T09:00:00Z" },
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                session: [
                  {
                    sittings: [
                      {
                        hearing: [
                          {
                            case: [{ caseUrn: "REF123" }],
                            party: [
                              {
                                partyRole: "ACCUSED",
                                individualDetails: {
                                  individualSurname: "Doe"
                                }
                              }
                            ],
                            offence: []
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

    const cases = extractPublicCases(json);
    expect(cases[0].offence).toBeNull();
  });
});
