import { createSingleSheetExcelBuffer, saveExcelToStorage } from "@hmcts/list-types-common";
import { cy as cyLocale } from "../locales/cy.js";
import { en as enLocale } from "../locales/en.js";
import type { CrownDailyListData } from "../models/types.js";
import { renderCrownDailyListData } from "../rendering/renderer.js";

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

    const headers = [
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
    ];

    const rows = listData.courtLists.flatMap(({ courtHouse }) =>
      courtHouse.courtRoom.flatMap((courtRoom) =>
        courtRoom.session.flatMap((session) => {
          const courtRoomLabel = session.formattedJudiciaries
            ? `${t.court} ${courtRoom.courtRoomName}: ${session.formattedJudiciaries}`
            : `${t.court} ${courtRoom.courtRoomName}`;
          return session.sittings.flatMap((sitting) =>
            sitting.hearing.flatMap((hearing) =>
              hearing.case.map((caseItem) => [
                courtHouse.courtHouseName ?? "",
                courtHouse.courtHouseAddressLines.join(", "),
                courtHouse.courtHousePhone ?? "",
                courtRoomLabel,
                sitting.time ?? "",
                caseItem.timeMarkingNote ?? "",
                caseItem.caseNumber ?? "",
                caseItem.defendants ?? "",
                hearing.displayHearingType ?? "",
                caseItem.prosecutingAuthority ?? "",
                caseItem.listingNotes ?? ""
              ])
            )
          );
        })
      )
    );

    const buffer = await createSingleSheetExcelBuffer(SHEET_NAME, headers, rows);
    const { excelPath } = await saveExcelToStorage(artefactId, buffer);
    return { success: true, excelPath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to generate Crown Daily List Excel: ${errorMessage}` };
  }
}
