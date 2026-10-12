import { reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { FTT_LRT_EXCEL_CONFIG } from "../conversion/ftt-lrt-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export async function reformatFttLrtWeeklyHearingListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  // The uploaded excel file is re-used as-is: every value, including the date, is kept exactly as uploaded
  return reformatUploadedWorkbook(buffer, [{ worksheetIndex: 0, fields: FTT_LRT_EXCEL_CONFIG.fields, headers: t.tableHeaders, formatRow: (row) => row }]);
}
