import { autoFitColumns, sanitiseCellValue, saveExcelToStorage } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { cy as cyLocale } from "../locales/cy.js";
import { en as enLocale } from "../locales/en.js";
import type { CrownAdvanceListData } from "../models/types.js";
import { renderCrownAdvanceListData, TO_BE_ALLOCATED_KEY } from "../rendering/renderer.js";

const MAX_SHEET_NAME_LENGTH = 31;
const SHEET_NAME = "Crown Advance List";

interface ExcelGenerationOptions {
  artefactId: string;
  locationId: string;
  contentDate: Date;
  locale: string;
  listTypeName: string;
  jsonData: CrownAdvanceListData;
}

interface ExcelGenerationResult {
  success: boolean;
  excelPath?: string;
  error?: string;
}

export async function generateCrownAdvanceListExcel(options: ExcelGenerationOptions): Promise<ExcelGenerationResult> {
  const { artefactId, locationId, contentDate, locale, jsonData } = options;

  try {
    const t = locale === "cy" ? cyLocale : enLocale;
    const cols = t.excelColumns;

    const { groupedCategories } = await renderCrownAdvanceListData(jsonData, { locale, locationId, contentDate });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(SHEET_NAME.slice(0, MAX_SHEET_NAME_LENGTH));

    const headerRow = worksheet.addRow([
      cols.hearing,
      cols.fixedFor,
      cols.caseReference,
      cols.defendant,
      cols.prosecutingAuthority,
      cols.linkedCases,
      cols.listingNotes
    ]);
    headerRow.font = { bold: true };

    for (const group of groupedCategories) {
      const categoryLabel = group.category === TO_BE_ALLOCATED_KEY ? t.toBeAllocated : group.category;
      for (const row of group.cases) {
        worksheet.addRow([
          sanitiseCellValue(categoryLabel ?? ""),
          sanitiseCellValue(row.fixedFor ?? ""),
          sanitiseCellValue(row.caseNumber ?? ""),
          sanitiseCellValue(row.defendants ?? ""),
          sanitiseCellValue(row.prosecutingAuthority ?? ""),
          sanitiseCellValue(row.linkedCases ?? ""),
          sanitiseCellValue(row.listingNotes ?? "")
        ]);
      }
    }

    autoFitColumns(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();
    const { excelPath } = await saveExcelToStorage(artefactId, Buffer.from(buffer));

    return { success: true, excelPath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to generate Crown Advance List Excel: ${errorMessage}` };
  }
}
