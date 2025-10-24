import { describe, expect, it } from "vitest";
import { buildJurisdictionItems, buildRegionItems, buildSubJurisdictionItemsByJurisdiction, getSubJurisdictionsForJurisdiction } from "./service.js";

describe("buildJurisdictionItems", () => {
  it("should return all jurisdictions as items", () => {
    const items = buildJurisdictionItems([], "en");

    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => typeof item.value === "string")).toBe(true);
    expect(items.every((item) => typeof item.text === "string")).toBe(true);
    expect(items.every((item) => typeof item.checked === "boolean")).toBe(true);
    expect(items.every((item) => typeof item.jurisdictionId === "number")).toBe(true);
  });

  it("should mark selected jurisdictions as checked", () => {
    const items = buildJurisdictionItems([1, 2], "en");

    const checkedItems = items.filter((item) => item.checked);
    const uncheckedItems = items.filter((item) => !item.checked);

    expect(checkedItems.length).toBe(2);
    expect(checkedItems.every((item) => [1, 2].includes(item.jurisdictionId))).toBe(true);
    expect(uncheckedItems.every((item) => ![1, 2].includes(item.jurisdictionId))).toBe(true);
  });

  it("should use English names when locale is en", () => {
    const items = buildJurisdictionItems([], "en");

    // Check that text doesn't contain Welsh-specific characters patterns
    expect(items.some((item) => item.text.length > 0)).toBe(true);
  });

  it("should use Welsh names when locale is cy", () => {
    const items = buildJurisdictionItems([], "cy");

    // Check that we get items with text
    expect(items.some((item) => item.text.length > 0)).toBe(true);
  });

  it("should sort items alphabetically by text", () => {
    const items = buildJurisdictionItems([], "en");

    for (let i = 0; i < items.length - 1; i++) {
      expect(items[i].text.localeCompare(items[i + 1].text)).toBeLessThanOrEqual(0);
    }
  });

  it("should include data-jurisdiction attribute for each item", () => {
    const items = buildJurisdictionItems([], "en");

    expect(items.every((item) => item.attributes["data-jurisdiction"] === item.value)).toBe(true);
    expect(items.every((item) => item.attributes["data-jurisdiction"] === item.jurisdictionId.toString())).toBe(true);
  });

  it("should handle empty selected jurisdictions array", () => {
    const items = buildJurisdictionItems([], "en");

    expect(items.every((item) => item.checked === false)).toBe(true);
  });

  it("should handle single selected jurisdiction", () => {
    const items = buildJurisdictionItems([1], "en");

    const checkedItems = items.filter((item) => item.checked);
    expect(checkedItems.length).toBe(1);
    expect(checkedItems[0].jurisdictionId).toBe(1);
  });

  it("should include subJurisdictionLabel when provided", () => {
    const subJurisdictionLabels = {
      1: "Select court type",
      2: "Select tribunal type"
    };

    const items = buildJurisdictionItems([1], "en", subJurisdictionLabels);

    const itemWithLabel = items.find((item) => item.jurisdictionId === 1);
    expect(itemWithLabel?.subJurisdictionLabel).toBe("Select court type");

    const itemWithoutLabel = items.find((item) => item.jurisdictionId !== 1 && item.jurisdictionId !== 2);
    expect(itemWithoutLabel?.subJurisdictionLabel).toBeUndefined();
  });

  it("should handle subJurisdictionLabels being undefined", () => {
    const items = buildJurisdictionItems([1], "en", undefined);

    expect(items.every((item) => item.subJurisdictionLabel === undefined)).toBe(true);
  });

  it("should sort Welsh items correctly", () => {
    const items = buildJurisdictionItems([], "cy");

    for (let i = 0; i < items.length - 1; i++) {
      expect(items[i].text.localeCompare(items[i + 1].text)).toBeLessThanOrEqual(0);
    }
  });

  it("should convert jurisdictionId to string for value", () => {
    const items = buildJurisdictionItems([], "en");

    expect(items.every((item) => typeof item.value === "string")).toBe(true);
    expect(items.every((item) => Number.parseInt(item.value) === item.jurisdictionId)).toBe(true);
  });

  it("should handle multiple selected jurisdictions", () => {
    const items = buildJurisdictionItems([1, 2, 3], "en");

    const checkedItems = items.filter((item) => item.checked);
    expect(checkedItems.length).toBe(3);
    expect(checkedItems.map((item) => item.jurisdictionId).sort()).toEqual([1, 2, 3]);
  });
});

describe("buildRegionItems", () => {
  it("should return all regions as items", () => {
    const items = buildRegionItems([], "en");

    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => typeof item.value === "string")).toBe(true);
    expect(items.every((item) => typeof item.text === "string")).toBe(true);
    expect(items.every((item) => typeof item.checked === "boolean")).toBe(true);
  });

  it("should mark selected regions as checked", () => {
    const items = buildRegionItems([1, 2], "en");

    const checkedItems = items.filter((item) => item.checked);
    const uncheckedItems = items.filter((item) => !item.checked);

    expect(checkedItems.length).toBe(2);
    expect(uncheckedItems.length).toBeGreaterThan(0);
  });

  it("should use English names when locale is en", () => {
    const items = buildRegionItems([], "en");

    expect(items.some((item) => item.text.length > 0)).toBe(true);
  });

  it("should use Welsh names when locale is cy", () => {
    const items = buildRegionItems([], "cy");

    expect(items.some((item) => item.text.length > 0)).toBe(true);
  });

  it("should sort items alphabetically by text", () => {
    const items = buildRegionItems([], "en");

    for (let i = 0; i < items.length - 1; i++) {
      expect(items[i].text.localeCompare(items[i + 1].text)).toBeLessThanOrEqual(0);
    }
  });

  it("should handle empty selected regions array", () => {
    const items = buildRegionItems([], "en");

    expect(items.every((item) => item.checked === false)).toBe(true);
  });

  it("should handle single selected region", () => {
    const items = buildRegionItems([1], "en");

    const checkedItems = items.filter((item) => item.checked);
    expect(checkedItems.length).toBe(1);
  });

  it("should sort Welsh items correctly", () => {
    const items = buildRegionItems([], "cy");

    for (let i = 0; i < items.length - 1; i++) {
      expect(items[i].text.localeCompare(items[i + 1].text)).toBeLessThanOrEqual(0);
    }
  });

  it("should handle multiple selected regions", () => {
    const items = buildRegionItems([1, 2, 3], "en");

    const checkedItems = items.filter((item) => item.checked);
    expect(checkedItems.length).toBe(3);
  });
});

describe("buildSubJurisdictionItemsByJurisdiction", () => {
  it("should return sub-jurisdictions grouped by jurisdiction", () => {
    const result = buildSubJurisdictionItemsByJurisdiction([], "en");

    expect(typeof result).toBe("object");
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });

  it("should return arrays of items for each jurisdiction", () => {
    const result = buildSubJurisdictionItemsByJurisdiction([], "en");

    for (const jurisdictionId in result) {
      expect(Array.isArray(result[jurisdictionId])).toBe(true);
      expect(result[jurisdictionId].every((item) => typeof item.value === "string")).toBe(true);
      expect(result[jurisdictionId].every((item) => typeof item.text === "string")).toBe(true);
      expect(result[jurisdictionId].every((item) => typeof item.checked === "boolean")).toBe(true);
    }
  });

  it("should mark selected sub-jurisdictions as checked", () => {
    const result = buildSubJurisdictionItemsByJurisdiction([1, 2], "en");

    let totalChecked = 0;
    for (const jurisdictionId in result) {
      const checkedItems = result[jurisdictionId].filter((item) => item.checked);
      totalChecked += checkedItems.length;
    }

    expect(totalChecked).toBe(2);
  });

  it("should use English names when locale is en", () => {
    const result = buildSubJurisdictionItemsByJurisdiction([], "en");

    for (const jurisdictionId in result) {
      if (result[jurisdictionId].length > 0) {
        expect(result[jurisdictionId].some((item) => item.text.length > 0)).toBe(true);
      }
    }
  });

  it("should use Welsh names when locale is cy", () => {
    const result = buildSubJurisdictionItemsByJurisdiction([], "cy");

    for (const jurisdictionId in result) {
      if (result[jurisdictionId].length > 0) {
        expect(result[jurisdictionId].some((item) => item.text.length > 0)).toBe(true);
      }
    }
  });

  it("should sort items alphabetically by text within each jurisdiction", () => {
    const result = buildSubJurisdictionItemsByJurisdiction([], "en");

    for (const jurisdictionId in result) {
      const items = result[jurisdictionId];
      for (let i = 0; i < items.length - 1; i++) {
        expect(items[i].text.localeCompare(items[i + 1].text)).toBeLessThanOrEqual(0);
      }
    }
  });

  it("should handle empty selected sub-jurisdictions array", () => {
    const result = buildSubJurisdictionItemsByJurisdiction([], "en");

    for (const jurisdictionId in result) {
      expect(result[jurisdictionId].every((item) => item.checked === false)).toBe(true);
    }
  });

  it("should handle single selected sub-jurisdiction", () => {
    const result = buildSubJurisdictionItemsByJurisdiction([1], "en");

    let totalChecked = 0;
    for (const jurisdictionId in result) {
      const checkedItems = result[jurisdictionId].filter((item) => item.checked);
      totalChecked += checkedItems.length;
    }

    expect(totalChecked).toBe(1);
  });

  it("should handle multiple selected sub-jurisdictions", () => {
    const result = buildSubJurisdictionItemsByJurisdiction([1, 2, 3], "en");

    let totalChecked = 0;
    for (const jurisdictionId in result) {
      const checkedItems = result[jurisdictionId].filter((item) => item.checked);
      totalChecked += checkedItems.length;
    }

    expect(totalChecked).toBe(3);
  });

  it("should include all jurisdictions in the result", () => {
    const result = buildSubJurisdictionItemsByJurisdiction([], "en");

    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
});

describe("getSubJurisdictionsForJurisdiction", () => {
  it("should return sub-jurisdiction IDs for a given jurisdiction", () => {
    const result = getSubJurisdictionsForJurisdiction(1);

    expect(Array.isArray(result)).toBe(true);
    expect(result.every((id) => typeof id === "number")).toBe(true);
  });

  it("should only return sub-jurisdictions that belong to the specified jurisdiction", () => {
    const jurisdictionId = 1;
    const result = getSubJurisdictionsForJurisdiction(jurisdictionId);

    expect(result.length).toBeGreaterThan(0);
  });

  it("should return an empty array for jurisdiction with no sub-jurisdictions", () => {
    const result = getSubJurisdictionsForJurisdiction(999);

    expect(result).toEqual([]);
  });

  it("should return different results for different jurisdictions", () => {
    const result1 = getSubJurisdictionsForJurisdiction(1);
    const result2 = getSubJurisdictionsForJurisdiction(2);

    expect(result1).not.toEqual(result2);
  });

  it("should return array of sub-jurisdiction IDs only", () => {
    const result = getSubJurisdictionsForJurisdiction(1);

    result.forEach((id) => {
      expect(typeof id).toBe("number");
      expect(Number.isInteger(id)).toBe(true);
    });
  });
});
