import { describe, expect, it, vi } from "vitest";
import { extractCaseSummary } from "./summary-builder.js";

vi.mock("@hmcts/list-types-common", () => ({
  formatCaseSummaryForEmail: vi.fn()
}));

const jsonData = {
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
                      case: [
                        { caseno: "1234567890", def_name: "SMITH, John" },
                        { caseno: "0987654321", def_name: "JONES, Jane" }
                      ]
                    }
                  },
                  {
                    bstart: "10:30",
                    cases: {
                      case: [{ caseno: "1122334455", def_name: "BROWN, Bob" }]
                    }
                  }
                ]
              }
            },
            {
              lja: "Lancashire",
              court: "Preston Crown Court",
              room: 2,
              sstart: "10:00",
              blocks: {
                block: [
                  {
                    bstart: "10:00",
                    cases: {
                      case: [{ caseno: "9988776655", def_name: "WHITE, Alice" }]
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

describe("extractCaseSummary", () => {
  it("should extract Defendant Name and Case Number for each case", () => {
    const result = extractCaseSummary(jsonData);
    expect(result[0]).toEqual([
      { label: "Defendant Name", value: "SMITH, John" },
      { label: "Case Number", value: "1234567890" }
    ]);
  });

  it("should extract all cases across all sessions and blocks", () => {
    const result = extractCaseSummary(jsonData);
    expect(result).toHaveLength(4);
  });

  it("should extract cases from multiple sessions", () => {
    const result = extractCaseSummary(jsonData);
    const lastCase = result[3];
    expect(lastCase).toEqual([
      { label: "Defendant Name", value: "WHITE, Alice" },
      { label: "Case Number", value: "9988776655" }
    ]);
  });

  it("should return empty array when no sessions present", () => {
    const empty = { document: { data: { job: { printdate: "13/09/2020", sessions: {} } } } };
    const result = extractCaseSummary(empty);
    expect(result).toHaveLength(0);
  });

  it("should handle missing def_name and caseno gracefully", () => {
    const partial = {
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
                  blocks: { block: [{ bstart: "09:00", cases: { case: [{}] } }] }
                }
              ]
            }
          }
        }
      }
    };
    const result = extractCaseSummary(partial);
    expect(result[0]).toEqual([
      { label: "Defendant Name", value: "" },
      { label: "Case Number", value: "" }
    ]);
  });
});
