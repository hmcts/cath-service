import { describe, expect, it } from "vitest";
import { validateMagistratesAdultCourtList } from "./json-validator.js";

const validMinimalData = {
  document: {}
};

const validFullData = {
  document: {
    publicationDate: "2020-09-13T23:30:00Z"
  },
  venue: {
    venueAddress: {
      line: ["THE LAW COURTS", "Main Road"],
      postCode: "PR1 2LL"
    }
  },
  courtLists: [
    {
      courtHouse: {
        courtHouseName: "Oxford Combined Court Centre",
        courtRoom: [
          {
            courtRoomName: "CourtRoom 1",
            session: [
              {
                judiciary: [{ johKnownAs: "Judge Smith" }],
                sittings: [
                  {
                    sittingStart: "2022-07-27T09:40:00Z",
                    hearing: [
                      {
                        hearingType: "Directions",
                        case: [
                          {
                            caseUrn: "12341234",
                            party: [
                              {
                                partyRole: "PROSECUTING_AUTHORITY",
                                organisationDetails: { organisationName: "Crown Prosecution Service" }
                              },
                              {
                                partyRole: "DEFENDANT",
                                individualDetails: {
                                  individualForenames: "John",
                                  individualSurname: "Smith"
                                },
                                offence: [{ offenceTitle: "Drink driving" }]
                              }
                            ],
                            reportingRestriction: true
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

describe("validateMagistratesAdultCourtList", () => {
  describe("valid data", () => {
    it("should accept minimal valid document", () => {
      const result = validateMagistratesAdultCourtList(validMinimalData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept valid data with full structure", () => {
      const result = validateMagistratesAdultCourtList(validFullData);
      expect(result.isValid).toBe(true);
    });

    it("should accept document without publicationDate", () => {
      const result = validateMagistratesAdultCourtList({ document: {} });
      expect(result.isValid).toBe(true);
    });

    it("should accept courtLists without cases", () => {
      const result = validateMagistratesAdultCourtList({
        document: {},
        courtLists: [{ courtHouse: { courtRoom: [] } }]
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe("required fields", () => {
    it("should reject missing document", () => {
      const result = validateMagistratesAdultCourtList({});
      expect(result.isValid).toBe(false);
    });

    it("should reject document as non-object", () => {
      const result = validateMagistratesAdultCourtList({ document: "not an object" });
      expect(result.isValid).toBe(false);
    });

    it("should reject courtLists item without courtHouse", () => {
      const result = validateMagistratesAdultCourtList({
        document: {},
        courtLists: [{}]
      });
      expect(result.isValid).toBe(false);
    });
  });

  describe("HTML injection protection", () => {
    it("should reject HTML tags in courtRoomName", () => {
      const result = validateMagistratesAdultCourtList({
        document: {},
        courtLists: [
          {
            courtHouse: {
              courtRoom: [{ courtRoomName: "<script>alert(1)</script>", session: [] }]
            }
          }
        ]
      });
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in johKnownAs", () => {
      const result = validateMagistratesAdultCourtList({
        document: {},
        courtLists: [
          {
            courtHouse: {
              courtRoom: [
                {
                  courtRoomName: "Room 1",
                  session: [{ judiciary: [{ johKnownAs: "<b>Judge</b>" }], sittings: [] }]
                }
              ]
            }
          }
        ]
      });
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in offenceTitle", () => {
      const result = validateMagistratesAdultCourtList({
        document: {},
        courtLists: [
          {
            courtHouse: {
              courtRoom: [
                {
                  courtRoomName: "Room 1",
                  session: [
                    {
                      sittings: [
                        {
                          sittingStart: "2022-07-27T09:40:00Z",
                          hearing: [
                            {
                              case: [
                                {
                                  party: [
                                    {
                                      partyRole: "DEFENDANT",
                                      offence: [{ offenceTitle: "<script>xss</script>" }]
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
      });
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in individualSurname", () => {
      const result = validateMagistratesAdultCourtList({
        document: {},
        courtLists: [
          {
            courtHouse: {
              courtRoom: [
                {
                  courtRoomName: "Room 1",
                  session: [
                    {
                      sittings: [
                        {
                          sittingStart: "2022-07-27T09:40:00Z",
                          hearing: [
                            {
                              case: [
                                {
                                  party: [
                                    {
                                      partyRole: "DEFENDANT",
                                      individualDetails: { individualSurname: "<b>Smith</b>" }
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
      });
      expect(result.isValid).toBe(false);
    });
  });
});
