import { describe, expect, it } from "vitest";
import { selectAttrFilter } from "./select-attr.js";

describe("selectAttrFilter", () => {
  const errors = [
    { text: "Enter a name", href: "#name" },
    { text: "Select a type", href: "#type" },
    { text: "Enter Welsh name", href: "#welshName" }
  ];

  it("should filter objects by matching attribute value", () => {
    const result = selectAttrFilter(errors, "href", "equalto", "#type");
    expect(result).toEqual([{ text: "Select a type", href: "#type" }]);
  });

  it("should return empty array when no items match", () => {
    const result = selectAttrFilter(errors, "href", "equalto", "#missing");
    expect(result).toEqual([]);
  });

  it("should return empty array when input is not an array", () => {
    // biome-ignore lint/suspicious/noExplicitAny: testing invalid input
    expect(selectAttrFilter(null as any, "href", "equalto", "#name")).toEqual([]);
  });

  it("should return empty array for unsupported operator", () => {
    const result = selectAttrFilter(errors, "href", "contains", "#name");
    expect(result).toEqual([]);
  });
});
