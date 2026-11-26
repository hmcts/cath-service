import { reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { SEND_EXCEL_CONFIG } from "../conversion/send-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export async function reformatSendDailyHearingListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  // The SEND PDF prints the converted values as they are, so rows need no extra formatting
  return reformatUploadedWorkbook(buffer, [{ worksheetIndex: 0, fields: SEND_EXCEL_CONFIG.fields, headers: t.tableHeaders, formatRow: (row) => row }]);
}
