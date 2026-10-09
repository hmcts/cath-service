import { formatDdMmYyyyDate, reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { CIC_EXCEL_CONFIG } from "../conversion/cic-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export async function reformatCicWeeklyHearingListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  // The converter's field is "venue/platform" but the locale key is venuePlatform; without the alias the uploaded
  // English heading would be kept in a Welsh workbook
  const headers = { ...t.tableHeaders, "venue/platform": t.tableHeaders.venuePlatform };

  // The PDF shows the hearing date in long form, so the Excel formats it the same way
  return reformatUploadedWorkbook(buffer, [
    {
      worksheetIndex: 0,
      fields: CIC_EXCEL_CONFIG.fields,
      headers,
      formatRow: (row) => ({ ...row, date: formatDdMmYyyyDate(row.date, locale) })
    }
  ]);
}
