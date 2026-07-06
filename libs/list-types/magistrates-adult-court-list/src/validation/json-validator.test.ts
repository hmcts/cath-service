import { describe, expect, it } from "vitest";
import { validateMagistratesAdultCourtList } from "./json-validator.js";

const validMinimalData = {
  document: {
    data: {
      job: {
        printdate: "01/01/2020"
      }
    }
  }
};

describe("validateMagistratesAdultCourtList", () => {
  describe("valid data", () => {
    it("should accept minimal valid document", () => {
      const result = validateMagistratesAdultCourtList(validMinimalData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept valid data with full structure", () => {
      const result = validateMagistratesAdultCourtList({
        document: {
          info: { start_time: "09:00:00" },
          data: {
            job: {
              printdate: "01/01/2020",
              sessions: {
                session: [
                  {
                    lja: "Local Justice Area",
                    court: "Courthouse Name",
                    room: 1,
                    sstart: "09:00",
                    blocks: {
                      block: [
                        {
                          bstart: "09:00",
                          cases: {
                            case: [
                              {
                                caseno: "AB12345678",
                                def_name: "Smith, John",
                                def_dob: "01/01/1990",
                                def_age: 30,
                                def_addr: { line1: "1 Example Street" },
                                inf: "Crown Prosecution Service",
                                offences: {
                                  offence: [
                                    {
                                      code: "RT88191",
                                      title: "Drink driving",
                                      sum: "On 01/01/2020 drove a motor vehicle",
                                      cy_title: "Gyrru dan ddylanwad alcohol",
                                      cy_sum: "Ar 01/01/2020 gyrrwyd cerbyd modur"
                                    }
                                  ]
                                }
                              }
                            ]
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      });
      expect(result.isValid).toBe(true);
    });

    it("should accept case with only required fields", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithCase({ caseno: "AB12345678", def_name: "Jones, Mary" }));
      expect(result.isValid).toBe(true);
    });
  });

  describe("required fields", () => {
    it("should reject missing document", () => {
      const result = validateMagistratesAdultCourtList({});
      expect(result.isValid).toBe(false);
    });

    it("should reject missing job in data", () => {
      const result = validateMagistratesAdultCourtList({ document: { data: {} } });
      expect(result.isValid).toBe(false);
    });

    it("should reject missing printdate in job", () => {
      const result = validateMagistratesAdultCourtList({ document: { data: { job: {} } } });
      expect(result.isValid).toBe(false);
    });

    it("should reject session missing lja", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithSession({ court: "Court", room: 1, sstart: "09:00" }));
      expect(result.isValid).toBe(false);
    });

    it("should reject session missing court", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithSession({ lja: "LJA", room: 1, sstart: "09:00" }));
      expect(result.isValid).toBe(false);
    });

    it("should reject session missing room", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithSession({ lja: "LJA", court: "Court", sstart: "09:00" }));
      expect(result.isValid).toBe(false);
    });

    it("should reject session missing sstart", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithSession({ lja: "LJA", court: "Court", room: 1 }));
      expect(result.isValid).toBe(false);
    });

    it("should reject block missing bstart", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithBlock({}));
      expect(result.isValid).toBe(false);
    });

    it("should reject case missing caseno", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithCase({ def_name: "Smith, John" }));
      expect(result.isValid).toBe(false);
    });

    it("should reject case missing def_name", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithCase({ caseno: "AB12345678" }));
      expect(result.isValid).toBe(false);
    });

    it("should reject offence missing code", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithOffence({ title: "Drink driving", sum: "On 01/01/2020..." }));
      expect(result.isValid).toBe(false);
    });

    it("should reject offence missing title", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithOffence({ code: "RT88191", sum: "On 01/01/2020..." }));
      expect(result.isValid).toBe(false);
    });

    it("should reject offence missing sum", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithOffence({ code: "RT88191", title: "Drink driving" }));
      expect(result.isValid).toBe(false);
    });
  });

  describe("field format validation", () => {
    it("should reject printdate not in DD/MM/YYYY format", () => {
      const result = validateMagistratesAdultCourtList({ document: { data: { job: { printdate: "2020-01-01" } } } });
      expect(result.isValid).toBe(false);
    });

    it("should reject start_time not in hh:mm:ss format", () => {
      const result = validateMagistratesAdultCourtList({
        document: { info: { start_time: "09:00" }, data: { job: { printdate: "01/01/2020" } } }
      });
      expect(result.isValid).toBe(false);
    });

    it("should reject sstart not in hh:mm format", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithSession({ lja: "LJA", court: "Court", room: 1, sstart: "09:00:00" }));
      expect(result.isValid).toBe(false);
    });

    it("should reject bstart not in hh:mm format", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithBlock({ bstart: "09:00:00" }));
      expect(result.isValid).toBe(false);
    });

    it("should reject def_dob not in dd/mm/yyyy format", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithCase({ caseno: "AB12345678", def_name: "Smith, John", def_dob: "1990-01-01" }));
      expect(result.isValid).toBe(false);
    });

    it("should reject caseno shorter than 10 characters", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithCase({ caseno: "AB123", def_name: "Smith, John" }));
      expect(result.isValid).toBe(false);
    });

    it("should reject caseno longer than 10 characters", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithCase({ caseno: "AB1234567890", def_name: "Smith, John" }));
      expect(result.isValid).toBe(false);
    });

    it("should reject room as non-integer", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithSession({ lja: "LJA", court: "Court", room: "1", sstart: "09:00" }));
      expect(result.isValid).toBe(false);
    });
  });

  describe("HTML injection protection", () => {
    it("should reject HTML tags in lja", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithSession({ lja: "<script>alert(1)</script>", court: "Court", room: 1, sstart: "09:00" }));
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in court", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithSession({ lja: "LJA", court: "<b>Court</b>", room: 1, sstart: "09:00" }));
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in def_name", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithCase({ caseno: "AB12345678", def_name: "<b>Smith</b>" }));
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in offence title", () => {
      const result = validateMagistratesAdultCourtList(buildDataWithOffence({ code: "RT88191", title: "<script>xss</script>", sum: "Summary" }));
      expect(result.isValid).toBe(false);
    });
  });
});

function buildDataWithOffence(offenceData: object) {
  return buildDataWithCase({
    caseno: "AB12345678",
    def_name: "Smith, John",
    offences: { offence: [offenceData] }
  });
}

function buildDataWithCase(caseData: object) {
  return buildDataWithBlock({
    bstart: "09:00",
    cases: { case: [caseData] }
  });
}

function buildDataWithBlock(blockData: object) {
  return buildDataWithSession({
    lja: "Local Justice Area",
    court: "Courthouse Name",
    room: 1,
    sstart: "09:00",
    blocks: { block: [blockData] }
  });
}

function buildDataWithSession(sessionData: object) {
  return {
    document: {
      data: {
        job: {
          printdate: "01/01/2020",
          sessions: { session: [sessionData] }
        }
      }
    }
  };
}
