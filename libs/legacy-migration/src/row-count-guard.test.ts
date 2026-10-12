import { describe, expect, it } from "vitest";
import { findDropLimitViolation } from "./row-count-guard.js";

describe("findDropLimitViolation", () => {
  it("should allow a drop up to the fixed allowance on a small table", () => {
    // Act & Assert
    expect(findDropLimitViolation("user", 60, 10, 0.05)).toBeNull();
  });

  it("should refuse a drop beyond the fixed allowance on a small table", () => {
    // Act & Assert
    expect(findDropLimitViolation("user", 60, 9, 0.05)).toContain("user: refusing to replace 60 rows with 9 (drop 51, limit 50)");
  });

  it("should allow a drop up to the ratio on a large table", () => {
    // Act & Assert
    expect(findDropLimitViolation("user", 10_000, 9_500, 0.05)).toBeNull();
  });

  it("should refuse a drop beyond the ratio on a large table", () => {
    // Act & Assert
    expect(findDropLimitViolation("user", 10_000, 9_499, 0.05)).toContain("user: refusing to replace 10000 rows with 9499 (drop 501, limit 500)");
  });

  it("should refuse emptying a populated table even within the allowance", () => {
    // Act & Assert
    expect(findDropLimitViolation("subscription_list_type", 5, 0, 0.05)).toContain("refusing to replace 5 rows with 0");
  });

  it("should allow emptying a table that can legitimately reach zero, within the allowance", () => {
    // Act & Assert
    expect(findDropLimitViolation("media_application", 5, 0, 0.05, { canBeEmptied: true })).toBeNull();
    expect(findDropLimitViolation("media_application", 60, 0, 0.05, { canBeEmptied: true })).toContain("drop 60, limit 50");
  });

  it("should allow loading into an empty table and growth", () => {
    // Act & Assert
    expect(findDropLimitViolation("user", 0, 0, 0.05)).toBeNull();
    expect(findDropLimitViolation("user", 100, 5_000, 0.05)).toBeNull();
  });
});
