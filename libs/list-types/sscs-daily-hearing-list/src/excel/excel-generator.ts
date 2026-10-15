import { autoFitColumns, sanitiseCellValue, saveExcelToStorage } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { SscsDailyHearing, SscsDailyHearingList } from "../models/types.js";

// Same order as the PDF table columns
const COLUMNS: (keyof SscsDailyHearing)[] = [
  "venue",
  "appealReferenceNumber",
  "hearingType",
  "appellant",
  "courtroom",
  "hearingTime",
  "tribunal",
  "respondent",
  "additionalInformation"
];

export async function generateSscsDailyHearingListExcel(options: ExcelGenerationOptions): Promise<ExcelGenerationResult> {
  const { artefactId, locale, jsonData } = options;

  try {
    const t = locale === "cy" ? cy : en;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(t.excelWorksheetName, { views: [{ state: "frozen", ySplit: 1 }] });

    const headerRow = worksheet.addRow(COLUMNS.map((column) => t.tableHeaders[column]));
    headerRow.font = { bold: true };

    // The SSCS PDF prints each hearing's values unchanged, so the rows need no formatting
    for (const hearing of jsonData) {
      worksheet.addRow(COLUMNS.map((column) => sanitiseCellValue(hearing[column] ?? "")));
    }

    autoFitColumns(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();
    const { excelPath } = await saveExcelToStorage(artefactId, Buffer.from(buffer));

    return { success: true, excelPath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to generate SSCS Excel: ${errorMessage}` };
  }
}

interface ExcelGenerationOptions {
  artefactId: string;
  locale: string;
  jsonData: SscsDailyHearingList;
}

interface ExcelGenerationResult {
  success: boolean;
  excelPath?: string;
  error?: string;
}
