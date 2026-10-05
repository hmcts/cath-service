import { autoFitColumns, sanitiseCellValue, saveExcelToStorage } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { cy as cyLocale } from "../locales/cy.js";
import { en as enLocale } from "../locales/en.js";
import type { CrownDailyListData } from "../models/types.js";
import { renderCrownDailyListData } from "../rendering/renderer.js";

const MAX_SHEET_NAME_LENGTH = 31;
const SHEET_NAME = "Crown Daily List";

interface ExcelGenerationOptions {
  artefactId: string;
  locationId: string;
  contentDate: Date;
  locale: string;
  listTypeName: string;
  jsonData: CrownDailyListData;
}

interface ExcelGenerationResult {
  success: boolean;
  excelPath?: string;
  error?: string;
}

export async function generateCrownDailyListExcel(options: ExcelGenerationOptions): Promise<ExcelGenerationResult> {
  const { artefactId, locationId, contentDate, locale, jsonData } = options;

  try {
    const t = locale === "cy" ? cyLocale : enLocale;
    const cols = t.excelColumns;

    const { listData } = await renderCrownDailyListData(jsonData, { locale, locationId, contentDate });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(SHEET_NAME.slice(0, MAX_SHEET_NAME_LENGTH));

    const headerRow = worksheet.addRow([
      cols.courtHouse,
      cols.courtAddress,
      cols.courtPhone,
      cols.courtRoom,
      cols.sittingAt,
      cols.hearingTime,
      cols.caseReference,
      cols.defendant,
      cols.hearingType,
      cols.prosecutingAuthority,
      cols.listingNotes
    ]);
    headerRow.font = { bold: true };

    for (const courtList of listData.courtLists) {
      const courtHouseName = courtList.courtHouse.courtHouseName;
      const courtHouseAddress = courtList.courtHouse.courtHouseAddressLines.join(", ");
      const courtHousePhone = courtList.courtHouse.courtHousePhone;
      for (const courtRoom of courtList.courtHouse.courtRoom) {
        for (const session of courtRoom.session) {
          const courtRoomLabel = session.formattedJudiciaries
            ? `${t.court} ${courtRoom.courtRoomName}: ${session.formattedJudiciaries}`
            : `${t.court} ${courtRoom.courtRoomName}`;
          for (const sitting of session.sittings) {
            for (const hearing of sitting.hearing) {
              for (const caseItem of hearing.case) {
                worksheet.addRow([
                  sanitiseCellValue(courtHouseName ?? ""),
                  sanitiseCellValue(courtHouseAddress ?? ""),
                  sanitiseCellValue(courtHousePhone ?? ""),
                  sanitiseCellValue(courtRoomLabel),
                  sanitiseCellValue(sitting.time ?? ""),
                  sanitiseCellValue(caseItem.timeMarkingNote ?? ""),
                  sanitiseCellValue(caseItem.caseNumber ?? ""),
                  sanitiseCellValue(caseItem.defendants ?? ""),
                  sanitiseCellValue(hearing.displayHearingType ?? ""),
                  sanitiseCellValue(caseItem.prosecutingAuthority ?? ""),
                  sanitiseCellValue(caseItem.listingNotes ?? "")
                ]);
              }
            }
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
    return { success: false, error: `Failed to generate Crown Daily List Excel: ${errorMessage}` };
  }
}
