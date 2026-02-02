import type { CareStandardsTribunalHearingList } from "../models/types.js";

export const SPECIAL_CATEGORY_DATA_WARNING = `Note this email contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.`;

export interface CaseSummaryItem {
  date: string;
  caseName: string;
}

export function extractCaseSummary(jsonData: CareStandardsTribunalHearingList): CaseSummaryItem[] {
  const summaries: CaseSummaryItem[] = [];

  for (const hearing of jsonData) {
    summaries.push({
      date: hearing.date || "N/A",
      caseName: hearing.caseName || "N/A"
    });
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
    lines.push(`Date - ${item.date}`);
    lines.push(`Case name - ${item.caseName}`);

    if (i < items.length - 1) {
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}
