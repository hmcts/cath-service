import * as repository from "./list-search-config-repository.js";

const FIELD_NAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export interface ValidationError {
  field: string;
  message: string;
}

export async function getConfigForListType(listTypeId: number) {
  return await repository.findByListTypeId(listTypeId);
}

export function validateFieldName(fieldName: string, fieldLabel: string): ValidationError | null {
  if (!fieldName || fieldName.trim() === "") {
    return {
      field: fieldLabel,
      message: `Enter the ${fieldLabel.toLowerCase()}`
    };
  }

  if (!FIELD_NAME_PATTERN.test(fieldName)) {
    return {
      field: fieldLabel,
      message: `${fieldLabel} must contain only letters, numbers and underscores`
    };
  }

  if (fieldName.length > 100) {
    return {
      field: fieldLabel,
      message: `${fieldLabel} must be 100 characters or less`
    };
  }

  return null;
}

export async function saveConfig(
  listTypeId: number,
  caseNumberFieldName: string,
  caseNameFieldName: string
): Promise<{ success: boolean; errors?: ValidationError[] }> {
  const errors: ValidationError[] = [];

  const caseNumberError = validateFieldName(caseNumberFieldName, "Case number field name");
  if (caseNumberError) {
    errors.push(caseNumberError);
  }

  const caseNameError = validateFieldName(caseNameFieldName, "Case name field name");
  if (caseNameError) {
    errors.push(caseNameError);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  await repository.upsert(listTypeId, {
    caseNumberFieldName: caseNumberFieldName.trim(),
    caseNameFieldName: caseNameFieldName.trim()
  });

  return { success: true };
}
