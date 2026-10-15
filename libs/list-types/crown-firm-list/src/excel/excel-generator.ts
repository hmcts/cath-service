import { createSingleSheetExcelBuffer, saveExcelToStorage } from "@hmcts/list-types-common";
import { cy as cyLocale } from "../locales/cy.js";
import { en as enLocale } from "../locales/en.js";
import type { CrownFirmListData } from "../models/types.js";
import { renderCrownFirmListData } from "../rendering/renderer.js";

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

    const headers = [
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
    ];

    const rows = groupedListData.flatMap(({ day, courtHouseInfo, sittings }) =>
      sittings.flatMap((sitting) => {
        const courtRoomLabel = sitting.formattedJudiciaries
          ? `${t.courtroom} ${sitting.courtRoomName}: ${sitting.formattedJudiciaries}`
          : `${t.courtroom} ${sitting.courtRoomName}`;
        return sitting.hearing.flatMap((hearing) =>
          hearing.case.map((caseItem) => [
            day ?? "",
            courtHouseInfo.name ?? "",
            courtHouseInfo.addressLines.join(", "),
            courtHouseInfo.phone ?? "",
            courtRoomLabel,
            sitting.time ?? "",
            caseItem.timeMarkingNote ?? "",
            caseItem.caseNumber ?? "",
            caseItem.defendants ?? "",
            hearing.displayHearingType ?? "",
            caseItem.representative ?? "",
            caseItem.prosecutingAuthority ?? "",
            caseItem.listingNotes ?? ""
          ])
        );
      })
    );

    const buffer = await createSingleSheetExcelBuffer(SHEET_NAME, headers, rows);
    const { excelPath } = await saveExcelToStorage(artefactId, buffer);
    return { success: true, excelPath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to generate Crown Firm List Excel: ${errorMessage}` };
  }
}
