import { formatDdMmYyyyDate, reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { WPAFCC_EXCEL_CONFIG } from "../conversion/wpafcc-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export async function reformatWpafccWeeklyHearingListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  // The PDF prints the hearing date in long form and every other value as uploaded
  return reformatUploadedWorkbook(buffer, [
    {
      worksheetIndex: 0,
      fields: WPAFCC_EXCEL_CONFIG.fields,
      headers: t.tableHeaders,
      formatRow: (row) => ({ ...row, date: formatDdMmYyyyDate(row.date, locale) })
    }
  ]);
}
