import { type FlatListExcelResult, generateFlatListExcel } from "@hmcts/list-types-common";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { UtccHearing, UtccHearingList } from "../models/types.js";
import { renderUtccDailyHearingListData } from "../rendering/renderer.js";

export async function generateUtccDailyHearingListExcel(options: UtccExcelGenerationOptions): Promise<FlatListExcelResult> {
  const t = options.locale === "cy" ? cy : en;
  const { hearings } = renderUtccDailyHearingListData(options.jsonData, {
    locale: options.locale,
    contentDate: options.contentDate,
    lastReceivedDate: new Date().toISOString(),
    listTitle: t.pageTitle
  });

  return generateFlatListExcel<UtccHearing>({
    artefactId: options.artefactId,
    rows: hearings,
    columns: [
      { header: t.tableHeaders.time, value: (h) => h.time },
      { header: t.tableHeaders.caseReferenceNumber, value: (h) => h.caseReferenceNumber },
      { header: t.tableHeaders.caseName, value: (h) => h.caseName },
      { header: t.tableHeaders.judges, value: (h) => h.judges },
      { header: t.tableHeaders.members, value: (h) => h.members },
      { header: t.tableHeaders.hearingType, value: (h) => h.hearingType },
      { header: t.tableHeaders.venue, value: (h) => h.venue },
      { header: t.tableHeaders.additionalInformation, value: (h) => h.additionalInformation }
    ]
  });
}

interface UtccExcelGenerationOptions {
  artefactId: string;
  contentDate: Date;
  locale: string;
  jsonData: UtccHearingList;
}
