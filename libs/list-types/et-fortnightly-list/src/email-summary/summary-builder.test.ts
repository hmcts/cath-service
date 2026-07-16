import { extractCaseSummary as etDailyExtractCaseSummary, formatCaseSummaryForEmail as sharedFormat } from "@hmcts/et-daily-list";
import { describe, expect, it } from "vitest";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("summary-builder re-export", () => {
  it("should re-export the ET case summary extractor from the et-daily-list package", () => {
    // Assert
    expect(extractCaseSummary).toBe(etDailyExtractCaseSummary);
    expect(formatCaseSummaryForEmail).toBe(sharedFormat);
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
  });
});
