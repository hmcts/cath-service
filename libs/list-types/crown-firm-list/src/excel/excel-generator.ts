import { autoFitColumns, sanitiseCellValue, saveExcelToStorage } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { cy as cyLocale } from "../locales/cy.js";
import { en as enLocale } from "../locales/en.js";
import type { CrownFirmListData } from "../models/types.js";
import { renderCrownFirmListData } from "../rendering/renderer.js";

const MAX_SHEET_NAME_LENGTH = 31;
const SHEET_NAME = "Crown Firm List";

interface ExcelGenerationOptions {
  artefactId: string;
  locationId: string;
  contentDate: Date;
  locale: string;
  listTypeName: string;
  jsonData: CrownFirmListData;
}

interface ExcelGenerationResult {
  success: boolean;
  excelPath?: string;
  error?: string;
}

export async function generateCrownFirmListExcel(options: ExcelGenerationOptions): Promise<ExcelGenerationResult> {
  const { artefactId, locationId, contentDate, locale, jsonData } = options;

  try {
    const t = locale === "cy" ? cyLocale : enLocale;
    const cols = t.excelColumns;

    const { groupedListData } = await renderCrownFirmListData(jsonData, { locale, locationId, contentDate });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(SHEET_NAME.slice(0, MAX_SHEET_NAME_LENGTH));

    const headerRow = worksheet.addRow([
      cols.date,
      cols.courtHouse,
      cols.courtAddress,
      cols.courtPhone,
      cols.courtRoom,
      cols.sittingAt,
      cols.hearingTime,
      cols.caseNumber,
      cols.defendant,
      cols.hearingType,
      cols.representative,
      cols.prosecutingAuthority,
      cols.listingNotes
    ]);
    headerRow.font = { bold: true };

    for (const groupedDay of groupedListData) {
      const courtHouseName = groupedDay.courtHouseInfo.name;
      const courtHouseAddress = groupedDay.courtHouseInfo.addressLines.join(", ");
      const courtHousePhone = groupedDay.courtHouseInfo.phone;
      for (const sitting of groupedDay.sittings) {
        const courtRoomLabel = sitting.formattedJudiciaries
          ? `${t.courtroom} ${sitting.courtRoomName}: ${sitting.formattedJudiciaries}`
          : `${t.courtroom} ${sitting.courtRoomName}`;
        for (const hearing of sitting.hearing) {
          for (const caseItem of hearing.case) {
            worksheet.addRow([
              sanitiseCellValue(groupedDay.day ?? ""),
              sanitiseCellValue(courtHouseName ?? ""),
              sanitiseCellValue(courtHouseAddress ?? ""),
              sanitiseCellValue(courtHousePhone ?? ""),
              sanitiseCellValue(courtRoomLabel),
              sanitiseCellValue(sitting.time ?? ""),
              sanitiseCellValue(caseItem.timeMarkingNote ?? ""),
              sanitiseCellValue(caseItem.caseNumber ?? ""),
              sanitiseCellValue(caseItem.defendants ?? ""),
              sanitiseCellValue(hearing.displayHearingType ?? ""),
              sanitiseCellValue(caseItem.representative ?? ""),
              sanitiseCellValue(caseItem.prosecutingAuthority ?? ""),
              sanitiseCellValue(caseItem.listingNotes ?? "")
            ]);
          }
        }
      }
    }

    autoFitColumns(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();
    const { excelPath } = await saveExcelToStorage(artefactId, Buffer.from(buffer));

    return { success: true, excelPath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to generate Crown Firm List Excel: ${errorMessage}` };
  }
}
