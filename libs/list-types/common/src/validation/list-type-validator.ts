export interface ValidationResult {
  isValid: boolean;
  errors: unknown[];
  schemaVersion: string;
}

export interface ListTypeInfo {
  id: number;
  name: string;
  friendlyName: string | null;
}

/**
 * Converts list type name to kebab-case for dynamic imports
 * Example: CIVIL_AND_FAMILY_DAILY_CAUSE_LIST -> civil-and-family-daily-cause-list
 */
export function convertListTypeNameToKebabCase(name: string): string {
  return name.toLowerCase().replace(/_/g, "-");
}

/**
 * Maps delta/variant list type package names to their parent package.
 * Used when a list type shares the same JSON schema as another list type.
 */
const PACKAGE_ALIASES: Record<string, string> = {
  "crown-daily-pdda-list": "crown-daily-list",
  "crown-firm-pdda-list": "crown-firm-list",
  "iac-daily-list-additional-cases": "iac-daily-list",
  "et-fortnightly-press-list": "et-fortnightly-list",
  "magistrates-adult-court-list-daily": "magistrates-adult-court-list",
  "magistrates-adult-court-list-future": "magistrates-adult-court-list",
  "sjp-delta-press-list": "sjp-press-list",
  "sjp-delta-public-list": "sjp-public-list",
  "utiac-jr-london-daily-hearing-list": "utiac-jr-daily-hearing-list",
  "utiac-jr-leeds-daily-hearing-list": "utiac-jr-daily-hearing-list",
  "utiac-jr-manchester-daily-hearing-list": "utiac-jr-daily-hearing-list",
  "utiac-jr-birmingham-daily-hearing-list": "utiac-jr-daily-hearing-list",
  "utiac-jr-cardiff-daily-hearing-list": "utiac-jr-daily-hearing-list",
  "magistrates-public-adult-court-list-daily": "magistrates-public-adult-court-list",
  "magistrates-public-adult-court-list-future": "magistrates-public-adult-court-list",
  "civil-courts-rcj-daily-cause-list": "rcj-standard-daily-cause-list",
  "county-court-london-civil-daily-cause-list": "rcj-standard-daily-cause-list",
  "court-of-appeal-criminal-daily-cause-list": "rcj-standard-daily-cause-list",
  "family-division-high-court-daily-cause-list": "rcj-standard-daily-cause-list",
  "kings-bench-division-daily-cause-list": "rcj-standard-daily-cause-list",
  "kings-bench-masters-daily-cause-list": "rcj-standard-daily-cause-list",
  "mayor-city-civil-daily-cause-list": "rcj-standard-daily-cause-list",
  "senior-courts-costs-office-daily-cause-list": "rcj-standard-daily-cause-list",
  "birmingham-administrative-court-daily-cause-list": "administrative-court-daily-cause-list",
  "leeds-administrative-court-daily-cause-list": "administrative-court-daily-cause-list",
  "bristol-cardiff-administrative-court-daily-cause-list": "administrative-court-daily-cause-list",
  "manchester-administrative-court-daily-cause-list": "administrative-court-daily-cause-list",
  "sscs-london-daily-hearing-list": "sscs-daily-hearing-list",
  "sscs-midlands-daily-hearing-list": "sscs-daily-hearing-list",
  "sscs-south-east-daily-hearing-list": "sscs-daily-hearing-list",
  "sscs-wales-and-south-west-daily-hearing-list": "sscs-daily-hearing-list",
  "sscs-scotland-daily-hearing-list": "sscs-daily-hearing-list",
  "sscs-north-east-daily-hearing-list": "sscs-daily-hearing-list",
  "sscs-north-west-daily-hearing-list": "sscs-daily-hearing-list",
  "siac-weekly-hearing-list": "siac-poac-paac-weekly-hearing-list",
  "poac-weekly-hearing-list": "siac-poac-paac-weekly-hearing-list",
  "paac-weekly-hearing-list": "siac-poac-paac-weekly-hearing-list",
  "ftt-rpt-eastern-weekly-hearing-list": "ftt-rpt-weekly-hearing-list",
  "ftt-rpt-london-weekly-hearing-list": "ftt-rpt-weekly-hearing-list",
  "ftt-rpt-midlands-weekly-hearing-list": "ftt-rpt-weekly-hearing-list",
  "ftt-rpt-northern-weekly-hearing-list": "ftt-rpt-weekly-hearing-list",
  "ftt-rpt-southern-weekly-hearing-list": "ftt-rpt-weekly-hearing-list",
  "ftt-rpt-market-rents-weekly-hearing-list": "ftt-rpt-weekly-hearing-list",
  "ut-tax-and-chancery-chamber-daily-hearing-list": "upper-tribunal-tax-and-chancery-chamber-daily-hearing-list",
  "ut-lands-chamber-daily-hearing-list": "upper-tribunal-lands-chamber-daily-hearing-list",
  "ut-administrative-appeals-chamber-daily-hearing-list": "upper-tribunal-administrative-appeals-chamber-daily-hearing-list"
};

/**
 * Dynamically validates JSON data against the appropriate list type schema
 * Only call this function for JSON files - other file types don't need validation
 *
 * @param listTypeId - The ID of the list type (as string)
 * @param jsonData - The parsed JSON data to validate
 * @param listTypes - Array of available list types from database
 * @returns ValidationResult with isValid flag and errors array
 */
export async function validateListTypeJson(listTypeId: string, jsonData: unknown, listTypes: ListTypeInfo[]): Promise<ValidationResult> {
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

  // Convert list type name to kebab-case for package name, applying alias if one exists
  const kebabName = convertListTypeNameToKebabCase(listType.name);
  const resolvedName = PACKAGE_ALIASES[kebabName] ?? kebabName;
  const packageName = `@hmcts/${resolvedName}`;

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
            message: `No JSON schema available for ${listType.friendlyName}. This list type does not support JSON uploads.`
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // If the module doesn't exist, it means no schema is available for this list type
    if (errorMessage.includes("Cannot find") || errorMessage.includes("Failed to resolve") || errorMessage.includes("Cannot find package")) {
      return {
        isValid: false,
        errors: [
          {
            message: `No JSON schema available for ${listType.friendlyName}. This list type does not support JSON uploads.`
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
