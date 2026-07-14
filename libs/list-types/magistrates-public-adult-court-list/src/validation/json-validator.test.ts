import { describe, expect, it } from "vitest";
import { validateMagistratesPublicAdultCourtList } from "./json-validator.js";

const validPayload = {
  document: {
    data: {
      job: {
        printdate: "13/09/2020",
        sessions: {
          session: [
            {
              lja: "Greater Manchester",
              court: "Manchester Crown Court",
              room: 1,
              sstart: "09:00",
              blocks: {
                block: [
                  {
                    bstart: "09:00",
                    cases: {
                      case: [{ caseno: "1234567890", def_name: "SMITH, John" }]
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

describe("validateMagistratesPublicAdultCourtList", () => {
  it("should return isValid true for a valid payload", () => {
    const result = validateMagistratesPublicAdultCourtList(validPayload);
    expect(result.isValid).toBe(true);
  });

  it("should return isValid false when document is missing", () => {
    const result = validateMagistratesPublicAdultCourtList({});
    expect(result.isValid).toBe(false);
  });

  it("should return isValid false when job.printdate is missing", () => {
    const payload = { document: { data: { job: { sessions: {} } } } };
    const result = validateMagistratesPublicAdultCourtList(payload);
    expect(result.isValid).toBe(false);
  });

  it("should return isValid false when session is missing required lja field", () => {
    const payload = {
      document: {
        data: {
          job: {
            printdate: "13/09/2020",
            sessions: {
              session: [{ court: "Test Court", room: 1, sstart: "09:00" }]
            }
          }
        }
      }
    };
    const result = validateMagistratesPublicAdultCourtList(payload);
    expect(result.isValid).toBe(false);
  });

  it("should return isValid false when def_name contains HTML", () => {
    const payload = {
      document: {
        data: {
          job: {
            printdate: "13/09/2020",
            sessions: {
              session: [
                {
                  lja: "Test",
                  court: "Test",
                  room: 1,
                  sstart: "09:00",
                  blocks: {
                    block: [
                      {
                        bstart: "09:00",
                        cases: { case: [{ caseno: "1234567890", def_name: "<script>alert(1)</script>" }] }
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
    const result = validateMagistratesPublicAdultCourtList(payload);
    expect(result.isValid).toBe(false);
  });

  it("should return isValid false when caseno length is not exactly 10 characters", () => {
    const payload = {
      document: {
        data: {
          job: {
            printdate: "13/09/2020",
            sessions: {
              session: [
                {
                  lja: "Test",
                  court: "Test",
                  room: 1,
                  sstart: "09:00",
                  blocks: {
                    block: [{ bstart: "09:00", cases: { case: [{ caseno: "123", def_name: "SMITH, John" }] } }]
                  }
                }
              ]
            }
          }
        }
      }
    };
    const result = validateMagistratesPublicAdultCourtList(payload);
    expect(result.isValid).toBe(false);
  });
});
