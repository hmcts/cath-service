import { type FlatListExcelResult, generateFlatListExcel } from "@hmcts/list-types-common";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { UtiacJrHearing, UtiacJrHearingList } from "../models/types.js";
import { renderUtiacJrDailyHearingListData } from "../rendering/renderer.js";

export async function generateUtiacJrDailyHearingListExcel(options: UtiacJrExcelGenerationOptions): Promise<FlatListExcelResult> {
  const t = options.locale === "cy" ? cy : en;
  const { hearings } = renderUtiacJrDailyHearingListData(options.jsonData, {
    locale: options.locale,
    courtName: t.courtName,
    contentDate: options.contentDate,
    lastReceivedDate: new Date().toISOString(),
    listTitle: t.courtName
  });

  return generateFlatListExcel<UtiacJrHearing>({
    artefactId: options.artefactId,
    rows: hearings,
    columns: [
      { header: t.tableHeaders.venue, value: (h) => h.venue },
      { header: t.tableHeaders.judges, value: (h) => h.judges },
      { header: t.tableHeaders.hearingTime, value: (h) => h.hearingTime },
      { header: t.tableHeaders.caseReferenceNumber, value: (h) => h.caseReferenceNumber },
      { header: t.tableHeaders.caseTitle, value: (h) => h.caseTitle },
      { header: t.tableHeaders.hearingType, value: (h) => h.hearingType },
      { header: t.tableHeaders.additionalInformation, value: (h) => h.additionalInformation }
    ]
  });
}

interface UtiacJrExcelGenerationOptions {
  artefactId: string;
  contentDate: Date;
  locale: string;
  jsonData: UtiacJrHearingList;
}
