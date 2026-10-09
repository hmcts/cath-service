import { type FlatListExcelResult, generateFlatListExcel } from "@hmcts/list-types-common";
import { cy, londonTableHeadersCy } from "../locales/cy.js";
import { en, londonTableHeaders } from "../locales/en.js";
import type { UtiacJrLondonHearing, UtiacJrLondonHearingList } from "../models/types.js";
import { renderUtiacJrLondonDailyHearingListData } from "../rendering/renderer-london.js";

export async function generateUtiacJrLondonDailyHearingListExcel(options: UtiacJrLondonExcelGenerationOptions): Promise<FlatListExcelResult> {
  const isWelsh = options.locale === "cy";
  const t = isWelsh ? cy : en;
  const headers = isWelsh ? londonTableHeadersCy : londonTableHeaders;
  const { hearings } = renderUtiacJrLondonDailyHearingListData(options.jsonData, {
    locale: options.locale,
    courtName: t.courtName,
    contentDate: options.contentDate,
    lastReceivedDate: new Date().toISOString(),
    listTitle: t.courtName
  });

  return generateFlatListExcel<UtiacJrLondonHearing>({
    artefactId: options.artefactId,
    rows: hearings,
    columns: [
      { header: headers.hearingTime, value: (h) => h.hearingTime },
      { header: headers.caseTitle, value: (h) => h.caseTitle },
      { header: headers.representative, value: (h) => h.representative },
      { header: headers.caseReferenceNumber, value: (h) => h.caseReferenceNumber },
      { header: headers.judges, value: (h) => h.judges },
      { header: headers.hearingType, value: (h) => h.hearingType },
      { header: headers.location, value: (h) => h.location },
      { header: headers.additionalInformation, value: (h) => h.additionalInformation }
    ]
  });
}

interface UtiacJrLondonExcelGenerationOptions {
  artefactId: string;
  contentDate: Date;
  locale: string;
  jsonData: UtiacJrLondonHearingList;
}
