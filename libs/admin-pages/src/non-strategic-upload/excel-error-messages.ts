import type { ExcelValidationIssue } from "@hmcts/list-types-common";
import type { ValidationError } from "../manual-upload/model.js";

const FILE_INPUT_HREF = "#file";

/**
 * Turns located Excel validation issues into GOV.UK error summary items.
 * The wording follows PIP (English only): Sheet 'X' - Row N of 'Y' column.
 * Issues are ordered by tab (as received), then numeric row, then column (as received),
 * and identical lines are listed once, as PIP collects its errors in a set.
 */
export function formatExcelValidationErrors(issues: ExcelValidationIssue[]): ValidationError[] {
  const texts = sortIssues(issues).map(formatIssue);
  return [...new Set(texts)].map((text) => ({ text, href: FILE_INPUT_HREF }));
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

// PIP shows only the location for a row- or cell-level error. A tab-level or unlocated issue has no
// row to point at, so its reason is kept, as PIP shows the error detail when there is no location.
function formatIssue(issue: ExcelValidationIssue): string {
  const location = formatLocation(issue);
  if (issue.rowNumber !== undefined) {
    return location;
  }
  return location ? `${location}: ${issue.reason}` : issue.reason;
}

function formatLocation({ sheetName, rowNumber, columnHeader }: ExcelValidationIssue): string {
  const sheet = sheetName ? `Sheet '${sheetName}'` : "";
  const row = rowNumber === undefined ? "" : `Row ${rowNumber}${columnHeader ? ` of '${columnHeader}' column` : ""}`;
  return [sheet, row].filter(Boolean).join(" - ");
}
