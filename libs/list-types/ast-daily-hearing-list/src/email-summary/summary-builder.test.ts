import { describe, expect, it } from "vitest";
import type { AstDailyHearingList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail } from "./summary-builder.js";

describe("extractCaseSummary", () => {
  it("should extract appellant, appealReferenceNumber and hearingTime fields", () => {
    const hearingList: AstDailyHearingList = [
      {
        appellant: "A Smith",
        appealReferenceNumber: "AST/2025/001",
        caseType: "Section 4",
        hearingType: "Substantive",
        hearingTime: "10am",
        additionalInformation: "Remote hearing"
      }
    ];

    const result = extractCaseSummary(hearingList);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Appellant", value: "A Smith" },
      { label: "Appeal reference number", value: "AST/2025/001" },
      { label: "Hearing time", value: "10am" }
    ]);
  });

  it("should handle empty list", () => {
    expect(extractCaseSummary([])).toHaveLength(0);
  });

  it("should handle missing values with empty string", () => {
    const hearingList: AstDailyHearingList = [
      { appellant: "", appealReferenceNumber: "", caseType: "", hearingType: "", hearingTime: "", additionalInformation: "" }
    ];

    const result = extractCaseSummary(hearingList);
    expect(result[0]).toEqual([
      { label: "Appellant", value: "" },
      { label: "Appeal reference number", value: "" },
      { label: "Hearing time", value: "" }
    ]);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should return no cases message for empty list", () => {
    expect(formatCaseSummaryForEmail([])).toBe("No cases scheduled.");
  });
});
