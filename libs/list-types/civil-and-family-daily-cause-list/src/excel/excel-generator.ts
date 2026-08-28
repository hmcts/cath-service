import {
  type CauseListData,
  type CauseListExcelColumn,
  type CauseListExcelResult,
  combinePartyWithRepresentative,
  formatCaseName,
  generateCauseListExcel
} from "@hmcts/daily-cause-list-common";
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

  const columns: CauseListExcelColumn[] = [
    { header: cols.time, accessor: (c) => c.sitting.time ?? "" },
    { header: cols.caseRef, accessor: (c) => c.caseItem.caseNumber ?? "" },
    { header: cols.caseName, accessor: (c) => formatCaseName(c.caseItem.caseName, c.caseItem.caseSequenceIndicator) },
    { header: cols.caseType, accessor: (c) => c.caseItem.caseType ?? "" },
    { header: cols.hearingType, accessor: (c) => c.hearingType },
    { header: cols.location, accessor: (c) => c.sitting.caseHearingChannel ?? "" },
    { header: cols.duration, accessor: (c) => c.duration },
    {
      header: cols.applicant,
      accessor: (c) => combinePartyWithRepresentative(c.caseItem.applicant ?? "", c.caseItem.applicantRepresentative ?? "", t.legalAdvisor)
    },
    {
      header: cols.respondent,
      accessor: (c) => combinePartyWithRepresentative(c.caseItem.respondent ?? "", c.caseItem.respondentRepresentative ?? "", t.legalAdvisor)
    },
    { header: cols.reportingRestrictions, accessor: (c) => c.caseItem.formattedReportingRestriction ?? "" }
  ];

  return generateCauseListExcel({
    ...options,
    // "Civil and Family Daily Cause List" (33) exceeds Excel's 31-char worksheet-name limit
    // and would be silently truncated mid-word, so use a short fixed name (matches SJP generators).
    worksheetName: "Civil and Family",
    contextHeaders: { courtHouse: cols.courtHouse, courtRoom: cols.courtRoom, judge: cols.judge },
    columns
  });
}
