import { type FlatListExcelResult, generateFlatListExcel } from "@hmcts/list-types-common";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { UtiacStatutoryAppealHearing, UtiacStatutoryAppealHearingList } from "../models/types.js";
import { renderUtiacStatutoryAppealDailyHearingListData } from "../rendering/renderer.js";

export async function generateUtiacStatutoryAppealDailyHearingListExcel(options: UtiacStatutoryAppealExcelGenerationOptions): Promise<FlatListExcelResult> {
  const t = options.locale === "cy" ? cy : en;
  const { hearings } = renderUtiacStatutoryAppealDailyHearingListData(options.jsonData, {
    locale: options.locale,
    courtName: t.pageTitle,
    contentDate: options.contentDate,
    lastReceivedDate: new Date().toISOString(),
    listTitle: t.pageTitle
  });

  return generateFlatListExcel<UtiacStatutoryAppealHearing>({
    artefactId: options.artefactId,
    rows: hearings,
    columns: [
      { header: t.tableHeaders.hearingTime, value: (h) => h.hearingTime },
      { header: t.tableHeaders.appellant, value: (h) => h.appellant },
      { header: t.tableHeaders.representative, value: (h) => h.representative },
      { header: t.tableHeaders.appealReferenceNumber, value: (h) => h.appealReferenceNumber },
      { header: t.tableHeaders.judges, value: (h) => h.judges },
      { header: t.tableHeaders.hearingType, value: (h) => h.hearingType },
      { header: t.tableHeaders.location, value: (h) => h.location },
      { header: t.tableHeaders.additionalInformation, value: (h) => h.additionalInformation }
    ]
  });
}

interface UtiacStatutoryAppealExcelGenerationOptions {
  artefactId: string;
  contentDate: Date;
  locale: string;
  jsonData: UtiacStatutoryAppealHearingList;
}
