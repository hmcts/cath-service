import { hasConverterForListTypeName } from "@hmcts/list-types-common";
import { describe, expect, it } from "vitest";

// Field-level validation behaviour (required fields, time format, HTML tag rejection) is fully
// covered by chd-kb-common's own test suite, since INSOLVENCY_AND_COMPANIES_COURT_CHD_EXCEL_CONFIG
// is the same shared config object. This suite only covers what's specific to this list type:
// registration under the correct DB name.
import "./insolvency-and-companies-court-chd-daily-cause-list-config.js";

describe("INSOLVENCY_AND_COMPANIES_COURT_CHD_EXCEL_CONFIG", () => {
  it("should be registered under the correct list type name", () => {
    expect(hasConverterForListTypeName("INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST")).toBe(true);
  });
});
