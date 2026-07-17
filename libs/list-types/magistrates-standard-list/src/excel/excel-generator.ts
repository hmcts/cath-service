import { sanitiseCellValue, saveExcelToStorage } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { cy as cyLocale } from "../locales/cy.js";
import { en as enLocale } from "../locales/en.js";
import type { MagistratesStandardList } from "../models/types.js";
import { renderMagistratesStandardListData } from "../rendering/renderer.js";

interface ExcelGenerationOptions {
  artefactId: string;
  locationId: string;
  contentDate: Date;
  locale: string;
  jsonData: MagistratesStandardList;
}

interface ExcelGenerationResult {
  success: boolean;
  excelPath?: string;
  error?: string;
}

export async function generateMagistratesStandardListExcel(options: ExcelGenerationOptions): Promise<ExcelGenerationResult> {
  const { artefactId, locationId, contentDate, locale, jsonData } = options;

  try {
    const t = locale === "cy" ? cyLocale : enLocale;
    const cols = t.excelColumns;

    const { listData } = await renderMagistratesStandardListData(jsonData, { locale, locationId, contentDate });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(t.title);

    const headerRow = worksheet.addRow([
      cols.courtHouse,
      cols.lja,
      cols.courtRoom,
      cols.sittingAt,
      cols.name,
      cols.applicationParticulars,
      cols.dob,
      cols.age,
      cols.address,
      cols.prosecutingAuthorityName,
      cols.attendanceMethod,
      cols.reference,
      cols.applicationType,
      cols.asn,
      cols.hearingType,
      cols.panel,
      cols.reportingRestrictions,
      cols.offenceCode,
      cols.offenceTitle,
      cols.offenceDetails,
      cols.legislation,
      cols.maxPenalty,
      cols.plea,
      cols.dateOfPlea,
      cols.convictedOn,
      cols.adjournedFrom
    ]);
    headerRow.font = { bold: true };

    for (const courtRoom of listData) {
      for (const sitting of courtRoom.sittings) {
        for (const hearing of sitting.hearings) {
          const reportingRestrictions = hearing.reportingRestriction ? t.reportingRestrictionText : "";

          if (hearing.offences.length === 0) {
            worksheet.addRow([
              sanitiseCellValue(courtRoom.courtHouseName),
              sanitiseCellValue(courtRoom.lja),
              sanitiseCellValue(courtRoom.courtRoomName),
              sanitiseCellValue(hearing.sittingStartTime),
              sanitiseCellValue(hearing.partyInfo.name),
              sanitiseCellValue(hearing.applicationParticulars),
              sanitiseCellValue(hearing.partyInfo.dob),
              sanitiseCellValue(hearing.partyInfo.age),
              sanitiseCellValue(hearing.partyInfo.address),
              sanitiseCellValue(hearing.prosecutingAuthority),
              sanitiseCellValue(hearing.attendanceMethod),
              sanitiseCellValue(hearing.reference),
              sanitiseCellValue(hearing.applicationType),
              sanitiseCellValue(hearing.partyInfo.asn),
              sanitiseCellValue(hearing.hearingType),
              sanitiseCellValue(hearing.panel),
              sanitiseCellValue(reportingRestrictions),
              sanitiseCellValue(""),
              sanitiseCellValue(""),
              sanitiseCellValue(""),
              sanitiseCellValue(""),
              sanitiseCellValue(""),
              sanitiseCellValue(""),
              sanitiseCellValue(""),
              sanitiseCellValue(""),
              sanitiseCellValue("")
            ]);
          } else {
            for (const offence of hearing.offences) {
              worksheet.addRow([
                sanitiseCellValue(courtRoom.courtHouseName),
                sanitiseCellValue(courtRoom.lja),
                sanitiseCellValue(courtRoom.courtRoomName),
                sanitiseCellValue(hearing.sittingStartTime),
                sanitiseCellValue(hearing.partyInfo.name),
                sanitiseCellValue(hearing.applicationParticulars),
                sanitiseCellValue(hearing.partyInfo.dob),
                sanitiseCellValue(hearing.partyInfo.age),
                sanitiseCellValue(hearing.partyInfo.address),
                sanitiseCellValue(hearing.prosecutingAuthority),
                sanitiseCellValue(hearing.attendanceMethod),
                sanitiseCellValue(hearing.reference),
                sanitiseCellValue(hearing.applicationType),
                sanitiseCellValue(hearing.partyInfo.asn),
                sanitiseCellValue(hearing.hearingType),
                sanitiseCellValue(hearing.panel),
                sanitiseCellValue(reportingRestrictions),
                sanitiseCellValue(offence.offenceCode),
                sanitiseCellValue(offence.offenceTitle),
                sanitiseCellValue(offence.offenceWording),
                sanitiseCellValue(offence.offenceLegislation),
                sanitiseCellValue(offence.offenceMaxPenalty),
                sanitiseCellValue(offence.plea),
                sanitiseCellValue(offence.pleaDate),
                sanitiseCellValue(offence.convictionDate),
                sanitiseCellValue(offence.adjournedDate)
              ]);
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
    return { success: false, error: `Failed to generate MSL Excel: ${errorMessage}` };
  }
}
