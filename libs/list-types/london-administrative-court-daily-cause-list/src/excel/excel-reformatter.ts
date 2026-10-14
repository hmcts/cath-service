import { normaliseHearing, reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { LONDON_ADMIN_SHEETS } from "../conversion/london-administrative-court-daily-cause-list-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export async function reformatLondonAdministrativeCourtDailyCauseListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  return reformatUploadedWorkbook(
    buffer,
    LONDON_ADMIN_SHEETS.map((sheet) => ({
      worksheetName: sheet.worksheetName,
      worksheetIndex: sheet.worksheetIndex,
      fields: sheet.config.fields,
      headers: t.tableHeaders,
      formatRow: normaliseHearing
    }))
  );
}
