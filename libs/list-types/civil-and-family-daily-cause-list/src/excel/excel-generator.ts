import { buildFamilyStyleColumns, type CauseListData, type CauseListExcelResult, generateCauseListExcel } from "@hmcts/daily-cause-list-common";
import { cy as cyLocale } from "../locales/cy.js";
import { en as enLocale } from "../locales/en.js";

interface CivilAndFamilyDailyCauseListExcelOptions {
  artefactId: string;
  locationId: string;
  contentDate: Date;
  locale: string;
  jsonData: CauseListData;
}

export async function generateCivilAndFamilyDailyCauseListExcel(options: CivilAndFamilyDailyCauseListExcelOptions): Promise<CauseListExcelResult> {
  const t = options.locale === "cy" ? cyLocale : enLocale;
  const cols = t.excelColumns;

  return generateCauseListExcel({
    ...options,
    // "Civil and Family Daily Cause List" (33) exceeds Excel's 31-char worksheet-name limit
    // and would be silently truncated mid-word, so use a short fixed name (matches SJP generators).
    worksheetName: "Civil and Family",
    contextHeaders: { courtHouse: cols.courtHouse, courtRoom: cols.courtRoom, judge: cols.judge },
    columns: buildFamilyStyleColumns(cols, t.legalAdvisor)
  });
}
