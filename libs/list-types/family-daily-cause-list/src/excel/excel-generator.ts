import { buildFamilyStyleColumns, type CauseListData, type CauseListExcelResult, generateCauseListExcel } from "@hmcts/daily-cause-list-common";
import { cy as cyLocale } from "../locales/cy.js";
import { en as enLocale } from "../locales/en.js";

interface FamilyDailyCauseListExcelOptions {
  artefactId: string;
  locationId: string;
  contentDate: Date;
  locale: string;
  jsonData: CauseListData;
}

export async function generateFamilyDailyCauseListExcel(options: FamilyDailyCauseListExcelOptions): Promise<CauseListExcelResult> {
  const t = options.locale === "cy" ? cyLocale : enLocale;
  const cols = t.excelColumns;

  return generateCauseListExcel({
    ...options,
    // Excel caps worksheet names at 31 chars; keep it short and fixed (matches SJP generators).
    worksheetName: "Family Daily Cause List",
    contextHeaders: { courtHouse: cols.courtHouse, courtRoom: cols.courtRoom, judge: cols.judge },
    columns: buildFamilyStyleColumns(cols, t.legalAdvisor)
  });
}
