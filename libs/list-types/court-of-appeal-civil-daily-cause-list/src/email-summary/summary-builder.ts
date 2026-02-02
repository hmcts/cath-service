import type { CourtOfAppealCivilData, StandardHearing } from "../models/types.js";

export const SPECIAL_CATEGORY_DATA_WARNING = `Note this email contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.`;

export interface CaseSummaryItem {
  time: string;
  caseNumber: string;
  caseDetails: string;
}

function mapHearingToSummary(hearing: StandardHearing): CaseSummaryItem {
  return {
    time: hearing.time || "N/A",
    caseNumber: hearing.caseNumber || "N/A",
    caseDetails: hearing.caseDetails || "N/A"
  };
}

export function extractCaseSummary(jsonData: CourtOfAppealCivilData): CaseSummaryItem[] {
  const summaries: CaseSummaryItem[] = [];

  for (const hearing of jsonData.dailyHearings) {
    summaries.push(mapHearingToSummary(hearing));
  }

  for (const judgment of jsonData.futureJudgments) {
    summaries.push(mapHearingToSummary(judgment));
  }

  return summaries;
}

export function formatCaseSummaryForEmail(items: CaseSummaryItem[]): string {
  if (items.length === 0) {
    return "No cases scheduled.";
  }

  const lines: string[] = [];

  lines.push("---");
  lines.push("");

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    lines.push(`Time - ${item.time}`);
    lines.push(`Case number - ${item.caseNumber}`);
    lines.push(`Case details - ${item.caseDetails}`);

    if (i < items.length - 1) {
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}
