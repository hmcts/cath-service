import { describe, expect, it } from "vitest";
import * as exports from "./index.js";

describe("index exports", () => {
  it("should export renderEtFortnightlyList function", () => {
    expect(exports.renderEtFortnightlyList).toBeDefined();
    expect(typeof exports.renderEtFortnightlyList).toBe("function");
  });

  it("should export validateEtFortnightlyPressList function", () => {
    expect(exports.validateEtFortnightlyPressList).toBeDefined();
    expect(typeof exports.validateEtFortnightlyPressList).toBe("function");
  });

  it("should export generateEtFortnightlyPressListPdf function", () => {
    expect(exports.generateEtFortnightlyPressListPdf).toBeDefined();
    expect(typeof exports.generateEtFortnightlyPressListPdf).toBe("function");
  });

  it("should export the English and Welsh locale content including rep keys", () => {
    expect(exports.etFortnightlyListEn.title).toBe("Employment Tribunals Fortnightly List");
    expect(exports.etFortnightlyListEn.rep).toBe("Rep");
    expect(exports.etFortnightlyListCy.title).toBe("Rhestr Pob Pythefnos y Tribiwnlysoedd Cyflogaeth");
    expect(exports.etFortnightlyListCy.noRep).toBe("Dim Cynrychiolydd");
  });
});
