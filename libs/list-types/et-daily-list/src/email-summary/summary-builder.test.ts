import { formatCaseSummaryForEmail as sharedFormat } from "@hmcts/list-types-common";
import { describe, expect, it } from "vitest";
import { extractEtCaseSummary } from "./et-summary-builder.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("summary-builder re-export", () => {
  it("should re-export the local ET case summary extractor", () => {
    // Assert
    expect(extractCaseSummary).toBe(extractEtCaseSummary);
    expect(formatCaseSummaryForEmail).toBe(sharedFormat);
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
  });
});
