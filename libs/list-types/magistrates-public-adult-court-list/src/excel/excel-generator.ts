import { autoFitColumns, sanitiseCellValue, saveExcelToStorage } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { cy as cyLocale } from "../locales/cy.js";
import { en as enLocale } from "../locales/en.js";
import { type MagistratesPublicAdultCourtListData, renderMagistratesPublicAdultCourtListData } from "../rendering/renderer.js";

// ExcelJS rejects worksheet names longer than 31 characters.
const MAX_SHEET_NAME_LENGTH = 31;
const SHEET_NAME = "Magistrates Public Adult Court";

interface ExcelGenerationOptions {
  artefactId: string;
  locationId: string;
  contentDate: Date;
  locale: string;
  listTypeName: string;
  jsonData: MagistratesPublicAdultCourtListData;
}

interface ExcelGenerationResult {
  success: boolean;
  excelPath?: string;
  error?: string;
}

export async function generateMagistratesPublicAdultCourtListExcel(options: ExcelGenerationOptions): Promise<ExcelGenerationResult> {
  const { artefactId, locationId, contentDate, locale, jsonData } = options;

  try {
    const t = locale === "cy" ? cyLocale : enLocale;
    const cols = t.excelColumns;

    const { listData } = await renderMagistratesPublicAdultCourtListData(jsonData, { locationId, contentDate, locale });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(SHEET_NAME.slice(0, MAX_SHEET_NAME_LENGTH));

    const headerRow = worksheet.addRow([cols.courtHouse, cols.sittingAt, cols.lja, cols.sessionStart, cols.listingTime, cols.defendantName, cols.caseNumber]);
    headerRow.font = { bold: true };

    for (const session of listData) {
      for (const caseItem of session.cases) {
        worksheet.addRow([
          sanitiseCellValue(session.courtName),
          sanitiseCellValue(`${t.courtRoom} ${session.courtRoom}`),
          sanitiseCellValue(session.lja),
          sanitiseCellValue(session.sessionStartTime),
          sanitiseCellValue(caseItem.blockStartTime),
          sanitiseCellValue(caseItem.defendantName),
          sanitiseCellValue(caseItem.caseNumber)
        ]);
      }
    }

    autoFitColumns(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();
    const { excelPath } = await saveExcelToStorage(artefactId, Buffer.from(buffer));

    return { success: true, excelPath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to generate MPACL Excel: ${errorMessage}` };
  }
}
