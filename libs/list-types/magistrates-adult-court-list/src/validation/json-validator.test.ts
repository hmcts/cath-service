import { describe, expect, it } from "vitest";
import { validateMagistratesAdultCourtList } from "./json-validator.js";

const validMinimalData = {
  document: {}
};

const validFullData = {
  document: {
    info: { start_time: "09:00:00" },
    data: {
      job: {
        printdate: "13/09/2020",
        sessions: {
          session: [
            {
              lja: "North Northumbria Magistrates' Court",
              court: "North Shields Magistrates' Court",
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
                          def_age: 35,
                          def_addr: { line1: "1 Example Street", line5: "London", pcode: "SW1A 1AA" },
                          inf: "Crown Prosecution Service",
                          offences: {
                            offence: [{ code: "RT88191", title: "Drink driving", sum: "On 01/01/2020 drove..." }]
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
};

describe("validateMagistratesAdultCourtList", () => {
  describe("valid data", () => {
    it("should accept minimal valid document", () => {
      const result = validateMagistratesAdultCourtList(validMinimalData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept valid data with full proprietary structure", () => {
      const result = validateMagistratesAdultCourtList(validFullData);
      expect(result.isValid).toBe(true);
    });

    it("should accept document without data", () => {
      const result = validateMagistratesAdultCourtList({ document: {} });
      expect(result.isValid).toBe(true);
    });

    it("should accept document with sessions but no cases", () => {
      const result = validateMagistratesAdultCourtList({
        document: {
          data: {
            job: {
              printdate: "01/01/2020",
              sessions: { session: [{ court: "Test Court", lja: "Test LJA", room: 1, sstart: "09:00", blocks: { block: [] } }] }
            }
          }
        }
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
  });

  describe("HTML injection protection", () => {
    it("should reject HTML tags in def_name", () => {
      const result = validateMagistratesAdultCourtList({
        document: {
          data: {
            job: {
              sessions: {
                session: [
                  {
                    court: "Test Court",
                    blocks: {
                      block: [{ bstart: "09:00", cases: { case: [{ def_name: "<script>alert(1)</script>" }] } }]
                    }
                  }
                ]
              }
            }
          }
        }
      });
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in court", () => {
      const result = validateMagistratesAdultCourtList({
        document: {
          data: {
            job: {
              sessions: { session: [{ court: "<b>Test Court</b>", blocks: { block: [] } }] }
            }
          }
        }
      });
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in lja", () => {
      const result = validateMagistratesAdultCourtList({
        document: {
          data: {
            job: {
              sessions: { session: [{ lja: "<script>xss</script>", court: "Test Court", blocks: { block: [] } }] }
            }
          }
        }
      });
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in offence title", () => {
      const result = validateMagistratesAdultCourtList({
        document: {
          data: {
            job: {
              sessions: {
                session: [
                  {
                    court: "Test Court",
                    blocks: {
                      block: [
                        {
                          bstart: "09:00",
                          cases: {
                            case: [{ offences: { offence: [{ title: "<script>xss</script>" }] } }]
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
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in informant", () => {
      const result = validateMagistratesAdultCourtList({
        document: {
          data: {
            job: {
              sessions: {
                session: [
                  {
                    court: "Test Court",
                    blocks: {
                      block: [{ bstart: "09:00", cases: { case: [{ inf: "<b>CPS</b>" }] } }]
                    }
                  }
                ]
              }
            }
          }
        }
      });
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in address line", () => {
      const result = validateMagistratesAdultCourtList({
        document: {
          data: {
            job: {
              sessions: {
                session: [
                  {
                    court: "Test Court",
                    blocks: {
                      block: [
                        {
                          bstart: "09:00",
                          cases: { case: [{ def_addr: { line1: "<script>alert(1)</script>" } }] }
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
      expect(result.isValid).toBe(false);
    });
  });
});
