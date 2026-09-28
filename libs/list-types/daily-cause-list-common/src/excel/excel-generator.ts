import { autoFitColumns, type CauseListData, type RenderOptions, sanitiseCellValue, saveExcelToStorage } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { renderCauseListData } from "../rendering/renderer.js";

interface RenderedCase {
  caseNumber?: string;
  caseName?: string;
  caseType?: string;
  caseSequenceIndicator?: string;
  applicant?: string;
  applicantRepresentative?: string;
  respondent?: string;
  respondentRepresentative?: string;
  formattedReportingRestriction?: string;
}

interface RenderedSitting {
  time?: string;
  durationAsHours?: number;
  durationAsMinutes?: number;
  caseHearingChannel?: string;
  hearing?: Array<{ hearingType?: string; case?: RenderedCase[] }>;
}

interface RenderedSession {
  formattedJudiciaries?: string;
  sittings?: RenderedSitting[];
}

interface RenderRowContext {
  courtHouseName: string;
  courtRoomName: string;
  judge: string;
  hearingType: string;
  duration: string;
  sitting: RenderedSitting;
  caseItem: RenderedCase;
}

export interface CauseListExcelColumn {
  header: string;
  accessor: (context: RenderRowContext) => string;
}

export interface CauseListExcelHeaders {
  courtHouse: string;
  courtRoom: string;
  judge: string;
}

export interface CauseListExcelOptions {
  artefactId: string;
  locationId: string;
  contentDate: Date;
  locale: string;
  jsonData: CauseListData;
  worksheetName: string;
  contextHeaders: CauseListExcelHeaders;
  columns: CauseListExcelColumn[];
}

export interface CauseListExcelResult {
  success: boolean;
  excelPath?: string;
  error?: string;
}

export interface FamilyStyleColumnLabels {
  time: string;
  caseRef: string;
  caseName: string;
  caseType: string;
  hearingType: string;
  location: string;
  duration: string;
  applicant: string;
  respondent: string;
  reportingRestrictions: string;
}

// Family and Civil-and-Family share an identical 10-column layout, differing only in the
// locale labels they pass in. Building the columns here keeps the two wrappers from duplicating it.
export function buildFamilyStyleColumns(labels: FamilyStyleColumnLabels, legalAdvisorLabel: string): CauseListExcelColumn[] {
  return [
    { header: labels.time, accessor: (c) => c.sitting.time ?? "" },
    { header: labels.caseRef, accessor: (c) => c.caseItem.caseNumber ?? "" },
    { header: labels.caseName, accessor: (c) => formatCaseName(c.caseItem.caseName, c.caseItem.caseSequenceIndicator) },
    { header: labels.caseType, accessor: (c) => c.caseItem.caseType ?? "" },
    { header: labels.hearingType, accessor: (c) => c.hearingType },
    { header: labels.location, accessor: (c) => c.sitting.caseHearingChannel ?? "" },
    { header: labels.duration, accessor: (c) => c.duration },
    {
      header: labels.applicant,
      accessor: (c) => combinePartyWithRepresentative(c.caseItem.applicant ?? "", c.caseItem.applicantRepresentative ?? "", legalAdvisorLabel)
    },
    {
      header: labels.respondent,
      accessor: (c) => combinePartyWithRepresentative(c.caseItem.respondent ?? "", c.caseItem.respondentRepresentative ?? "", legalAdvisorLabel)
    },
    { header: labels.reportingRestrictions, accessor: (c) => c.caseItem.formattedReportingRestriction ?? "" }
  ];
}

export function formatCaseName(caseName: string | undefined, caseSequenceIndicator: string | undefined): string {
  const name = caseName ?? "";

  return caseSequenceIndicator ? `${name} [${caseSequenceIndicator}]` : name;
}

export function combinePartyWithRepresentative(party: string, representative: string, legalAdvisorLabel: string): string {
  if (!representative) {
    return party;
  }

  const advisor = `${legalAdvisorLabel}: ${representative}`;

  return party ? `${party}, ${advisor}` : advisor;
}

export function formatDuration(hours: number | undefined, minutes: number | undefined): string {
  const parts: string[] = [];

  if (hours && hours > 0) {
    parts.push(`${hours} ${hours > 1 ? "hours" : "hour"}`);
  }

  if (minutes && minutes > 0) {
    parts.push(`${minutes} ${minutes > 1 ? "mins" : "min"}`);
  }

  return parts.join(" ");
}

export async function generateCauseListExcel(options: CauseListExcelOptions): Promise<CauseListExcelResult> {
  const { artefactId, locationId, contentDate, locale, jsonData, worksheetName, contextHeaders, columns } = options;

  try {
    const renderOptions: RenderOptions = { locationId, contentDate, locale };
    const { listData } = await renderCauseListData(jsonData, renderOptions);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(worksheetName);

    const headerRow = worksheet.addRow([contextHeaders.courtHouse, contextHeaders.courtRoom, contextHeaders.judge, ...columns.map((c) => c.header)]);
    headerRow.font = { bold: true };

    for (const courtList of listData.courtLists) {
      const courtHouse = courtList.courtHouse;
      for (const courtRoom of courtHouse.courtRoom) {
        for (const session of courtRoom.session as RenderedSession[]) {
          for (const sitting of session.sittings ?? []) {
            const duration = formatDuration(sitting.durationAsHours, sitting.durationAsMinutes);
            for (const hearing of sitting.hearing ?? []) {
              for (const caseItem of hearing.case ?? []) {
                const context: RenderRowContext = {
                  courtHouseName: courtHouse.courtHouseName,
                  courtRoomName: courtRoom.courtRoomName,
                  judge: session.formattedJudiciaries ?? "",
                  hearingType: hearing.hearingType ?? "",
                  duration,
                  sitting,
                  caseItem
                };

                worksheet.addRow([
                  sanitiseCellValue(courtHouse.courtHouseName),
                  sanitiseCellValue(courtRoom.courtRoomName),
                  sanitiseCellValue(session.formattedJudiciaries ?? ""),
                  ...columns.map((column) => sanitiseCellValue(column.accessor(context)))
                ]);
              }
            }
          }
        }
      }
    }

    autoFitColumns(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();
    const { excelPath } = await saveExcelToStorage(artefactId, Buffer.from(buffer));

    return { success: true, excelPath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to generate cause list Excel: ${errorMessage}` };
  }
}
