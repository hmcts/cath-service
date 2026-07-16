import { extractEtCaseSummary, formatCaseSummaryForEmail as sharedFormat } from "@hmcts/et-list-common";
import { describe, expect, it } from "vitest";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("summary-builder re-export", () => {
  it("should re-export the shared ET case summary extractor", () => {
    // Assert
    expect(extractCaseSummary).toBe(extractEtCaseSummary);
    expect(formatCaseSummaryForEmail).toBe(sharedFormat);
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
  });
});
