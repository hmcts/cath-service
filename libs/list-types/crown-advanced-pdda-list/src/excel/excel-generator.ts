import { createSingleSheetExcelBuffer, saveExcelToStorage } from "@hmcts/list-types-common";
import { cy as cyLocale } from "../locales/cy.js";
import { en as enLocale } from "../locales/en.js";
import type { CrownAdvanceListData } from "../models/types.js";
import { renderCrownAdvanceListData, TO_BE_ALLOCATED_KEY } from "../rendering/renderer.js";

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

    const headers = [cols.hearing, cols.fixedFor, cols.caseReference, cols.defendant, cols.prosecutingAuthority, cols.linkedCases, cols.listingNotes];

    const rows = groupedCategories.flatMap((group) => {
      const categoryLabel = group.category === TO_BE_ALLOCATED_KEY ? t.toBeAllocated : group.category;
      return group.cases.map((row) => [
        categoryLabel ?? "",
        row.fixedFor ?? "",
        row.caseNumber ?? "",
        row.defendants ?? "",
        row.prosecutingAuthority ?? "",
        row.linkedCases ?? "",
        row.listingNotes ?? ""
      ]);
    });

    const buffer = await createSingleSheetExcelBuffer(SHEET_NAME, headers, rows);
    const { excelPath } = await saveExcelToStorage(artefactId, buffer);
    return { success: true, excelPath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to generate Crown Advance List Excel: ${errorMessage}` };
  }
}
