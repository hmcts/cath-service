import { describe, expect, it } from "vitest";
import { validateLocationMetadataInput } from "./location-metadata-validation.js";

describe("validateLocationMetadataInput", () => {
  it("should return valid when cautionMessage is provided", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      cautionMessage: "Test caution message"
    });

    expect(result).toEqual({ valid: true });
  });

  it("should return valid when welshCautionMessage is provided", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      welshCautionMessage: "Neges rhybudd prawf"
    });

    expect(result).toEqual({ valid: true });
  });

  it("should return valid when noListMessage is provided", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      noListMessage: "No hearings scheduled"
    });

    expect(result).toEqual({ valid: true });
  });

  it("should return valid when welshNoListMessage is provided", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      welshNoListMessage: "Dim gwrandawiadau wedi'u trefnu"
    });

    expect(result).toEqual({ valid: true });
  });

  it("should return valid when multiple messages are provided", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      cautionMessage: "Test caution",
      welshCautionMessage: "Rhybudd prawf",
      noListMessage: "No hearings",
      welshNoListMessage: "Dim gwrandawiadau"
    });

    expect(result).toEqual({ valid: true });
  });

  it("should return invalid when all messages are empty strings", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      cautionMessage: "",
      welshCautionMessage: "",
      noListMessage: "",
      welshNoListMessage: ""
    });

    expect(result).toEqual({
      valid: false,
      error: "At least one message required"
    });
  });

  it("should return invalid when all messages are whitespace only", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      cautionMessage: "   ",
      welshCautionMessage: "  ",
      noListMessage: "\t",
      welshNoListMessage: "\n"
    });

    expect(result).toEqual({
      valid: false,
      error: "At least one message required"
    });
  });

  it("should return invalid when no messages are provided", () => {
    const result = validateLocationMetadataInput({
      locationId: 1
    });

    expect(result).toEqual({
      valid: false,
      error: "At least one message required"
    });
  });

  it("should return invalid when all messages are undefined", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      cautionMessage: undefined,
      welshCautionMessage: undefined,
      noListMessage: undefined,
      welshNoListMessage: undefined
    });

    expect(result).toEqual({
      valid: false,
      error: "At least one message required"
    });
  });

  it("should return valid when only one message has content among empty ones", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      cautionMessage: "",
      welshCautionMessage: "",
      noListMessage: "Valid message",
      welshNoListMessage: ""
    });

    expect(result).toEqual({ valid: true });
  });

  it("should work with UpdateLocationMetadataInput (no locationId)", () => {
    const result = validateLocationMetadataInput({
      cautionMessage: "Updated caution"
    });

    expect(result).toEqual({ valid: true });
  });
});
