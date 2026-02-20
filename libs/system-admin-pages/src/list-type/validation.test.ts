import { describe, expect, it } from "vitest";
import { type ListTypeDetailsInput, validateListTypeDetails, validateSubJurisdictions } from "./validation.js";

describe("validateListTypeDetails", () => {
  it("should return no errors for valid input", () => {
    const input: ListTypeDetailsInput = {
      name: "TEST_LIST",
      friendlyName: "Test List",
      welshFriendlyName: "Rhestr Prawf",
      shortenedFriendlyName: "Test",
      url: "/test-list",
      defaultSensitivity: "Public",
      allowedProvenance: ["CFT_IDAM"],
      isNonStrategic: false
    };

    const errors = validateListTypeDetails(input);

    expect(errors).toEqual([]);
  });

  it("should return error when name is empty", () => {
    const input: ListTypeDetailsInput = {
      name: "",
      friendlyName: "Test List",
      welshFriendlyName: "Rhestr Prawf",
      shortenedFriendlyName: "Test",
      url: "/test-list",
      defaultSensitivity: "Public",
      allowedProvenance: ["CFT_IDAM"],
      isNonStrategic: false
    };

    const errors = validateListTypeDetails(input);

    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("name");
    expect(errors[0].message).toBe("Enter a value for name");
  });

  it("should return error when name exceeds 1000 characters", () => {
    const input: ListTypeDetailsInput = {
      name: "a".repeat(1001),
      friendlyName: "Test List",
      welshFriendlyName: "Rhestr Prawf",
      shortenedFriendlyName: "Test",
      url: "/test-list",
      defaultSensitivity: "Public",
      allowedProvenance: ["CFT_IDAM"],
      isNonStrategic: false
    };

    const errors = validateListTypeDetails(input);

    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("name");
    expect(errors[0].message).toBe("Name must be 1000 characters or less");
  });

  it("should return error when friendly name is empty", () => {
    const input: ListTypeDetailsInput = {
      name: "TEST_LIST",
      friendlyName: "",
      welshFriendlyName: "Rhestr Prawf",
      shortenedFriendlyName: "Test",
      url: "/test-list",
      defaultSensitivity: "Public",
      allowedProvenance: ["CFT_IDAM"],
      isNonStrategic: false
    };

    const errors = validateListTypeDetails(input);

    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("friendlyName");
  });

  it("should return error when welsh friendly name exceeds 255 characters", () => {
    const input: ListTypeDetailsInput = {
      name: "TEST_LIST",
      friendlyName: "Test List",
      welshFriendlyName: "a".repeat(256),
      shortenedFriendlyName: "Test",
      url: "/test-list",
      defaultSensitivity: "Public",
      allowedProvenance: ["CFT_IDAM"],
      isNonStrategic: false
    };

    const errors = validateListTypeDetails(input);

    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("welshFriendlyName");
    expect(errors[0].message).toBe("Welsh friendly name must be 255 characters or less");
  });

  it("should return error when default sensitivity is invalid", () => {
    const input: ListTypeDetailsInput = {
      name: "TEST_LIST",
      friendlyName: "Test List",
      welshFriendlyName: "Rhestr Prawf",
      shortenedFriendlyName: "Test",
      url: "/test-list",
      defaultSensitivity: "Invalid",
      allowedProvenance: ["CFT_IDAM"],
      isNonStrategic: false
    };

    const errors = validateListTypeDetails(input);

    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("defaultSensitivity");
    expect(errors[0].message).toBe("Select a valid default sensitivity");
  });

  it("should return error when no provenance is selected", () => {
    const input: ListTypeDetailsInput = {
      name: "TEST_LIST",
      friendlyName: "Test List",
      welshFriendlyName: "Rhestr Prawf",
      shortenedFriendlyName: "Test",
      url: "/test-list",
      defaultSensitivity: "Public",
      allowedProvenance: [],
      isNonStrategic: false
    };

    const errors = validateListTypeDetails(input);

    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("allowedProvenance");
    expect(errors[0].message).toBe("Select at least one allowed provenance");
  });

  it("should return error when provenance is invalid", () => {
    const input: ListTypeDetailsInput = {
      name: "TEST_LIST",
      friendlyName: "Test List",
      welshFriendlyName: "Rhestr Prawf",
      shortenedFriendlyName: "Test",
      url: "/test-list",
      defaultSensitivity: "Public",
      allowedProvenance: ["INVALID_PROV"],
      isNonStrategic: false
    };

    const errors = validateListTypeDetails(input);

    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("allowedProvenance");
    expect(errors[0].message).toBe("Select valid provenance options");
  });

  it("should return error when isNonStrategic is not set", () => {
    const input: ListTypeDetailsInput = {
      name: "TEST_LIST",
      friendlyName: "Test List",
      welshFriendlyName: "Rhestr Prawf",
      shortenedFriendlyName: "Test",
      url: "/test-list",
      defaultSensitivity: "Public",
      allowedProvenance: ["CFT_IDAM"],
      isNonStrategic: undefined
    };

    const errors = validateListTypeDetails(input);

    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("isNonStrategic");
    expect(errors[0].message).toBe("Select whether this list type is non-strategic");
  });

  it("should return multiple errors for multiple invalid fields", () => {
    const input: ListTypeDetailsInput = {
      name: "",
      friendlyName: "",
      welshFriendlyName: "",
      shortenedFriendlyName: "",
      url: "",
      defaultSensitivity: "",
      allowedProvenance: [],
      isNonStrategic: undefined
    };

    const errors = validateListTypeDetails(input);

    expect(errors.length).toBeGreaterThan(1);
    expect(errors.map((e) => e.field)).toContain("name");
    expect(errors.map((e) => e.field)).toContain("friendlyName");
    expect(errors.map((e) => e.field)).toContain("allowedProvenance");
  });
});

describe("validateSubJurisdictions", () => {
  it("should return no errors when sub-jurisdictions are selected", () => {
    const errors = validateSubJurisdictions([1, 2, 3]);

    expect(errors).toEqual([]);
  });

  it("should return error when no sub-jurisdictions are selected", () => {
    const errors = validateSubJurisdictions([]);

    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("subJurisdictions");
    expect(errors[0].message).toBe("Select at least one sub-jurisdiction");
  });
});
