import { hasConverterForListTypeName } from "@hmcts/list-types-common";
import { describe, expect, it } from "vitest";
import "./chancery-appeals-chd-daily-cause-list-config.js";

// Field-level validation behaviour (required fields, time format, HTML tag rejection) is fully
// covered by chd-kb-common's own test suite, since CHANCERY_APPEALS_CHD_EXCEL_CONFIG is the same
// shared config object. This suite only covers what's specific to this list type: registration.
describe("CHANCERY_APPEALS_CHD_EXCEL_CONFIG", () => {
  it("should be registered under the correct list type name", () => {
    expect(hasConverterForListTypeName("CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST")).toBe(true);
  });
});
