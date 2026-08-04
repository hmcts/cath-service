import { hasConverterForListTypeName } from "@hmcts/list-types-common";
import { describe, expect, it } from "vitest";

// Field-level validation behaviour (required fields, time format, HTML tag rejection) is fully
// covered by chd-kb-common's own test suite, since COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG is the
// same shared config object. This suite only covers what's specific to this list type: registration.
describe("COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG", () => {
  it("should be registered under the correct list type name", () => {
    expect(hasConverterForListTypeName("COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST")).toBe(true);
  });
});
