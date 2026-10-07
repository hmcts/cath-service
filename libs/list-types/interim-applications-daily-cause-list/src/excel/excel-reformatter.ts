import { reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { INTERIM_APPLICATIONS_HEARINGS_CONFIG } from "../conversion/interim-applications-daily-cause-list-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export async function reformatInterimApplicationsDailyCauseListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  // The PDF prints hearings as uploaded. The open justice tab only feeds a paragraph in the PDF, not a table, so it is left out
  return reformatUploadedWorkbook(buffer, [
    { worksheetName: "Hearing List", worksheetIndex: 0, fields: INTERIM_APPLICATIONS_HEARINGS_CONFIG.fields, headers: t.tableHeaders, formatRow: (row) => row }
  ]);
}
