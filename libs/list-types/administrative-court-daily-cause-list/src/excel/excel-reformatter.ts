import { normaliseHearing, reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { ADMIN_COURT_EXCEL_CONFIG } from "../conversion/administrative-court-daily-cause-list-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export async function reformatAdministrativeCourtDailyCauseListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  return reformatUploadedWorkbook(buffer, [
    {
      worksheetIndex: 0,
      fields: ADMIN_COURT_EXCEL_CONFIG.fields,
      headers: t.common.tableHeaders,
      formatRow: normaliseHearing
    }
  ]);
}
