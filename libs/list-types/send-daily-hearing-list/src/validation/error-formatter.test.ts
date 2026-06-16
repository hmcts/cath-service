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
        params: { missingProperty: "time" },
        message: "must have required property 'time'"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Row 1: Time is required");
  });

  it("should format pattern error for time field", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "pattern",
        instancePath: "/0/time",
        schemaPath: "#/properties/time/pattern",
        params: { pattern: "^\\d{1,2}([:.]\\d{2})?[ap]m\\s*$" },
        message: 'must match pattern "^\\d{1,2}([:.]\\d{2})?[ap]m\\s*$"'
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Row 1: Time must be in format like "10:30am" or "2pm"');
  });

  it("should format pattern error for other fields", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "pattern",
        instancePath: "/0/respondent",
        schemaPath: "#/properties/respondent/pattern",
        params: { pattern: "^[^<>]*$" },
        message: 'must match pattern "^[^<>]*$"'
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Row 1: Respondent contains invalid characters (HTML tags not allowed)");
  });

  it("should format type error", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "type",
        instancePath: "/0/caseReferenceNumber",
        schemaPath: "#/properties/caseReferenceNumber/type",
        params: { type: "string" },
        message: "must be string"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Row 1: Case reference number must be a string");
  });

  it("should format unknown error keyword", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "minLength",
        instancePath: "/0/venue",
        schemaPath: "#/properties/venue/minLength",
        params: { limit: 1 },
        message: "must NOT have fewer than 1 characters"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Row 1: Venue: must NOT have fewer than 1 characters");
  });

  it("should handle multiple errors", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/required",
        params: { missingProperty: "time" },
        message: "must have required property 'time'"
      },
      {
        keyword: "required",
        instancePath: "/1",
        schemaPath: "#/required",
        params: { missingProperty: "caseReferenceNumber" },
        message: "must have required property 'caseReferenceNumber'"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("Row 1: Time is required");
    expect(result[1]).toBe("Row 2: Case reference number is required");
  });

  it("should handle error without instancePath", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "required",
        instancePath: "",
        schemaPath: "#/required",
        params: { missingProperty: "respondent" },
        message: "must have required property 'respondent'"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Respondent is required");
  });

  it("should map field names to friendly labels", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/required",
        params: { missingProperty: "caseReferenceNumber" },
        message: "must have required property 'caseReferenceNumber'"
      },
      {
        keyword: "required",
        instancePath: "/1",
        schemaPath: "#/required",
        params: { missingProperty: "hearingType" },
        message: "must have required property 'hearingType'"
      },
      {
        keyword: "required",
        instancePath: "/2",
        schemaPath: "#/required",
        params: { missingProperty: "timeEstimate" },
        message: "must have required property 'timeEstimate'"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result[0]).toBe("Row 1: Case reference number is required");
    expect(result[1]).toBe("Row 2: Hearing type is required");
    expect(result[2]).toBe("Row 3: Time estimate is required");
  });

  it("should handle error with nested path", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "pattern",
        instancePath: "/5/time",
        schemaPath: "#/properties/time/pattern",
        params: { pattern: "^\\d{1,2}([:.]\\d{2})?[ap]m\\s*$" },
        message: 'must match pattern "^\\d{1,2}([:.]\\d{2})?[ap]m\\s*$"'
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Row 6: Time must be in format like "10:30am" or "2pm"');
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
        params: { missingProperty: "time" },
        message: "must have required property 'time'"
      },
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/required",
        params: { missingProperty: "caseReferenceNumber" },
        message: "must have required property 'caseReferenceNumber'"
      },
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/required",
        params: { missingProperty: "respondent" },
        message: "must have required property 'respondent'"
      },
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/required",
        params: { missingProperty: "hearingType" },
        message: "must have required property 'hearingType'"
      },
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/required",
        params: { missingProperty: "venue" },
        message: "must have required property 'venue'"
      },
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/required",
        params: { missingProperty: "timeEstimate" },
        message: "must have required property 'timeEstimate'"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(6);
    expect(result[0]).toBe("Row 1: Time is required");
    expect(result[1]).toBe("Row 1: Case reference number is required");
    expect(result[2]).toBe("Row 1: Respondent is required");
    expect(result[3]).toBe("Row 1: Hearing type is required");
    expect(result[4]).toBe("Row 1: Venue is required");
    expect(result[5]).toBe("Row 1: Time estimate is required");
  });

  it("should handle complex nested paths", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "pattern",
        instancePath: "/10/venue",
        schemaPath: "#/items/properties/venue/pattern",
        params: { pattern: "^[^<>]*$" },
        message: 'must match pattern "^[^<>]*$"'
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Row 11: Venue contains invalid characters (HTML tags not allowed)");
  });
});
