import { normaliseHearing, reformatUploadedWorkbook } from "@hmcts/list-types-common";
import { BUSINESS_AND_PROPERTY_SHEETS } from "../conversion/business-and-property-division-rolls-building-daily-cause-list-config.js";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

export async function reformatBusinessAndPropertyDivisionRollsBuildingDailyCauseListExcel(buffer: Buffer, locale: string): Promise<Buffer> {
  const t = locale === "cy" ? cy : en;

  // Every section shares the same columns, so a positional fallback would publish a tab the converter never read
  return reformatUploadedWorkbook(
    buffer,
    BUSINESS_AND_PROPERTY_SHEETS.map((sheet) => ({
      worksheetName: sheet.worksheetName,
      worksheetIndex: sheet.worksheetIndex,
      matchByNameOnly: true,
      fields: sheet.config.fields,
      headers: t.tableHeaders,
      formatRow: normaliseHearing
    }))
  );
}
