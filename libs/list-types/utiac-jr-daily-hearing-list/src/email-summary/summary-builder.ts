import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

export function extractCaseSummary(jsonData: Array<{ hearingTime: string; caseReferenceNumber: string }>): CaseSummary[] {
  return jsonData.map((hearing) => [
    { label: "Hearing time", value: hearing.hearingTime || "" },
    { label: "Case reference number", value: hearing.caseReferenceNumber || "" }
  ]);
}

export const extractLondonCaseSummary = extractCaseSummary;
