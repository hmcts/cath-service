import { extractParty } from "@hmcts/daily-cause-list-common";
import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { CauseListData } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

export function extractCaseSummary(jsonData: CauseListData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              const applicant = extractParty(caseItem, "APPLICANT_PETITIONER");
              const fields: CaseSummary = [];

              if (applicant) {
                fields.push({ label: "Applicant", value: applicant });
              }
              fields.push({ label: "Case reference", value: caseItem.caseNumber || "" });
              fields.push({ label: "Case name", value: caseItem.caseName || "" });
              fields.push({ label: "Case type", value: caseItem.caseType || "" });
              fields.push({ label: "Hearing type", value: hearing.hearingType || "" });

              summaries.push(fields);
            }
          }
        }
      }
    }
  }

  return summaries;
}
