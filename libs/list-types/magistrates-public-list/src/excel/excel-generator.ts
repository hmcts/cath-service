import { sanitiseCellValue, saveExcelToStorage } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { cy as cyLocale } from "../locales/cy.js";
import { en as enLocale } from "../locales/en.js";
import { type MagistratesPublicListData, renderMagistratesPublicListData } from "../rendering/renderer.js";

const UNALLOCATED_COURT_ROOM = "to be allocated";

interface ExcelGenerationOptions {
  artefactId: string;
  locationId: string;
  contentDate: Date;
  locale: string;
  jsonData: MagistratesPublicListData;
}

interface ExcelGenerationResult {
  success: boolean;
  excelPath?: string;
  error?: string;
}

export async function generateMagistratesPublicListExcel(options: ExcelGenerationOptions): Promise<ExcelGenerationResult> {
  const { artefactId, locationId, contentDate, locale, jsonData } = options;

  try {
    const t = locale === "cy" ? cyLocale : enLocale;
    const cols = t.excelColumns;

    const { header, listData } = await renderMagistratesPublicListData(jsonData, { locationId, contentDate, locale });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(t.title);

    const headerRow = worksheet.addRow([
      cols.courtHouse,
      cols.courtRoom,
      cols.sittingAt,
      cols.urn,
      cols.name,
      cols.hearingType,
      cols.prosecutingAuthority,
      cols.offenceDetails,
      cols.reportingRestrictions
    ]);
    headerRow.font = { bold: true };

    for (const courtList of listData.courtLists) {
      const courtHouseName = header.locationName;

      for (const courtRoom of courtList.courtHouse.courtRoom) {
        for (const session of courtRoom.session) {
          const isUnallocated = courtRoom.courtRoomName.trim().toLowerCase() === UNALLOCATED_COURT_ROOM;
          const courtRoomName =
            session.formattedJudiciaries && !isUnallocated ? `${courtRoom.courtRoomName}: ${session.formattedJudiciaries}` : courtRoom.courtRoomName;

          for (const sitting of session.sittings) {
            for (const hearing of sitting.hearing) {
              for (const caseItem of hearing.case ?? []) {
                const offenceDetails = (caseItem.offences ?? []).join(", ");
                const reportingRestrictions = caseItem.reportingRestriction ? t.reportingRestrictionText : "";

                worksheet.addRow([
                  sanitiseCellValue(courtHouseName),
                  sanitiseCellValue(courtRoomName),
                  sanitiseCellValue(sitting.time ?? ""),
                  sanitiseCellValue(caseItem.caseUrn ?? ""),
                  sanitiseCellValue(caseItem.defendant ?? ""),
                  sanitiseCellValue(hearing.hearingType ?? ""),
                  sanitiseCellValue(caseItem.prosecutingAuthority ?? ""),
                  sanitiseCellValue(offenceDetails),
                  sanitiseCellValue(reportingRestrictions)
                ]);
              }

              for (const application of hearing.application ?? []) {
                const offenceDetails = (application.offences ?? []).join(", ");

                worksheet.addRow([
                  sanitiseCellValue(courtHouseName),
                  sanitiseCellValue(courtRoomName),
                  sanitiseCellValue(sitting.time ?? ""),
                  sanitiseCellValue(application.applicationReference ?? ""),
                  sanitiseCellValue(application.defendant ?? ""),
                  sanitiseCellValue(""),
                  sanitiseCellValue(application.prosecutingAuthority ?? ""),
                  sanitiseCellValue(offenceDetails),
                  sanitiseCellValue("")
                ]);
              }
            }
          }
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const { excelPath } = await saveExcelToStorage(artefactId, Buffer.from(buffer));

    return { success: true, excelPath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to generate MPL Excel: ${errorMessage}` };
  }
}
