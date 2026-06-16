import type { ErrorObject } from "ajv";
import { describe, expect, it } from "vitest";
import { formatValidationErrors } from "./error-formatter.js";

describe("formatValidationErrors", () => {
  it("should format required field error", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/required",
        params: { missingProperty: "appellant" },
        message: "must have required property 'appellant'"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Row 1: Appellant is required");
  });

  it("should format pattern error for hearingTime field", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "pattern",
        instancePath: "/0/hearingTime",
        schemaPath: "#/properties/hearingTime/pattern",
        params: { pattern: "^([0-9]{1,2}):?([0-9]{2})?(am|pm)$" },
        message: 'must match pattern "^([0-9]{1,2}):?([0-9]{2})?(am|pm)$"'
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Row 1: Hearing time must be in format like "10:30am" or "2pm"');
  });

  it("should format pattern error for other fields", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "pattern",
        instancePath: "/0/appellant",
        schemaPath: "#/properties/appellant/pattern",
        params: { pattern: "^[^<>]*$" },
        message: 'must match pattern "^[^<>]*$"'
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Row 1: Appellant contains invalid characters (HTML tags not allowed)");
  });

  it("should format type error", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "type",
        instancePath: "/0/appellant",
        schemaPath: "#/properties/appellant/type",
        params: { type: "string" },
        message: "must be string"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Row 1: Appellant must be a string");
  });

  it("should format unknown error keyword", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "minLength",
        instancePath: "/0/appellant",
        schemaPath: "#/properties/appellant/minLength",
        params: { limit: 1 },
        message: "must NOT have fewer than 1 characters"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Row 1: Appellant: must NOT have fewer than 1 characters");
  });

  it("should handle multiple errors", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/required",
        params: { missingProperty: "appellant" },
        message: "must have required property 'appellant'"
      },
      {
        keyword: "required",
        instancePath: "/1",
        schemaPath: "#/required",
        params: { missingProperty: "appealReferenceNumber" },
        message: "must have required property 'appealReferenceNumber'"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("Row 1: Appellant is required");
    expect(result[1]).toBe("Row 2: Appeal reference number is required");
  });

  it("should handle error without instancePath", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "required",
        instancePath: "",
        schemaPath: "#/required",
        params: { missingProperty: "appellant" },
        message: "must have required property 'appellant'"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Appellant is required");
  });

  it("should map field names to friendly labels", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/required",
        params: { missingProperty: "appealReferenceNumber" },
        message: "must have required property 'appealReferenceNumber'"
      },
      {
        keyword: "required",
        instancePath: "/1",
        schemaPath: "#/required",
        params: { missingProperty: "caseType" },
        message: "must have required property 'caseType'"
      },
      {
        keyword: "required",
        instancePath: "/2",
        schemaPath: "#/required",
        params: { missingProperty: "hearingType" },
        message: "must have required property 'hearingType'"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result[0]).toBe("Row 1: Appeal reference number is required");
    expect(result[1]).toBe("Row 2: Case type is required");
    expect(result[2]).toBe("Row 3: Hearing type is required");
  });

  it("should handle error with nested path", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "pattern",
        instancePath: "/5/hearingTime",
        schemaPath: "#/properties/hearingTime/pattern",
        params: { pattern: "^([0-9]{1,2}):?([0-9]{2})?(am|pm)$" },
        message: 'must match pattern "^([0-9]{1,2}):?([0-9]{2})?(am|pm)$"'
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Row 6: Hearing time must be in format like "10:30am" or "2pm"');
  });

  it("should use field name when label not found", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/required",
        params: { missingProperty: "unknownField" },
        message: "must have required property 'unknownField'"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Row 1: unknownField is required");
  });

  it("should format errors for all field types", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/required",
        params: { missingProperty: "appellant" },
        message: "must have required property 'appellant'"
      },
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/required",
        params: { missingProperty: "appealReferenceNumber" },
        message: "must have required property 'appealReferenceNumber'"
      },
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/required",
        params: { missingProperty: "hearingTime" },
        message: "must have required property 'hearingTime'"
      },
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/required",
        params: { missingProperty: "additionalInformation" },
        message: "must have required property 'additionalInformation'"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(4);
    expect(result[0]).toBe("Row 1: Appellant is required");
    expect(result[1]).toBe("Row 1: Appeal reference number is required");
    expect(result[2]).toBe("Row 1: Hearing time is required");
    expect(result[3]).toBe("Row 1: Additional information is required");
  });

  it("should handle complex nested paths", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "pattern",
        instancePath: "/10/appellant",
        schemaPath: "#/items/properties/appellant/pattern",
        params: { pattern: "^[^<>]*$" },
        message: 'must match pattern "^[^<>]*$"'
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Row 11: Appellant contains invalid characters (HTML tags not allowed)");
  });
});
