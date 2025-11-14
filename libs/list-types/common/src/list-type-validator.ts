import type { ValidationResult } from "@hmcts/publication";
import type { ListType } from "./mock-list-types.js";

/**
 * Converts list type name to kebab-case for dynamic imports
 * Example: CIVIL_AND_FAMILY_DAILY_CAUSE_LIST -> civil-and-family-daily-cause-list
 */
export function convertListTypeNameToKebabCase(name: string): string {
  return name.toLowerCase().replace(/_/g, "-");
}

/**
 * Dynamically validates JSON data against the appropriate list type schema
 * Only call this function for JSON files - other file types don't need validation
 *
 * @param listTypeId - The ID of the list type (as string)
 * @param jsonData - The parsed JSON data to validate
 * @param listTypes - Array of available list types
 * @returns ValidationResult with isValid flag and errors array
 */
export async function validateListTypeJson(
  listTypeId: string,
  jsonData: unknown,
  listTypes: ListType[]
): Promise<ValidationResult> {
  // Find the list type by ID
  const listTypeIdNum = Number.parseInt(listTypeId, 10);
  const listType = listTypes.find((lt) => lt.id === listTypeIdNum);

  if (!listType) {
    return {
      isValid: false,
      errors: [{ message: "Invalid list type ID" }],
      schemaVersion: "unknown"
    };
  }

  // Convert list type name to kebab-case for package name
  const kebabName = convertListTypeNameToKebabCase(listType.name);
  const packageName = `@hmcts/${kebabName}`;

  try {
    // Dynamically import the list type package
    const listTypeModule = await import(packageName);

    // Look for a validation function in the module
    // Find any function that starts with "validate"
    const validationFunctionName = Object.keys(listTypeModule).find((key) => key.startsWith("validate") && typeof listTypeModule[key] === "function");

    if (!validationFunctionName) {
      return {
        isValid: false,
        errors: [
          {
            message: `No validation function found for ${listType.englishFriendlyName}. JSON schemas are not available for this list type.`
          }
        ],
        schemaVersion: "unknown"
      };
    }

    const validationFunction = listTypeModule[validationFunctionName];

    // Call the validation function and return the result
    return validationFunction(jsonData);
  } catch (error) {
    // Handle module not found or import errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // If the module doesn't exist, it means no schema is available for this list type
    if (errorMessage.includes("Cannot find") || errorMessage.includes("Failed to resolve") || errorMessage.includes("Cannot find package")) {
      return {
        isValid: false,
        errors: [
          {
            message: `No JSON schema available for ${listType.englishFriendlyName}. This list type does not support JSON uploads.`
          }
        ],
        schemaVersion: "unknown"
      };
    }

    // Other errors (e.g., import issues)
    return {
      isValid: false,
      errors: [{ message: `Validation error: ${errorMessage}` }],
      schemaVersion: "unknown"
    };
  }
}
