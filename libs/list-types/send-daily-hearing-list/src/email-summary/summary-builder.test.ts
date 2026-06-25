import { describe, expect, it } from "vitest";
import type { SendDailyHearingList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail } from "./summary-builder.js";

describe("extractCaseSummary", () => {
  it("should extract time, caseReferenceNumber and venue fields", () => {
    const hearingList: SendDailyHearingList = [
      {
        time: "10am",
        caseReferenceNumber: "SEND/2025/001",
        respondent: "Local Authority",
        hearingType: "Final",
        venue: "Remote",
        timeEstimate: "2 hours"
      }
    ];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Time", value: "10am" },
      { label: "Case reference number", value: "SEND/2025/001" },
      { label: "Venue", value: "Remote" }
    ]);
  });

  it("should handle empty list", () => {
    expect(extractCaseSummary([])).toHaveLength(0);
  });

  it("should handle missing values with empty string", () => {
    const hearingList: SendDailyHearingList = [{ time: "", caseReferenceNumber: "", respondent: "", hearingType: "", venue: "", timeEstimate: "" }];

    const result = extractCaseSummary(hearingList);
    expect(result[0]).toEqual([
      { label: "Time", value: "" },
      { label: "Case reference number", value: "" },
      { label: "Venue", value: "" }
    ]);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should return no cases message for empty list", () => {
    expect(formatCaseSummaryForEmail([])).toBe("No cases scheduled.");
  });
});
