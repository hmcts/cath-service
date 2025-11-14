import { describe, expect, it } from "vitest";
import * as exports from "./index.js";

describe("index exports", () => {
  it("should export renderCauseListData function", () => {
    expect(exports.renderCauseListData).toBeDefined();
    expect(typeof exports.renderCauseListData).toBe("function");
  });

  it("should export validateCivilFamilyCauseList function", () => {
    expect(exports.validateCivilFamilyCauseList).toBeDefined();
    expect(typeof exports.validateCivilFamilyCauseList).toBe("function");
  });

  it("should export exactly 2 named exports", () => {
    const exportKeys = Object.keys(exports);
    expect(exportKeys).toHaveLength(2);
    expect(exportKeys).toContain("renderCauseListData");
    expect(exportKeys).toContain("validateCivilFamilyCauseList");
  });
});
