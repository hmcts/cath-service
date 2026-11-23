import type { ValidationIssue, ValidationResult } from "../validation/json-validator.js";
import { resolveListTypePackageName } from "../validation/list-type-package.js";
import type { FieldConfig } from "./excel-to-json.js";
import { ExcelValidationError, type ExcelValidationIssue, isExcelValidationError } from "./excel-validation-error.js";
import type { SheetConfig } from "./multi-sheet-converter.js";
import { getConverterForListTypeName, type ListTypeConverter } from "./non-strategic-list-registry.js";

const MISSING_SHEET_REASON = "Sheet is missing from the file";
const MODULE_NOT_FOUND_MESSAGES = ["Cannot find", "Failed to resolve", "Failed to load"];

/**
 * Validates a non-strategic Excel upload the way PIP does: convert the workbook, then check the
 * converted data against the list type's JSON schema. Every converter and schema error is turned
 * into a located issue (tab, row, column), and they are all thrown together as one ExcelValidationError.
 */
export async function validateNonStrategicExcel(listTypeName: string, buffer: Buffer): Promise<unknown> {
  const converter = getConverterForListTypeName(listTypeName);
  if (!converter) {
    throw new Error(`No converter found for list type name: ${listTypeName}`);
  }

  const { data, issues: converterIssues } = await convert(converter, buffer);
  const validate = await findSchemaValidator(listTypeName);
  const schemaIssues = validate && data !== undefined ? mapSchemaIssues(validate(data), converter) : [];
  const issues = [...converterIssues, ...schemaIssues.filter((issue) => !isAlreadyReported(issue, converterIssues))];

  if (issues.length > 0) {
    throw new ExcelValidationError(sortIssues(issues, converter), data);
  }

  return data;
}

async function convert(converter: ListTypeConverter, buffer: Buffer): Promise<{ data: unknown; issues: ExcelValidationIssue[] }> {
  try {
    return { data: await converter.convertExcelToJson(buffer), issues: [] };
  } catch (error) {
    if (!isExcelValidationError(error)) {
      throw error;
    }
    return { data: error.partialData, issues: error.issues };
  }
}

async function findSchemaValidator(listTypeName: string): Promise<((data: unknown) => ValidationResult) | undefined> {
  try {
    const listTypeModule = await import(`@hmcts/${resolveListTypePackageName(listTypeName)}`);
    const validatorName = Object.keys(listTypeModule).find((key) => key.startsWith("validate") && typeof listTypeModule[key] === "function");
    return validatorName ? listTypeModule[validatorName] : undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (MODULE_NOT_FOUND_MESSAGES.some((text) => message.includes(text))) {
      return undefined;
    }
    throw error;
  }
}

function mapSchemaIssues(result: ValidationResult, converter: ListTypeConverter): ExcelValidationIssue[] {
  if (result.isValid) {
    return [];
  }
  if (!result.issues) {
    return result.errors.map((error) => ({ reason: error, message: error }));
  }
  return result.issues.map((issue) => (converter.sheets ? mapMultiSheetIssue(issue, converter.sheets) : mapSingleSheetIssue(issue, converter.config.fields)));
}

function mapMultiSheetIssue(issue: ValidationIssue, sheets: SheetConfig[]): ExcelValidationIssue {
  const [sheetKey, rowIndex, fieldName] = parsePath(issue.instancePath);
  const message = legacyMessage(issue);

  if (sheetKey === undefined) {
    const missingKey = issue.keyword === "required" ? String(issue.params.missingProperty ?? "") : "";
    if (!missingKey) {
      return { reason: issue.message, message };
    }
    return { sheetName: sheetLabel(missingKey, sheets), sheetKey: missingKey, reason: MISSING_SHEET_REASON, message };
  }

  const sheet = sheets.find((candidate) => candidate.dataKey === sheetKey);
  return {
    sheetName: sheetLabel(sheetKey, sheets),
    sheetKey,
    ...locateInSheet(rowIndex, fieldName, sheet?.config.fields ?? []),
    reason: issue.message,
    message
  };
}

function mapSingleSheetIssue(issue: ValidationIssue, fields: FieldConfig[]): ExcelValidationIssue {
  const [rowIndex, fieldName] = parsePath(issue.instancePath);
  return { ...locateInSheet(rowIndex, fieldName, fields), reason: issue.message, message: legacyMessage(issue) };
}

function locateInSheet(
  rowIndex: string | undefined,
  fieldName: string | undefined,
  fields: FieldConfig[]
): Pick<ExcelValidationIssue, "rowNumber" | "columnHeader"> {
  const index = rowIndex === undefined ? Number.NaN : Number(rowIndex);
  if (!Number.isInteger(index)) {
    return {};
  }
  if (fieldName === undefined) {
    return { rowNumber: index + 1 };
  }
  const field = fields.find((candidate) => candidate.fieldName === fieldName);
  return { rowNumber: index + 1, columnHeader: field?.header ?? toTitleCase(fieldName) };
}

function parsePath(instancePath: string): string[] {
  return instancePath
    .split("/")
    .slice(1)
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
}

function sheetLabel(sheetKey: string, sheets: SheetConfig[]): string {
  return sheets.find((sheet) => sheet.dataKey === sheetKey)?.worksheetName ?? toTitleCase(sheetKey);
}

// PIP's fallback for keys with no configured label: camelCase to Title Case
function toTitleCase(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function legacyMessage(issue: ValidationIssue): string {
  const field = issue.instancePath.replace(/\//g, ".").substring(1) || "root";
  return `${field}: ${issue.message}`;
}

// A schema error is dropped when the converter already reported the same place: the converter's
// issue carries the cell-level reason. A converter issue on a whole row or tab covers everything inside it.
function isAlreadyReported(issue: ExcelValidationIssue, converterIssues: ExcelValidationIssue[]): boolean {
  return converterIssues.some(
    (reported) =>
      reported.sheetKey === issue.sheetKey &&
      (reported.rowNumber === undefined || reported.rowNumber === issue.rowNumber) &&
      (reported.columnHeader === undefined || reported.columnHeader === issue.columnHeader)
  );
}

function sortIssues(issues: ExcelValidationIssue[], converter: ListTypeConverter): ExcelValidationIssue[] {
  const sheets = converter.sheets ?? [];
  const sheetOrder = (issue: ExcelValidationIssue) => {
    const index = sheets.findIndex((sheet) => sheet.dataKey === issue.sheetKey);
    return index === -1 ? sheets.length : index;
  };
  const columnOrder = (issue: ExcelValidationIssue) => {
    const fields = sheets.find((sheet) => sheet.dataKey === issue.sheetKey)?.config.fields ?? converter.config.fields;
    // Row- and sheet-level issues have no column, so findIndex gives -1 and they sort first
    return fields.findIndex((field) => field.header === issue.columnHeader);
  };
  return issues
    .map((issue, position) => ({ issue, position }))
    .sort(
      (a, b) =>
        sheetOrder(a.issue) - sheetOrder(b.issue) ||
        (a.issue.rowNumber ?? 0) - (b.issue.rowNumber ?? 0) ||
        columnOrder(a.issue) - columnOrder(b.issue) ||
        a.position - b.position
    )
    .map(({ issue }) => issue);
}
