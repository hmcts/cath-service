import { describe, expect, it } from "vitest";
import { validateLocationSelected, validateRadioSelection } from "./validation.js";

describe("validateLocationSelected", () => {
  it("should return error when locationId is undefined", () => {
    const result = validateLocationSelected(undefined);
    expect(result).toEqual({
      text: "Enter a court or tribunal name",
      href: "#court-search"
    });
  });

  it("should return error when locationId is empty string", () => {
    const result = validateLocationSelected("");
    expect(result).toEqual({
      text: "Enter a court or tribunal name",
      href: "#court-search"
    });
  });

  it("should return error when locationId is whitespace", () => {
    const result = validateLocationSelected("   ");
    expect(result).toEqual({
      text: "Enter a court or tribunal name",
      href: "#court-search"
    });
  });

  it("should return null when locationId is valid", () => {
    const result = validateLocationSelected("123");
    expect(result).toBeNull();
  });
});

describe("validateRadioSelection", () => {
  it("should return error when value is undefined", () => {
    const result = validateRadioSelection(undefined);
    expect(result).toEqual({
      text: "Select yes or no to continue",
      href: "#confirm-delete"
    });
  });

  it("should return null when value is yes", () => {
    const result = validateRadioSelection("yes");
    expect(result).toBeNull();
  });

  it("should return null when value is no", () => {
    const result = validateRadioSelection("no");
    expect(result).toBeNull();
  });
});
