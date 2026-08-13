import { hasConverterForListTypeName } from "@hmcts/list-types-common";
import { describe, expect, it } from "vitest";
import "./commercial-court-kb-daily-cause-list-config.js";

// Field-level validation behaviour (required fields, time format, HTML tag rejection) is fully
// covered by chd-kb-common's own test suite, since COMMERCIAL_COURT_KB_EXCEL_CONFIG is the same
// shared config object. This suite only covers what's specific to this list type: registration.
describe("COMMERCIAL_COURT_KB_EXCEL_CONFIG", () => {
  it("should be registered under the correct list type name", () => {
    expect(hasConverterForListTypeName("COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST")).toBe(true);
  });
});
