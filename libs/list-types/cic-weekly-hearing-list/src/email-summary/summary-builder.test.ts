import { describe, expect, it } from "vitest";
import type { CicWeeklyHearingList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail } from "./summary-builder.js";

describe("extractCaseSummary", () => {
  it("should extract date, hearingTime, caseReferenceNumber and caseName fields", () => {
    const hearingList: CicWeeklyHearingList = [
      {
        date: "02/01/2025",
        hearingTime: "10am",
        caseReferenceNumber: "CIC/2025/001",
        caseName: "Smith v CICA",
        "venue/platform": "Remote",
        judges: "Judge Smith",
        members: "Member A",
        additionalInformation: "Video hearing"
      }
    ];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Date", value: "02/01/2025" },
      { label: "Hearing time", value: "10am" },
      { label: "Case reference number", value: "CIC/2025/001" },
      { label: "Case name", value: "Smith v CICA" }
    ]);
  });

  it("should handle empty list", () => {
    expect(extractCaseSummary([])).toHaveLength(0);
  });

  it("should handle missing values with empty string", () => {
    const hearingList: CicWeeklyHearingList = [
      {
        date: "",
        hearingTime: "",
        caseReferenceNumber: "",
        caseName: "",
        "venue/platform": "",
        judges: "",
        members: "",
        additionalInformation: ""
      }
    ];

    const result = extractCaseSummary(hearingList);
    expect(result[0]).toEqual([
      { label: "Date", value: "" },
      { label: "Hearing time", value: "" },
      { label: "Case reference number", value: "" },
      { label: "Case name", value: "" }
    ]);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should return no cases message for empty list", () => {
    expect(formatCaseSummaryForEmail([])).toBe("No cases scheduled.");
  });
});
