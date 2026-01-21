import { getConfigForListType } from "@hmcts/list-search-config";
import * as repository from "./repository/queries.js";

interface CaseData {
  caseNumber: string | null;
  caseName: string | null;
}

interface CaseObject {
  caseNumber?: unknown;
  caseName?: unknown;
  [key: string]: unknown;
}

/**
 * Recursively searches for objects containing the specified field names.
 * Returns all objects that contain at least one of the target fields.
 *
 * Example: Given fieldNames ["caseNumber", "caseName"], finds all objects
 * in the JSON structure that have either or both fields.
 */
function findObjectsWithFields(data: unknown, fieldNames: string[]): CaseObject[] {
  const results: CaseObject[] = [];

  function traverse(current: unknown): void {
    if (!current || typeof current !== "object") {
      return;
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        traverse(item);
      }
      return;
    }

    const obj = current as Record<string, unknown>;

    // Check if this object has any of the target fields
    const hasTargetField = fieldNames.some((fieldName) => fieldName in obj);

    if (hasTargetField) {
      results.push(obj as CaseObject);
    }

    // Continue traversing nested objects and arrays
    for (const value of Object.values(obj)) {
      traverse(value);
    }
  }

  traverse(data);
  return results;
}

/**
 * Extracts case data from a single object by reading the configured field names.
 * Returns null if no valid case data is found.
 */
function extractCaseDataFromObject(
  obj: Record<string, unknown>,
  caseNumberFieldName: string,
  caseNameFieldName: string,
  hasCaseNumberField: boolean,
  hasCaseNameField: boolean
): CaseData | null {
  const caseNumberValue = hasCaseNumberField ? obj[caseNumberFieldName] : null;
  const caseNameValue = hasCaseNameField ? obj[caseNameFieldName] : null;

  const caseNumber = typeof caseNumberValue === "string" ? caseNumberValue : null;
  const caseName = typeof caseNameValue === "string" ? caseNameValue : null;

  if (caseNumber || caseName) {
    return { caseNumber, caseName };
  }

  return null;
}

/**
 * Attempts to extract case data from the root level of a flat object structure.
 * Returns an array with a single case if found, otherwise returns null.
 */
function extractFromRootLevel(
  jsonPayload: unknown,
  caseNumberFieldName: string,
  caseNameFieldName: string,
  hasCaseNumberField: boolean,
  hasCaseNameField: boolean
): CaseData[] | null {
  if (Array.isArray(jsonPayload)) {
    return null;
  }

  const rootObj = jsonPayload as Record<string, unknown>;
  const hasRootFields = (hasCaseNumberField && caseNumberFieldName in rootObj) || (hasCaseNameField && caseNameFieldName in rootObj);

  if (!hasRootFields) {
    return null;
  }

  const caseData = extractCaseDataFromObject(rootObj, caseNumberFieldName, caseNameFieldName, hasCaseNumberField, hasCaseNameField);
  return caseData ? [caseData] : null;
}

/**
 * Extracts all case data from a JSON payload by searching for objects
 * containing the configured field names anywhere in the structure.
 * Returns an array of case data objects.
 */
function extractCases(jsonPayload: unknown, caseNumberFieldName: string, caseNameFieldName: string): CaseData[] {
  const hasCaseNumberField = Boolean(caseNumberFieldName && caseNumberFieldName.trim() !== "");
  const hasCaseNameField = Boolean(caseNameFieldName && caseNameFieldName.trim() !== "");

  if (!jsonPayload || (!hasCaseNumberField && !hasCaseNameField)) {
    return [];
  }

  // First, check if the fields exist at the root level (flat structure)
  const rootLevelCases = extractFromRootLevel(jsonPayload, caseNumberFieldName, caseNameFieldName, hasCaseNumberField, hasCaseNameField);
  if (rootLevelCases) {
    return rootLevelCases;
  }

  // Build list of field names to search for
  const fieldNamesToSearch: string[] = [];
  if (hasCaseNumberField) fieldNamesToSearch.push(caseNumberFieldName);
  if (hasCaseNameField) fieldNamesToSearch.push(caseNameFieldName);

  // Search for objects containing these field names anywhere in the structure
  const caseObjects = findObjectsWithFields(jsonPayload, fieldNamesToSearch);

  const cases: CaseData[] = [];
  for (const obj of caseObjects) {
    const caseData = extractCaseDataFromObject(obj, caseNumberFieldName, caseNameFieldName, hasCaseNumberField, hasCaseNameField);
    if (caseData) {
      cases.push(caseData);
    }
  }

  return cases;
}

export async function extractAndStoreArtefactSearch(artefactId: string, listTypeId: number, jsonPayload: unknown): Promise<void> {
  try {
    const config = await getConfigForListType(listTypeId);

    if (config && jsonPayload) {
      // Extract all cases from the payload (handles both objects and arrays)
      const cases = extractCases(jsonPayload, config.caseNumberFieldName, config.caseNameFieldName);

      if (cases.length > 0) {
        // Delete existing entries for this artefact to ensure idempotency
        await repository.deleteArtefactSearchByArtefactId(artefactId);

        // Create new entries for all cases
        for (const caseData of cases) {
          await repository.createArtefactSearch(artefactId, caseData.caseNumber, caseData.caseName);
        }
      }
    }
  } catch (error) {
    console.error(`[ArtefactSearch] Failed to extract/store for artefact ${artefactId}:`, error);
  }
}
