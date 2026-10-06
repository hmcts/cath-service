import { describe, expect, it } from "vitest";
import { formatSchemaError } from "./schema-error-message.js";

describe("formatSchemaError", () => {
  // The reference string, taken from real pip-data-management output for a payload whose
  // /document object is missing publicationDate.
  it("should render a nested missing property exactly as the incumbent does", () => {
    // Arrange
    const error = {
      instancePath: "/document",
      keyword: "required",
      message: "must have required property 'publicationDate'",
      params: { missingProperty: "publicationDate" }
    };

    // Act
    const result = formatSchemaError(error);

    // Assert
    expect(result).toBe("/document: required property 'publicationDate' not found");
  });

  it("should render a deeply nested missing property with its full pointer", () => {
    // Arrange
    const error = {
      instancePath: "/courtLists/0/courtHouse/courtRoom/0/session/0/sittings/0/hearing/0/case/0",
      keyword: "required",
      message: "must have required property 'caseNumber'",
      params: { missingProperty: "caseNumber" }
    };

    // Act
    const result = formatSchemaError(error);

    // Assert
    expect(result).toBe("/courtLists/0/courtHouse/courtRoom/0/session/0/sittings/0/hearing/0/case/0: required property 'caseNumber' not found");
  });

  // networknt renders the root JSON Pointer as an empty string, so the message starts with ": ".
  it("should render a root-level missing property with an empty pointer", () => {
    // Arrange
    const error = {
      instancePath: "",
      keyword: "required",
      message: "must have required property 'document'",
      params: { missingProperty: "document" }
    };

    // Act
    const result = formatSchemaError(error);

    // Assert
    expect(result).toBe(": required property 'document' not found");
  });

  // Other keywords keep Ajv's wording but gain the location prefix.
  it("should prefix a non-required failure with its location", () => {
    // Arrange
    const error = {
      instancePath: "/document/publicationDate",
      keyword: "type",
      message: "must be string",
      params: { type: "string" }
    };

    // Act
    const result = formatSchemaError(error);

    // Assert
    expect(result).toBe("/document/publicationDate: must be string");
  });

  it("should fall back when a required error carries no missing property", () => {
    // Arrange
    const error = { instancePath: "/document", keyword: "required", message: "is invalid", params: {} };

    // Act
    const result = formatSchemaError(error);

    // Assert
    expect(result).toBe("/document: is invalid");
  });

  it.each([[null], [undefined], ["a string"], [42]])("should fall back for a non-Ajv error (%s)", (error) => {
    // Act & Assert
    expect(formatSchemaError(error)).toBe("Invalid publication payload");
  });
});
