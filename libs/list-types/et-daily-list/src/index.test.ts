import { describe, expect, it } from "vitest";
import * as exports from "./index.js";

describe("index exports", () => {
  it("should export renderEtDailyList function", () => {
    expect(exports.renderEtDailyList).toBeDefined();
    expect(typeof exports.renderEtDailyList).toBe("function");
  });

  it("should export validateEtDailyList function", () => {
    expect(exports.validateEtDailyList).toBeDefined();
    expect(typeof exports.validateEtDailyList).toBe("function");
  });

  it("should export generateEtDailyListPdf function", () => {
    expect(exports.generateEtDailyListPdf).toBeDefined();
    expect(typeof exports.generateEtDailyListPdf).toBe("function");
  });

  it("should export the English and Welsh locale content", () => {
    expect(exports.etDailyListEn.title).toBe("Employment Tribunals Daily List");
    expect(exports.etDailyListCy.title).toBe("Rhestr Ddyddiol y Tribiwnlysoedd Cyflogaeth");
  });
});
