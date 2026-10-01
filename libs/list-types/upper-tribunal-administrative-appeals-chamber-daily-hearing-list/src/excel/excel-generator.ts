import { type FlatListExcelResult, generateFlatListExcel } from "@hmcts/list-types-common";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { UtaacHearing, UtaacHearingList } from "../models/types.js";
import { renderUtaacDailyHearingListData } from "../rendering/renderer.js";

const WORKSHEET_NAME = "UT Administrative Appeals";

export async function generateUtaacDailyHearingListExcel(options: UtaacExcelGenerationOptions): Promise<FlatListExcelResult> {
  const t = options.locale === "cy" ? cy : en;
  const { hearings } = renderUtaacDailyHearingListData(options.jsonData, {
    locale: options.locale,
    contentDate: options.contentDate,
    lastReceivedDate: new Date().toISOString(),
    listTitle: t.pageTitle
  });

  return generateFlatListExcel<UtaacHearing>({
    artefactId: options.artefactId,
    worksheetName: WORKSHEET_NAME,
    rows: hearings,
    columns: [
      { header: t.tableHeaders.time, value: (h) => h.time },
      { header: t.tableHeaders.appellant, value: (h) => h.appellant },
      { header: t.tableHeaders.caseReferenceNumber, value: (h) => h.caseReferenceNumber },
      { header: t.tableHeaders.judges, value: (h) => h.judges },
      { header: t.tableHeaders.members, value: (h) => h.members },
      { header: t.tableHeaders.modeOfHearing, value: (h) => h.modeOfHearing },
      { header: t.tableHeaders.venue, value: (h) => h.venue },
      { header: t.tableHeaders.additionalInformation, value: (h) => h.additionalInformation }
    ]
  });
}

interface UtaacExcelGenerationOptions {
  artefactId: string;
  contentDate: Date;
  locale: string;
  jsonData: UtaacHearingList;
}
