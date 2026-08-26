import { autoFitColumns, sanitiseCellValue, saveExcelToStorage } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { cyDaily, cyFuture } from "../locales/cy.js";
import { enDaily, enFuture } from "../locales/en.js";
import { type MagistratesAdultCourtListData, renderMagistratesAdultCourtList } from "../rendering/renderer.js";

// ExcelJS rejects worksheet names longer than 31 characters.
const MAX_SHEET_NAME_LENGTH = 31;

interface ExcelGenerationOptions {
  artefactId: string;
  locationId: string;
  contentDate: Date;
  locale: string;
  listTypeName: string;
  jsonData: MagistratesAdultCourtListData;
}

interface ExcelGenerationResult {
  success: boolean;
  excelPath?: string;
  error?: string;
}

export async function generateMagistratesAdultCourtListExcel(options: ExcelGenerationOptions): Promise<ExcelGenerationResult> {
  const { artefactId, locationId, contentDate, locale, listTypeName, jsonData } = options;

  try {
    const isFuture = listTypeName === "MAGISTRATES_ADULT_COURT_LIST_FUTURE";
    const t = locale === "cy" ? (isFuture ? cyFuture : cyDaily) : isFuture ? enFuture : enDaily;
    const cols = t.excelColumns;

    const { listData } = await renderMagistratesAdultCourtList(jsonData, { locationId, contentDate, locale });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(t.title.slice(0, MAX_SHEET_NAME_LENGTH));

    const headerRow = worksheet.addRow([
      cols.courtHouse,
      cols.sittingAt,
      cols.lja,
      cols.sessionStart,
      cols.blockStart,
      cols.defendantName,
      cols.dateOfBirth,
      cols.address,
      cols.age,
      cols.informant,
      cols.caseNumber,
      cols.offenceCode,
      cols.offenceTitle,
      cols.offenceSummary
    ]);
    headerRow.font = { bold: true };

    for (const session of listData.sessions) {
      for (const caseItem of session.cases) {
        worksheet.addRow([
          sanitiseCellValue(session.court),
          sanitiseCellValue(`${t.courtroom} ${session.room}`),
          sanitiseCellValue(session.lja),
          sanitiseCellValue(session.sessionStart),
          sanitiseCellValue(caseItem.blockStart),
          sanitiseCellValue(caseItem.defendantName),
          sanitiseCellValue(caseItem.dateOfBirth),
          sanitiseCellValue(caseItem.address),
          sanitiseCellValue(caseItem.age),
          sanitiseCellValue(caseItem.informant),
          sanitiseCellValue(caseItem.caseNumber),
          sanitiseCellValue(caseItem.offenceCode),
          sanitiseCellValue(caseItem.offenceTitle),
          sanitiseCellValue(caseItem.offenceSummary)
        ]);
      }
    }

    autoFitColumns(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();
    const { excelPath } = await saveExcelToStorage(artefactId, Buffer.from(buffer));

    return { success: true, excelPath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to generate MACL Excel: ${errorMessage}` };
  }
}
