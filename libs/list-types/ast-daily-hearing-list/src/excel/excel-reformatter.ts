import { normalizeTime, reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { AST_EXCEL_CONFIG } from "../conversion/ast-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export async function reformatAstDailyHearingListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  // The PDF shows hearing times with a colon, so the Excel formats them the same way
  return reformatUploadedWorkbook(buffer, [
    {
      worksheetIndex: 0,
      fields: AST_EXCEL_CONFIG.fields,
      headers: t.tableHeaders,
      formatRow: (row) => ({ ...row, hearingTime: normalizeTime(row.hearingTime) })
    }
  ]);
}
