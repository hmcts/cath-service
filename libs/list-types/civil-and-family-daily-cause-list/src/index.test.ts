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

  it("should export all required functions", () => {
    const exportKeys = Object.keys(exports);
    expect(exportKeys).toContain("renderCauseListData");
    expect(exportKeys).toContain("validateCivilFamilyCauseList");
    expect(exportKeys).toContain("generateCauseListPdf");
    expect(exportKeys).toContain("extractCaseSummary");
    expect(exportKeys).toContain("formatCaseSummaryForEmail");
    expect(exportKeys).toContain("SPECIAL_CATEGORY_DATA_WARNING");
  });
});
