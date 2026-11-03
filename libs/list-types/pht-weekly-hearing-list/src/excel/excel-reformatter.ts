import { formatDdMmYyyyDate, reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { PHT_EXCEL_CONFIG } from "../conversion/pht-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export async function reformatPhtWeeklyHearingListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  // The PDF shows the hearing date in long form, so the Excel formats it the same way
  return reformatUploadedWorkbook(buffer, [
    {
      worksheetIndex: 0,
      fields: PHT_EXCEL_CONFIG.fields,
      headers: t.tableHeaders,
      formatRow: (row) => ({ ...row, date: formatDdMmYyyyDate(row.date, locale) })
    }
  ]);
}
