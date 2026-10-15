import { reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { SSCS_EXCEL_CONFIG } from "../conversion/sscs-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export async function reformatSscsDailyHearingListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  // The SSCS PDF prints the converted values as they are, so rows need no extra formatting
  return reformatUploadedWorkbook(buffer, [{ worksheetIndex: 0, fields: SSCS_EXCEL_CONFIG.fields, headers: t.tableHeaders, formatRow: (row) => row }]);
}
