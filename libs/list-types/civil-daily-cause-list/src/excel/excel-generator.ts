import {
  type CauseListData,
  type CauseListExcelColumn,
  type CauseListExcelResult,
  formatCaseName,
  generateCauseListExcel
} from "@hmcts/daily-cause-list-common";
import { cy as cyLocale } from "../locales/cy.js";
import { en as enLocale } from "../locales/en.js";

interface CivilDailyCauseListExcelOptions {
  artefactId: string;
  locationId: string;
  contentDate: Date;
  locale: string;
  jsonData: CauseListData;
}

export async function generateCivilDailyCauseListExcel(options: CivilDailyCauseListExcelOptions): Promise<CauseListExcelResult> {
  const t = options.locale === "cy" ? cyLocale : enLocale;
  const cols = t.excelColumns;

  const columns: CauseListExcelColumn[] = [
    { header: cols.time, accessor: (c) => c.sitting.time ?? "" },
    { header: cols.caseId, accessor: (c) => c.caseItem.caseNumber ?? "" },
    { header: cols.caseName, accessor: (c) => formatCaseName(c.caseItem.caseName, c.caseItem.caseSequenceIndicator) },
    { header: cols.caseType, accessor: (c) => c.caseItem.caseType ?? "" },
    { header: cols.hearingType, accessor: (c) => c.hearingType },
    { header: cols.location, accessor: (c) => c.sitting.caseHearingChannel ?? "" },
    { header: cols.duration, accessor: (c) => c.duration }
  ];

  return generateCauseListExcel({
    ...options,
    // Excel caps worksheet names at 31 chars; keep it short and fixed (matches SJP generators).
    worksheetName: "Civil Daily Cause List",
    contextHeaders: { courtHouse: cols.courtHouse, courtRoom: cols.courtRoom, judge: cols.judge },
    columns
  });
}
