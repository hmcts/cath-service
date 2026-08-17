import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { InterimApplicationHearing, InterimApplicationsChdData } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

function mapHearingToSummary(hearing: InterimApplicationHearing): CaseSummary {
  return [
    { label: "Time", value: hearing.time || "" },
    { label: "Case number", value: hearing.caseNumber || "" },
    { label: "Case name", value: hearing.caseName || "" }
  ];
}

// Unlike the single-tab CHD/KB lists, this list type's JSON is an object with a hearingList array,
// so the summary is extracted from data.hearingList rather than from the root array.
export function extractCaseSummary(jsonData: InterimApplicationsChdData): CaseSummary[] {
  return (jsonData.hearingList ?? []).map(mapHearingToSummary);
}
