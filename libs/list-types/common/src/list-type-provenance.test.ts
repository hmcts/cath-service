import { describe, expect, it } from "vitest";
import { formatProvenance, PUBLISHER_PROVENANCES, parseProvenance, USER_PROVENANCES } from "./list-type-provenance.js";

describe("formatProvenance", () => {
  it("should join a single valid provenance", () => {
    // Arrange
    const provenances = ["CFT_IDAM"];

    // Act
    const result = formatProvenance(provenances);

    // Assert
    expect(result).toBe("CFT_IDAM");
  });

  it("should join multiple valid provenances with a comma and no spaces", () => {
    // Arrange
    const provenances = ["CRIME_IDAM", "PI_AAD"];

    // Act
    const result = formatProvenance(provenances);

    // Assert
    expect(result).toBe("CRIME_IDAM,PI_AAD");
  });

  it("should throw when a provenance is not in the known set", () => {
    // Arrange
    const provenances = ["CFT_IDAM", "BOGUS"];

    // Act & Assert
    expect(() => formatProvenance(provenances)).toThrow(/Invalid provenance "BOGUS"/);
  });

  it("should throw for MANUAL_UPLOAD which is an artefact provenance, not a user provenance", () => {
    // Arrange
    const provenances = ["MANUAL_UPLOAD"];

    // Act & Assert
    expect(() => formatProvenance(provenances)).toThrow(/Invalid provenance "MANUAL_UPLOAD"/);
  });
});

describe("parseProvenance", () => {
  it("should split a delimited string", () => {
    // Arrange
    const value = "CRIME_IDAM,PI_AAD";

    // Act
    const result = parseProvenance(value);

    // Assert
    expect(result).toEqual(["CRIME_IDAM", "PI_AAD"]);
  });

  it("should trim whitespace around the delimiter", () => {
    // Arrange
    const value = "CRIME_IDAM, PI_AAD";

    // Act
    const result = parseProvenance(value);

    // Assert
    expect(result).toEqual(["CRIME_IDAM", "PI_AAD"]);
  });

  it("should drop empty segments", () => {
    // Arrange
    const value = "CFT_IDAM,,";

    // Act
    const result = parseProvenance(value);

    // Assert
    expect(result).toEqual(["CFT_IDAM"]);
  });

  it("should return an empty array for an empty string", () => {
    // Act
    const result = parseProvenance("");

    // Assert
    expect(result).toEqual([]);
  });
});

describe("round-trip", () => {
  it("should round-trip a multi-provenance value through format and parse", () => {
    // Arrange
    const provenances = ["CRIME_IDAM", "PI_AAD"];

    // Act
    const result = parseProvenance(formatProvenance(provenances));

    // Assert
    expect(result).toEqual(provenances);
  });
});

describe("constants", () => {
  it("should not include MANUAL_UPLOAD in USER_PROVENANCES", () => {
    expect(USER_PROVENANCES as readonly string[]).not.toContain("MANUAL_UPLOAD");
  });

  it("should only offer publisher provenances that are valid user provenances", () => {
    for (const p of PUBLISHER_PROVENANCES) {
      expect(USER_PROVENANCES as readonly string[]).toContain(p);
    }
  });
});
