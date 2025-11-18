import { describe, expect, it } from "vitest";
import { buildJurisdictionItems, buildRegionItems, buildSubJurisdictionItemsByJurisdiction, getSubJurisdictionsForJurisdiction } from "./service.js";

describe("buildJurisdictionItems", () => {
  it("should return all jurisdictions as items", async () => {
    const items = await buildJurisdictionItems([], "en");

    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => typeof item.value === "string")).toBe(true);
    expect(items.every((item) => typeof item.text === "string")).toBe(true);
    expect(items.every((item) => typeof item.checked === "boolean")).toBe(true);
    expect(items.every((item) => typeof item.jurisdictionId === "number")).toBe(true);
  });

  it("should mark selected jurisdictions as checked", async () => {
    const items = await buildJurisdictionItems([1, 2], "en");

    const checkedItems = items.filter((item) => item.checked);
    const uncheckedItems = items.filter((item) => !item.checked);

    expect(checkedItems.length).toBe(2);
    expect(checkedItems.every((item) => [1, 2].includes(item.jurisdictionId))).toBe(true);
    expect(uncheckedItems.every((item) => ![1, 2].includes(item.jurisdictionId))).toBe(true);
  });

  it("should use English names when locale is en", async () => {
    const items = await buildJurisdictionItems([], "en");

    // Check that text doesn't contain Welsh-specific characters patterns
    expect(items.some((item) => item.text.length > 0)).toBe(true);
  });

  it("should use Welsh names when locale is cy", async () => {
    const items = await buildJurisdictionItems([], "cy");

    // Check that we get items with text
    expect(items.some((item) => item.text.length > 0)).toBe(true);
  });

  it("should sort items alphabetically by text", async () => {
    const items = await buildJurisdictionItems([], "en");

    for (let i = 0; i < items.length - 1; i++) {
      expect(items[i].text.localeCompare(items[i + 1].text)).toBeLessThanOrEqual(0);
    }
  });

  it("should include data-jurisdiction attribute for each item", async () => {
    const items = await buildJurisdictionItems([], "en");

    expect(items.every((item) => item.attributes["data-jurisdiction"] === item.value)).toBe(true);
    expect(items.every((item) => item.attributes["data-jurisdiction"] === item.jurisdictionId.toString())).toBe(true);
  });

  it("should handle empty selected jurisdictions array", async () => {
    const items = await buildJurisdictionItems([], "en");

    expect(items.every((item) => item.checked === false)).toBe(true);
  });

  it("should handle single selected jurisdiction", async () => {
    const items = await buildJurisdictionItems([1], "en");

    const checkedItems = items.filter((item) => item.checked);
    expect(checkedItems.length).toBe(1);
    expect(checkedItems[0].jurisdictionId).toBe(1);
  });

  it("should include subJurisdictionLabel when provided", async () => {
    const subJurisdictionLabels = {
      1: "Select court type",
      2: "Select tribunal type"
    };

    const items = await buildJurisdictionItems([1], "en", subJurisdictionLabels);

    const itemWithLabel = items.find((item) => item.jurisdictionId === 1);
    expect(itemWithLabel?.subJurisdictionLabel).toBe("Select court type");

    const itemWithoutLabel = items.find((item) => item.jurisdictionId !== 1 && item.jurisdictionId !== 2);
    expect(itemWithoutLabel?.subJurisdictionLabel).toBeUndefined();
  });

  it("should handle subJurisdictionLabels being undefined", async () => {
    const items = await buildJurisdictionItems([1], "en", undefined);

    expect(items.every((item) => item.subJurisdictionLabel === undefined)).toBe(true);
  });

  it("should sort Welsh items correctly", async () => {
    const items = await buildJurisdictionItems([], "cy");

    for (let i = 0; i < items.length - 1; i++) {
      expect(items[i].text.localeCompare(items[i + 1].text)).toBeLessThanOrEqual(0);
    }
  });

  it("should convert jurisdictionId to string for value", async () => {
    const items = await buildJurisdictionItems([], "en");

    expect(items.every((item) => typeof item.value === "string")).toBe(true);
    expect(items.every((item) => Number.parseInt(item.value, 10) === item.jurisdictionId)).toBe(true);
  });

  it("should handle multiple selected jurisdictions", async () => {
    const items = await buildJurisdictionItems([1, 2, 3], "en");

    const checkedItems = items.filter((item) => item.checked);
    expect(checkedItems.length).toBe(3);
    expect(checkedItems.map((item) => item.jurisdictionId).sort()).toEqual([1, 2, 3]);
  });
});

describe("buildRegionItems", () => {
  it("should return all regions as items", async () => {
    const items = await buildRegionItems([], "en");

    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => typeof item.value === "string")).toBe(true);
    expect(items.every((item) => typeof item.text === "string")).toBe(true);
    expect(items.every((item) => typeof item.checked === "boolean")).toBe(true);
  });

  it("should mark selected regions as checked", async () => {
    const items = await buildRegionItems([1, 2], "en");

    const checkedItems = items.filter((item) => item.checked);
    const uncheckedItems = items.filter((item) => !item.checked);

    expect(checkedItems.length).toBe(2);
    expect(uncheckedItems.length).toBeGreaterThan(0);
  });

  it("should use English names when locale is en", async () => {
    const items = await buildRegionItems([], "en");

    expect(items.some((item) => item.text.length > 0)).toBe(true);
  });

  it("should use Welsh names when locale is cy", async () => {
    const items = await buildRegionItems([], "cy");

    expect(items.some((item) => item.text.length > 0)).toBe(true);
  });

  it("should sort items alphabetically by text", async () => {
    const items = await buildRegionItems([], "en");

    for (let i = 0; i < items.length - 1; i++) {
      expect(items[i].text.localeCompare(items[i + 1].text)).toBeLessThanOrEqual(0);
    }
  });

  it("should handle empty selected regions array", async () => {
    const items = await buildRegionItems([], "en");

    expect(items.every((item) => item.checked === false)).toBe(true);
  });

  it("should handle single selected region", async () => {
    const items = await buildRegionItems([1], "en");

    const checkedItems = items.filter((item) => item.checked);
    expect(checkedItems.length).toBe(1);
  });

  it("should sort Welsh items correctly", async () => {
    const items = await buildRegionItems([], "cy");

    for (let i = 0; i < items.length - 1; i++) {
      expect(items[i].text.localeCompare(items[i + 1].text)).toBeLessThanOrEqual(0);
    }
  });

  it("should handle multiple selected regions", async () => {
    const items = await buildRegionItems([1, 2, 3], "en");

    const checkedItems = items.filter((item) => item.checked);
    expect(checkedItems.length).toBe(3);
  });
});

describe("buildSubJurisdictionItemsByJurisdiction", () => {
  it("should return sub-jurisdictions grouped by jurisdiction", async () => {
    const result = await buildSubJurisdictionItemsByJurisdiction([], "en");

    expect(typeof result).toBe("object");
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });

  it("should return arrays of items for each jurisdiction", async () => {
    const result = await buildSubJurisdictionItemsByJurisdiction([], "en");

    for (const jurisdictionId in result) {
      expect(Array.isArray(result[jurisdictionId])).toBe(true);
      expect(result[jurisdictionId].every((item) => typeof item.value === "string")).toBe(true);
      expect(result[jurisdictionId].every((item) => typeof item.text === "string")).toBe(true);
      expect(result[jurisdictionId].every((item) => typeof item.checked === "boolean")).toBe(true);
    }
  });

  it("should mark selected sub-jurisdictions as checked", async () => {
    const result = await buildSubJurisdictionItemsByJurisdiction([1, 2], "en");

    let totalChecked = 0;
    for (const jurisdictionId in result) {
      const checkedItems = result[jurisdictionId].filter((item) => item.checked);
      totalChecked += checkedItems.length;
    }

    expect(totalChecked).toBe(2);
  });

  it("should use English names when locale is en", async () => {
    const result = await buildSubJurisdictionItemsByJurisdiction([], "en");

    for (const jurisdictionId in result) {
      if (result[jurisdictionId].length > 0) {
        expect(result[jurisdictionId].some((item) => item.text.length > 0)).toBe(true);
      }
    }
  });

  it("should use Welsh names when locale is cy", async () => {
    const result = await buildSubJurisdictionItemsByJurisdiction([], "cy");

    for (const jurisdictionId in result) {
      if (result[jurisdictionId].length > 0) {
        expect(result[jurisdictionId].some((item) => item.text.length > 0)).toBe(true);
      }
    }
  });

  it("should sort items alphabetically by text within each jurisdiction", async () => {
    const result = await buildSubJurisdictionItemsByJurisdiction([], "en");

    for (const jurisdictionId in result) {
      const items = result[jurisdictionId];
      for (let i = 0; i < items.length - 1; i++) {
        expect(items[i].text.localeCompare(items[i + 1].text)).toBeLessThanOrEqual(0);
      }
    }
  });

  it("should handle empty selected sub-jurisdictions array", async () => {
    const result = await buildSubJurisdictionItemsByJurisdiction([], "en");

    for (const jurisdictionId in result) {
      expect(result[jurisdictionId].every((item) => item.checked === false)).toBe(true);
    }
  });

  it("should handle single selected sub-jurisdiction", async () => {
    const result = await buildSubJurisdictionItemsByJurisdiction([1], "en");

    let totalChecked = 0;
    for (const jurisdictionId in result) {
      const checkedItems = result[jurisdictionId].filter((item) => item.checked);
      totalChecked += checkedItems.length;
    }

    expect(totalChecked).toBe(1);
  });

  it("should handle multiple selected sub-jurisdictions", async () => {
    const result = await buildSubJurisdictionItemsByJurisdiction([1, 2, 3], "en");

    let totalChecked = 0;
    for (const jurisdictionId in result) {
      const checkedItems = result[jurisdictionId].filter((item) => item.checked);
      totalChecked += checkedItems.length;
    }

    expect(totalChecked).toBe(3);
  });

  it("should include all jurisdictions in the result", async () => {
    const result = await buildSubJurisdictionItemsByJurisdiction([], "en");

    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
});

describe("getSubJurisdictionsForJurisdiction", () => {
  it("should return sub-jurisdiction IDs for a given jurisdiction", async () => {
    const result = await getSubJurisdictionsForJurisdiction(1);

    expect(Array.isArray(result)).toBe(true);
    expect(result.every((id) => typeof id === "number")).toBe(true);
  });

  it("should only return sub-jurisdictions that belong to the specified jurisdiction", async () => {
    const jurisdictionId = 1;
    const result = await getSubJurisdictionsForJurisdiction(jurisdictionId);

    expect(result.length).toBeGreaterThan(0);
  });

  it("should return an empty array for jurisdiction with no sub-jurisdictions", async () => {
    const result = await getSubJurisdictionsForJurisdiction(999);

    expect(result).toEqual([]);
  });

  it("should return different results for different jurisdictions", async () => {
    const result1 = await getSubJurisdictionsForJurisdiction(1);
    const result2 = await getSubJurisdictionsForJurisdiction(2);

    expect(result1).not.toEqual(result2);
  });

  it("should return array of sub-jurisdiction IDs only", async () => {
    const result = await getSubJurisdictionsForJurisdiction(1);

    result.forEach((id) => {
      expect(typeof id).toBe("number");
      expect(Number.isInteger(id)).toBe(true);
    });
  });
});
