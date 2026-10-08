import { describe, expect, it } from "vitest";
import { assertValidProvenances, PUBLISHER_PROVENANCES } from "./list-type-provenance.js";

describe("assertValidProvenances", () => {
  it("should return a single valid provenance unchanged", () => {
    // Arrange
    const provenances = ["CFT_IDAM"];

    // Act
    const result = assertValidProvenances(provenances);

    // Assert
    expect(result).toEqual(["CFT_IDAM"]);
  });

  it("should return multiple valid provenances unchanged", () => {
    // Arrange
    const provenances = ["CRIME_IDAM", "PI_AAD"];

    // Act
    const result = assertValidProvenances(provenances);

    // Assert
    expect(result).toEqual(["CRIME_IDAM", "PI_AAD"]);
  });

  it("should throw when a provenance is not in the known set", () => {
    // Arrange
    const provenances = ["CFT_IDAM", "BOGUS"];

    // Act & Assert
    expect(() => assertValidProvenances(provenances)).toThrow(/Invalid provenance "BOGUS"/);
  });

  it("should throw for MANUAL_UPLOAD which is an artefact provenance, not a user provenance", () => {
    // Arrange
    const provenances = ["MANUAL_UPLOAD"];

    // Act & Assert
    expect(() => assertValidProvenances(provenances)).toThrow(/Invalid provenance "MANUAL_UPLOAD"/);
  });
});

describe("constants", () => {
  it("should not include MANUAL_UPLOAD in PUBLISHER_PROVENANCES", () => {
    expect(PUBLISHER_PROVENANCES as readonly string[]).not.toContain("MANUAL_UPLOAD");
  });

  it("should not include SSO in PUBLISHER_PROVENANCES (a login provenance, never a list-type publisher)", () => {
    expect(PUBLISHER_PROVENANCES as readonly string[]).not.toContain("SSO");
  });

  it("should offer exactly the three publisher provenances", () => {
    expect([...PUBLISHER_PROVENANCES].sort()).toEqual(["CFT_IDAM", "CRIME_IDAM", "PI_AAD"]);
  });
});
