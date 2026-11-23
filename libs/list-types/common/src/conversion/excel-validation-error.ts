const DEFAULT_VALIDATION_MESSAGE = "Excel file contains invalid data";
const FILE_READ_MESSAGE = "Excel file could not be read";

export class ExcelValidationError extends Error {
  readonly issues: ExcelValidationIssue[];
  readonly partialData?: unknown;

  constructor(issues: ExcelValidationIssue[], partialData?: unknown) {
    super(issues[0]?.message ?? DEFAULT_VALIDATION_MESSAGE);
    this.name = "ExcelValidationError";
    this.issues = issues;
    this.partialData = partialData;
  }
}

export class ExcelFileReadError extends Error {
  constructor(cause: unknown) {
    super(FILE_READ_MESSAGE, { cause });
    this.name = "ExcelFileReadError";
  }
}

export function isExcelValidationError(error: unknown): error is ExcelValidationError {
  return error instanceof ExcelValidationError;
}

export function isExcelFileReadError(error: unknown): error is ExcelFileReadError {
  return error instanceof ExcelFileReadError;
}

export interface ExcelValidationIssue {
  /** The tab name the user sees (worksheet.name); absent for single-sheet lists */
  sheetName?: string;
  /** The data key the tab converts into; used to match schema errors back to the tab */
  sheetKey?: string;
  /** 1-based data row (header not counted); absent for sheet-level issues */
  rowNumber?: number;
  /** FieldConfig.header, e.g. "Time"; absent for sheet- and row-level issues */
  columnHeader?: string;
  reason: string;
  /** The full message in the legacy format, used for Error.message */
  message: string;
}
