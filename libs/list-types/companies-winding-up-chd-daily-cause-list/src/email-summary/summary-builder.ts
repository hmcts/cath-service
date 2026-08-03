import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { CompaniesWindingUpHearing, CompaniesWindingUpHearingList } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

function mapHearingToSummary(hearing: CompaniesWindingUpHearing): CaseSummary {
  return [
    { label: "Time", value: hearing.time || "" },
    { label: "Case number", value: hearing.caseNumber || "" },
    { label: "Case name", value: hearing.caseName || "" }
  ];
}

export function extractCaseSummary(jsonData: CompaniesWindingUpHearingList): CaseSummary[] {
  return jsonData.map(mapHearingToSummary);
}
