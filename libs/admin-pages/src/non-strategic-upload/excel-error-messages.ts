import type { ExcelValidationIssue } from "@hmcts/list-types-common";
import type { ValidationError } from "../manual-upload/model.js";

const FILE_INPUT_HREF = "#file";

/**
 * Turns located Excel validation issues into GOV.UK error summary items, one per issue.
 * The location wording follows PIP (English only): Sheet 'X' - Row N of 'Y' column: reason.
 * Every issue is listed, ordered by tab (as received), then numeric row, then column (as received).
 */
export function formatExcelValidationErrors(issues: ExcelValidationIssue[]): ValidationError[] {
  return sortIssues(issues).map((issue) => ({ text: formatIssue(issue), href: FILE_INPUT_HREF }));
}

function sortIssues(issues: ExcelValidationIssue[]): ExcelValidationIssue[] {
  const sheetOrder = new Map<string | undefined, number>();
  for (const issue of issues) {
    if (!sheetOrder.has(issue.sheetName)) {
      sheetOrder.set(issue.sheetName, sheetOrder.size);
    }
  }

  return issues
    .map((issue, position) => ({ issue, position }))
    .sort(
      (a, b) =>
        (sheetOrder.get(a.issue.sheetName) ?? 0) - (sheetOrder.get(b.issue.sheetName) ?? 0) ||
        (a.issue.rowNumber ?? 0) - (b.issue.rowNumber ?? 0) ||
        a.position - b.position
    )
    .map(({ issue }) => issue);
}

function formatIssue(issue: ExcelValidationIssue): string {
  const location = formatLocation(issue);
  return location ? `${location}: ${issue.reason}` : issue.reason;
}

function formatLocation({ sheetName, rowNumber, columnHeader }: ExcelValidationIssue): string {
  const sheet = sheetName ? `Sheet '${sheetName}'` : "";
  const row = rowNumber === undefined ? "" : `Row ${rowNumber}${columnHeader ? ` of '${columnHeader}' column` : ""}`;
  return [sheet, row].filter(Boolean).join(" - ");
}
