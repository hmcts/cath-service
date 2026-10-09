import { formatDdMmYyyyDate, normalizeTime, reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { SIAC_POAC_PAAC_EXCEL_CONFIG } from "../conversion/siac-poac-paac-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export async function reformatSiacPoacPaacWeeklyHearingListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  // The PDF shows the hearing date in long form and times with a colon, so the Excel formats them the same way
  return reformatUploadedWorkbook(buffer, [
    {
      worksheetIndex: 0,
      fields: SIAC_POAC_PAAC_EXCEL_CONFIG.fields,
      headers: t.tableHeaders,
      formatRow: (row) => ({ ...row, date: formatDdMmYyyyDate(row.date, locale), time: normalizeTime(row.time) })
    }
  ]);
}
