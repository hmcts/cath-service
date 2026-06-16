import type { ErrorObject } from "ajv";
import { describe, expect, it } from "vitest";
import { formatValidationErrors } from "./error-formatter.js";

describe("formatValidationErrors", () => {
  it("should format required field errors with row numbers", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/items/required",
        params: { missingProperty: "date" },
        message: "must have required property 'date'"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Row 1: Date is required");
  });

  it("should format multiple required field errors", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/items/required",
        params: { missingProperty: "hearingTime" },
        message: "must have required property 'hearingTime'"
      },
      {
        keyword: "required",
        instancePath: "/1",
        schemaPath: "#/items/required",
        params: { missingProperty: "caseReferenceNumber" },
        message: "must have required property 'caseReferenceNumber'"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("Row 1: Hearing time is required");
    expect(result[1]).toBe("Row 2: Case reference number is required");
  });

  it("should format date pattern validation errors with helpful message", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "pattern",
        instancePath: "/0/date",
        schemaPath: "#/items/properties/date/pattern",
        params: { pattern: "^\\d{2}/\\d{2}/\\d{4}$" },
        message: "must match pattern"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Row 1: Date must be in format dd/MM/yyyy (e.g., 02/01/2025)");
  });

  it("should format hearing time pattern validation errors with helpful message", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "pattern",
        instancePath: "/2/hearingTime",
        schemaPath: "#/items/properties/hearingTime/pattern",
        params: { pattern: "^\\d{1,2}(:\\d{2})?(am|pm)$" },
        message: "must match pattern"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Row 3: Hearing time must be in format like "10:30am" or "2pm"');
  });

  it("should format pattern validation errors for other fields with generic message", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "pattern",
        instancePath: "/0/caseName",
        schemaPath: "#/items/properties/caseName/pattern",
        params: { pattern: "^[^<>]*$" },
        message: "must match pattern"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Row 1: Case name contains invalid characters (HTML tags not allowed)");
  });

  it("should format type validation errors", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "type",
        instancePath: "/0/date",
        schemaPath: "#/items/properties/date/type",
        params: { type: "string" },
        message: "must be string"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Row 1: Date must be a string");
  });

  it("should handle errors without row context", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "required",
        instancePath: "",
        schemaPath: "#/required",
        params: { missingProperty: "caseName" },
        message: "must have required property 'caseName'"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Case name is required");
  });

  it("should use field labels for known fields", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/items/required",
        params: { missingProperty: "venuePlatform" },
        message: "must have required property 'venuePlatform'"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Row 1: Venue/Platform is required");
  });

  it("should handle unknown field names gracefully", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/items/required",
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

  it("should format unknown error keywords with default message", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "maxLength",
        instancePath: "/0/caseName",
        schemaPath: "#/items/properties/caseName/maxLength",
        params: { limit: 500 },
        message: "must NOT have more than 500 characters"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Row 1: Case name: must NOT have more than 500 characters");
  });

  it("should handle multiple errors for different rows and fields", () => {
    // Arrange
    const errors: ErrorObject[] = [
      {
        keyword: "required",
        instancePath: "/0",
        schemaPath: "#/items/required",
        params: { missingProperty: "date" },
        message: "must have required property 'date'"
      },
      {
        keyword: "pattern",
        instancePath: "/1/hearingTime",
        schemaPath: "#/items/properties/hearingTime/pattern",
        params: { pattern: "^\\d{1,2}(:\\d{2})?(am|pm)$" },
        message: "must match pattern"
      },
      {
        keyword: "required",
        instancePath: "/2",
        schemaPath: "#/items/required",
        params: { missingProperty: "caseName" },
        message: "must have required property 'caseName'"
      }
    ];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("Row 1: Date is required");
    expect(result[1]).toBe('Row 2: Hearing time must be in format like "10:30am" or "2pm"');
    expect(result[2]).toBe("Row 3: Case name is required");
  });

  it("should handle empty errors array", () => {
    // Arrange
    const errors: ErrorObject[] = [];

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(0);
  });

  it("should handle all known field labels", () => {
    // Arrange
    const knownFields = ["date", "hearingTime", "caseReferenceNumber", "caseName", "venuePlatform", "judges", "members", "additionalInformation"];

    const errors: ErrorObject[] = knownFields.map((field, index) => ({
      keyword: "required",
      instancePath: `/${index}`,
      schemaPath: "#/items/required",
      params: { missingProperty: field },
      message: `must have required property '${field}'`
    }));

    // Act
    const result = formatValidationErrors(errors);

    // Assert
    expect(result).toHaveLength(knownFields.length);
    expect(result[0]).toBe("Row 1: Date is required");
    expect(result[1]).toBe("Row 2: Hearing time is required");
    expect(result[2]).toBe("Row 3: Case reference number is required");
    expect(result[3]).toBe("Row 4: Case name is required");
    expect(result[4]).toBe("Row 5: Venue/Platform is required");
    expect(result[5]).toBe("Row 6: Judge(s) is required");
    expect(result[6]).toBe("Row 7: Member(s) is required");
    expect(result[7]).toBe("Row 8: Additional information is required");
  });
});
