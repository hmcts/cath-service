import { type CaseSummary, formatCaseSummaryForEmail } from "@hmcts/list-types-common";
import type { SscsDailyHearingList } from "../models/types.js";

export { formatCaseSummaryForEmail };

export function extractCaseSummary(jsonData: SscsDailyHearingList): CaseSummary[] {
  return jsonData.map((hearing) => [
    { label: "Hearing Time", value: hearing.hearingTime || "" },
    { label: "Hearing Type", value: hearing.hearingType || "" },
    { label: "Appeal Reference Number", value: hearing.appealReferenceNumber || "" }
  ]);
}
