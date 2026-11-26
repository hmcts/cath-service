import { describe, expect, it } from "vitest";
import * as exports from "./index.js";

describe("index exports", () => {
  it("should export renderCauseListData function", () => {
    expect(exports.renderCauseListData).toBeDefined();
    expect(typeof exports.renderCauseListData).toBe("function");
  });

  it("should export validateCopDailyCauseList function", () => {
    expect(exports.validateCopDailyCauseList).toBeDefined();
    expect(typeof exports.validateCopDailyCauseList).toBe("function");
  });

  it("should export all required functions", () => {
    const exportKeys = Object.keys(exports);
    expect(exportKeys).toContain("renderCauseListData");
    expect(exportKeys).toContain("validateCopDailyCauseList");
    expect(exportKeys).toContain("generateCopDailyCauseListPdf");
    expect(exportKeys).toContain("extractCaseSummary");
    expect(exportKeys).toContain("formatCaseSummaryForEmail");
  });

  it("should export the locale content objects", () => {
    expect(exports.copDailyCauseListEn).toBeDefined();
    expect(exports.copDailyCauseListCy).toBeDefined();
  });
});
