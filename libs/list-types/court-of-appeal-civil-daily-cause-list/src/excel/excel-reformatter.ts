import { normaliseHearing, type ReformatSheetConfig, reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { COURT_OF_APPEAL_CIVIL_SHEETS } from "../conversion/court-of-appeal-civil-daily-cause-list-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import { formatFutureJudgment } from "../rendering/renderer.js";

const FUTURE_JUDGMENTS_DATA_KEY = "futureJudgments";

export async function reformatCourtOfAppealCivilDailyCauseListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  const sheets: ReformatSheetConfig[] = COURT_OF_APPEAL_CIVIL_SHEETS.map((sheet) => ({
    worksheetName: sheet.worksheetName,
    worksheetIndex: sheet.worksheetIndex,
    fields: sheet.config.fields,
    headers: t.tableHeaders,
    formatRow: sheet.dataKey === FUTURE_JUDGMENTS_DATA_KEY ? (row) => formatFutureJudgment(row, locale) : normaliseHearing
  }));

  return reformatUploadedWorkbook(buffer, sheets);
}
