import { describe, expect, it } from "vitest";
import { validateMagistratesPublicList } from "./json-validator.js";

const validMinimalData = {
  document: { publicationDate: "2020-09-13T23:30:00Z" },
  venue: {
    venueAddress: {
      line: ["THE LAW COURTS"],
      postCode: "PR1 2LL"
    }
  },
  courtLists: []
};

describe("validateMagistratesPublicList", () => {
  describe("valid data", () => {
    it("should accept minimal valid document", () => {
      const result = validateMagistratesPublicList(validMinimalData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept valid data with full court list structure", () => {
      const result = validateMagistratesPublicList({
        ...validMinimalData,
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
                          sittingStart: "2020-09-13T09:00:00Z",
                          hearing: [
                            {
                              hearingType: "Trial",
                              case: [
                                {
                                  caseUrn: "URN001",
                                  party: [
                                    {
                                      partyRole: "DEFENDANT",
                                      individualDetails: {
                                        individualForenames: "John",
                                        individualSurname: "Smith"
                                      },
                                      offence: [{ offenceTitle: "Drink driving" }]
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
      expect(result.isValid).toBe(true);
    });
  });

  describe("required fields", () => {
    it("should reject missing document", () => {
      const result = validateMagistratesPublicList({ venue: validMinimalData.venue, courtLists: [] });
      expect(result.isValid).toBe(false);
    });

    it("should reject missing venue", () => {
      const result = validateMagistratesPublicList({ document: validMinimalData.document, courtLists: [] });
      expect(result.isValid).toBe(false);
    });

    it("should reject missing courtLists", () => {
      const result = validateMagistratesPublicList({ document: validMinimalData.document, venue: validMinimalData.venue });
      expect(result.isValid).toBe(false);
    });

    it("should reject missing publicationDate in document", () => {
      const result = validateMagistratesPublicList({ ...validMinimalData, document: {} });
      expect(result.isValid).toBe(false);
    });

    it("should reject missing line in venueAddress", () => {
      const result = validateMagistratesPublicList({
        ...validMinimalData,
        venue: { venueAddress: { postCode: "PR1 2LL" } }
      });
      expect(result.isValid).toBe(false);
    });

    it("should reject missing postCode in venueAddress", () => {
      const result = validateMagistratesPublicList({
        ...validMinimalData,
        venue: { venueAddress: { line: ["THE LAW COURTS"] } }
      });
      expect(result.isValid).toBe(false);
    });

    it("should reject missing caseUrn in case", () => {
      const result = validateMagistratesPublicList(buildDataWithCase({ party: [] }));
      expect(result.isValid).toBe(false);
    });

    it("should reject missing sittingStart in sitting", () => {
      const result = validateMagistratesPublicList(buildDataWithSitting({ hearing: [] }));
      expect(result.isValid).toBe(false);
    });

    it("should reject missing courtRoomName in courtRoom", () => {
      const result = validateMagistratesPublicList({
        ...validMinimalData,
        courtLists: [
          {
            courtHouse: {
              courtRoom: [{ session: [] }]
            }
          }
        ]
      });
      expect(result.isValid).toBe(false);
    });

    it("should reject missing applicationReference in application", () => {
      const result = validateMagistratesPublicList(buildDataWithApplication({ applicationType: "bail" }));
      expect(result.isValid).toBe(false);
    });
  });

  describe("publicationDate format", () => {
    it("should reject date-only publicationDate", () => {
      const result = validateMagistratesPublicList({
        ...validMinimalData,
        document: { publicationDate: "2020-09-13" }
      });
      expect(result.isValid).toBe(false);
    });

    it("should reject datetime without Z suffix", () => {
      const result = validateMagistratesPublicList({
        ...validMinimalData,
        document: { publicationDate: "2020-09-13T23:30:00" }
      });
      expect(result.isValid).toBe(false);
    });

    it("should accept datetime with fractional seconds", () => {
      const result = validateMagistratesPublicList({
        ...validMinimalData,
        document: { publicationDate: "2020-09-13T23:30:52.123Z" }
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe("HTML injection protection", () => {
    it("should reject HTML tags in courtRoomName", () => {
      const result = validateMagistratesPublicList({
        ...validMinimalData,
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

    it("should reject HTML tags in hearingType", () => {
      const result = validateMagistratesPublicList(
        buildDataWithSitting({
          sittingStart: "2020-09-13T09:00:00Z",
          hearing: [{ hearingType: "<script>xss</script>", case: [], application: [] }]
        })
      );
      expect(result.isValid).toBe(false);
    });
  });

  // The party $def uses an "items" block on an "object" type, copied verbatim from
  // pip-data-management. JSON Schema 2020-12 evaluates "items" only on arrays, so
  // property-level patterns inside the party def (partyRole, organisationName, etc.)
  // are not applied. The organisationName pattern was fixed from the Java-only (?s)
  // flag to JS-compatible syntax so the schema compiles without a regex error.
  describe("organisationName pattern (fixed from Java (?s) to JS-compatible)", () => {
    it("should not throw when the schema is loaded", () => {
      // If the original (?s) flag were still present, AJV would throw
      // "Invalid regular expression: Invalid group" on schema compilation.
      // A successful validator call confirms the pattern is valid JavaScript.
      expect(() => validateMagistratesPublicList(validMinimalData)).not.toThrow();
    });

    it("should accept a valid organisation name", () => {
      const result = validateMagistratesPublicList(buildDataWithOrgName("A & B Solicitors"));
      expect(result.isValid).toBe(true);
    });
  });
});

function buildDataWithOrgName(organisationName: string) {
  return buildDataWithCase({
    caseUrn: "URN001",
    party: [{ partyRole: "DEFENDANT", organisationDetails: { organisationName } }]
  });
}

function buildDataWithCase(caseData: object) {
  return buildDataWithSitting({
    sittingStart: "2020-09-13T09:00:00Z",
    hearing: [{ case: [caseData], application: [] }]
  });
}

function buildDataWithApplication(applicationData: object) {
  return buildDataWithSitting({
    sittingStart: "2020-09-13T09:00:00Z",
    hearing: [{ case: [], application: [applicationData] }]
  });
}

function buildDataWithSitting(sittingData: object) {
  return {
    ...validMinimalData,
    courtLists: [
      {
        courtHouse: {
          courtRoom: [
            {
              courtRoomName: "Room 1",
              session: [{ sittings: [sittingData] }]
            }
          ]
        }
      }
    ]
  };
}
