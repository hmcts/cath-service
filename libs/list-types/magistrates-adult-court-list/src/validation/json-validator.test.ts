import { describe, expect, it } from "vitest";
import { validateMagistratesAdultCourtList } from "./json-validator.js";

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

describe("validateMagistratesAdultCourtList", () => {
  describe("valid data", () => {
    it("should accept minimal valid document", () => {
      const result = validateMagistratesAdultCourtList(validMinimalData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept valid data with full court list structure", () => {
      const result = validateMagistratesAdultCourtList({
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
                                  blockStart: "2020-09-13T09:00:00Z",
                                  defendantName: "Smith, John",
                                  dateOfBirth: "1990-01-01",
                                  address: "1 Example Street",
                                  age: "30",
                                  informant: "Crown Prosecution Service",
                                  caseNumber: "AB12345678",
                                  offenceCode: "RT88191",
                                  offenceTitle: "Drink driving",
                                  offenceSummary: "On 01/01/2020 drove a motor vehicle"
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

    it("should accept case with only required fields", () => {
      const result = validateMagistratesAdultCourtList(
        buildDataWithCase({
          defendantName: "Jones, Mary",
          caseNumber: "CD98765432",
          offenceCode: "TH68001",
          offenceTitle: "Theft"
        })
      );
      expect(result.isValid).toBe(true);
    });

    it("should accept datetime with fractional seconds", () => {
      const result = validateMagistratesAdultCourtList({
        ...validMinimalData,
        document: { publicationDate: "2020-09-13T23:30:52.123Z" }
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe("required fields", () => {
    it("should reject missing document", () => {
      const result = validateMagistratesAdultCourtList({ venue: validMinimalData.venue, courtLists: [] });
      expect(result.isValid).toBe(false);
    });

    it("should reject missing venue", () => {
      const result = validateMagistratesAdultCourtList({ document: validMinimalData.document, courtLists: [] });
      expect(result.isValid).toBe(false);
    });

    it("should reject missing courtLists", () => {
      const result = validateMagistratesAdultCourtList({ document: validMinimalData.document, venue: validMinimalData.venue });
      expect(result.isValid).toBe(false);
    });

    it("should reject missing publicationDate in document", () => {
      const result = validateMagistratesAdultCourtList({ ...validMinimalData, document: {} });
      expect(result.isValid).toBe(false);
    });

    it("should reject missing line in venueAddress", () => {
      const result = validateMagistratesAdultCourtList({
        ...validMinimalData,
        venue: { venueAddress: { postCode: "PR1 2LL" } }
      });
      expect(result.isValid).toBe(false);
    });

    it("should reject missing postCode in venueAddress", () => {
      const result = validateMagistratesAdultCourtList({
        ...validMinimalData,
        venue: { venueAddress: { line: ["THE LAW COURTS"] } }
      });
      expect(result.isValid).toBe(false);
    });

    it("should reject missing courtRoomName in courtRoom", () => {
      const result = validateMagistratesAdultCourtList({
        ...validMinimalData,
        courtLists: [{ courtHouse: { courtRoom: [{ session: [] }] } }]
      });
      expect(result.isValid).toBe(false);
    });

    it("should reject missing sittingStart in sitting", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithSitting({ hearing: [] }));
      expect(result.isValid).toBe(false);
    });

    it("should reject case missing defendantName", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithCase({ caseNumber: "AB123", offenceCode: "RT001", offenceTitle: "Speeding" }));
      expect(result.isValid).toBe(false);
    });

    it("should reject case missing caseNumber", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithCase({ defendantName: "Smith, John", offenceCode: "RT001", offenceTitle: "Speeding" }));
      expect(result.isValid).toBe(false);
    });

    it("should reject case missing offenceCode", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithCase({ defendantName: "Smith, John", caseNumber: "AB123", offenceTitle: "Speeding" }));
      expect(result.isValid).toBe(false);
    });

    it("should reject case missing offenceTitle", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithCase({ defendantName: "Smith, John", caseNumber: "AB123", offenceCode: "RT001" }));
      expect(result.isValid).toBe(false);
    });
  });

  describe("publicationDate format", () => {
    it("should reject date-only publicationDate", () => {
      const result = validateMagistratesAdultCourtList({
        ...validMinimalData,
        document: { publicationDate: "2020-09-13" }
      });
      expect(result.isValid).toBe(false);
    });

    it("should reject datetime without Z suffix", () => {
      const result = validateMagistratesAdultCourtList({
        ...validMinimalData,
        document: { publicationDate: "2020-09-13T23:30:00" }
      });
      expect(result.isValid).toBe(false);
    });
  });

  describe("HTML injection protection", () => {
    it("should reject HTML tags in courtRoomName", () => {
      const result = validateMagistratesAdultCourtList({
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

    it("should reject HTML tags in defendantName", () => {
      const result = validateMagistratesAdultCourtList(
        buildDataWithCase({
          defendantName: "<b>Smith</b>",
          caseNumber: "AB123",
          offenceCode: "RT001",
          offenceTitle: "Speeding"
        })
      );
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in offenceTitle", () => {
      const result = validateMagistratesAdultCourtList(
        buildDataWithCase({
          defendantName: "Smith, John",
          caseNumber: "AB123",
          offenceCode: "RT001",
          offenceTitle: "<script>xss</script>"
        })
      );
      expect(result.isValid).toBe(false);
    });
  });
});

function buildDataWithCase(caseData: object) {
  return buildDataWithSitting({
    sittingStart: "2020-09-13T09:00:00Z",
    hearing: [{ case: [caseData] }]
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
