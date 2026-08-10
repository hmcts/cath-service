import { hasConverterForListTypeName } from "@hmcts/list-types-common";
import { describe, expect, it } from "vitest";
import { FINANCIAL_LIST_CHD_KB_EXCEL_CONFIG } from "./financial-list-chd-kb-daily-cause-list-config.js";

// Field-level validation behaviour (required fields, time format, HTML tag rejection) is fully
// covered by chd-kb-common's own test suite, since FINANCIAL_LIST_CHD_KB_EXCEL_CONFIG is the
// same shared config object. This suite only covers what's specific to this list type:
// registration and the field order/shape required by the acceptance criteria.
describe("FINANCIAL_LIST_CHD_KB_EXCEL_CONFIG", () => {
  it("should be registered under the correct list type name", () => {
    expect(hasConverterForListTypeName("FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST")).toBe(true);
  });

  it("should define the seven columns in the required order", () => {
    expect(FINANCIAL_LIST_CHD_KB_EXCEL_CONFIG.fields.map((f) => f.fieldName)).toEqual([
      "judge",
      "time",
      "venue",
      "type",
      "caseNumber",
      "caseName",
      "additionalInformation"
    ]);
  });

  it("should require at least one row", () => {
    expect(FINANCIAL_LIST_CHD_KB_EXCEL_CONFIG.minRows).toBe(1);
  });
});
