import { describe, expect, it } from "vitest";
import type { MagistratesAdultCourtListData } from "../rendering/renderer.js";
import { extractCaseSummary, formatCaseSummaryForEmail } from "./summary-builder.js";

const buildMinimalData = (sessions: object[] = []): MagistratesAdultCourtListData => ({
  document: {
    data: {
      job: {
        printdate: "13/09/2025",
        sessions: { session: sessions as any }
      }
    }
  }
});

const buildSession = (cases: object[]) => ({
  lja: "Local Justice Area",
  court: "Test Court",
  room: 1,
  sstart: "10:00",
  blocks: {
    block: [
      {
        bstart: "09:00",
        cases: { case: cases }
      }
    ]
  }
});

describe("extractCaseSummary", () => {
  it("should return empty array when there are no sessions", () => {
    const result = extractCaseSummary(buildMinimalData());
    expect(result).toHaveLength(0);
  });

  it("should extract Defendant name, Informant, Case number and Offence title per case", () => {
    const data = buildMinimalData([
      buildSession([
        {
          caseno: "AB12345678",
          def_name: "Smith, John",
          inf: "Crown Prosecution Service",
          offences: {
            offence: [{ code: "RT88191", title: "Drink driving", sum: "On 01/01/2025 drove a motor vehicle" }]
          }
        }
      ])
    ]);

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Defendant name", value: "Smith, John" },
      { label: "Informant", value: "Crown Prosecution Service" },
      { label: "Case number", value: "AB12345678" },
      { label: "Offence title", value: "Drink driving" }
    ]);
  });

  it("should use empty string for missing optional fields", () => {
    const data = buildMinimalData([buildSession([{ caseno: "CD98765432", def_name: "Jones, Mary" }])]);

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0][1]).toEqual({ label: "Informant", value: "" });
    expect(result[0][3]).toEqual({ label: "Offence title", value: "" });
  });

  it("should handle multiple cases across multiple sessions", () => {
    const data = buildMinimalData([
      buildSession([{ caseno: "CASE001", def_name: "Adams, Alice", inf: "CPS", offences: { offence: [{ code: "C1", title: "Fraud", sum: "" }] } }]),
      buildSession([{ caseno: "CASE002", def_name: "Baker, Bob", inf: "Police", offences: { offence: [{ code: "C2", title: "Theft", sum: "" }] } }])
    ]);

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(2);
    expect(result[0][0]).toEqual({ label: "Defendant name", value: "Adams, Alice" });
    expect(result[1][0]).toEqual({ label: "Defendant name", value: "Baker, Bob" });
  });

  it("should use empty string for missing def_name", () => {
    const data = buildMinimalData([buildSession([{ caseno: "AB123", offences: { offence: [{ code: "RT001", title: "Speeding", sum: "" }] } }])]);

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0][0]).toEqual({ label: "Defendant name", value: "" });
  });

  it("should use empty string for missing caseno", () => {
    const data = buildMinimalData([buildSession([{ def_name: "Smith, John", offences: { offence: [{ code: "RT001", title: "Speeding", sum: "" }] } }])]);

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0][2]).toEqual({ label: "Case number", value: "" });
  });

  it("should use empty string for missing offence title", () => {
    const data = buildMinimalData([buildSession([{ caseno: "AB123", def_name: "Smith, John" }])]);

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0][3]).toEqual({ label: "Offence title", value: "" });
  });

  it("should handle multiple cases in the same block", () => {
    const data = buildMinimalData([
      buildSession([
        { caseno: "CASE001", def_name: "First, Person", offences: { offence: [{ code: "C1", title: "Speeding", sum: "" }] } },
        { caseno: "CASE002", def_name: "Second, Person", offences: { offence: [{ code: "C2", title: "Fraud", sum: "" }] } }
      ])
    ]);

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(2);
    expect(result[0][2]).toEqual({ label: "Case number", value: "CASE001" });
    expect(result[1][2]).toEqual({ label: "Case number", value: "CASE002" });
  });

  it("should join all offence titles when multiple offences exist", () => {
    const data = buildMinimalData([
      buildSession([
        {
          caseno: "AB123",
          def_name: "Smith, John",
          offences: {
            offence: [
              { code: "C1", title: "First Offence", sum: "" },
              { code: "C2", title: "Second Offence", sum: "" }
            ]
          }
        }
      ])
    ]);

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0][3]).toEqual({ label: "Offence title", value: "First Offence, Second Offence" });
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should return 'No cases scheduled.' for empty summary", () => {
    expect(formatCaseSummaryForEmail([])).toBe("No cases scheduled.");
  });

  it("should format a single case summary", () => {
    const summaries = [
      [
        { label: "Defendant name", value: "Smith, John" },
        { label: "Case number", value: "AB123" }
      ]
    ];

    const result = formatCaseSummaryForEmail(summaries);

    expect(result).toContain("Defendant name - Smith, John");
    expect(result).toContain("Case number - AB123");
    expect(result).toContain("---");
  });

  it("should format multiple case summaries with separators", () => {
    const summaries = [[{ label: "Defendant name", value: "Smith, John" }], [{ label: "Defendant name", value: "Doe, Jane" }]];

    const result = formatCaseSummaryForEmail(summaries);

    expect(result).toContain("Smith, John");
    expect(result).toContain("Doe, Jane");
  });
});
