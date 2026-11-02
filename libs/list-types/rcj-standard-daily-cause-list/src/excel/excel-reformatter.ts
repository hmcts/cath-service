import { normaliseHearing, reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { STANDARD_EXCEL_CONFIG } from "../conversion/rcj-standard-daily-cause-list-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export async function reformatRcjStandardDailyCauseListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  return reformatUploadedWorkbook(buffer, [
    {
      worksheetIndex: 0,
      fields: STANDARD_EXCEL_CONFIG.fields,
      headers: t.common.tableHeaders,
      formatRow: normaliseHearing
    }
  ]);
}
