import { type FlatListExcelResult, generateFlatListExcel } from "@hmcts/list-types-common";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { UtlcHearing, UtlcHearingList } from "../models/types.js";
import { renderUtlcDailyHearingListData } from "../rendering/renderer.js";

const WORKSHEET_NAME = "UT Lands Chamber";

export async function generateUtlcDailyHearingListExcel(options: UtlcExcelGenerationOptions): Promise<FlatListExcelResult> {
  const t = options.locale === "cy" ? cy : en;
  const { hearings } = renderUtlcDailyHearingListData(options.jsonData, {
    locale: options.locale,
    contentDate: options.contentDate,
    lastReceivedDate: new Date().toISOString(),
    listTitle: t.pageTitle
  });

  return generateFlatListExcel<UtlcHearing>({
    artefactId: options.artefactId,
    worksheetName: WORKSHEET_NAME,
    rows: hearings,
    columns: [
      { header: t.tableHeaders.time, value: (h) => h.time },
      { header: t.tableHeaders.caseReferenceNumber, value: (h) => h.caseReferenceNumber },
      { header: t.tableHeaders.caseName, value: (h) => h.caseName },
      { header: t.tableHeaders.judges, value: (h) => h.judges },
      { header: t.tableHeaders.members, value: (h) => h.members },
      { header: t.tableHeaders.hearingType, value: (h) => h.hearingType },
      { header: t.tableHeaders.venue, value: (h) => h.venue },
      { header: t.tableHeaders.modeOfHearing, value: (h) => h.modeOfHearing },
      { header: t.tableHeaders.additionalInformation, value: (h) => h.additionalInformation }
    ]
  });
}

interface UtlcExcelGenerationOptions {
  artefactId: string;
  contentDate: Date;
  locale: string;
  jsonData: UtlcHearingList;
}
