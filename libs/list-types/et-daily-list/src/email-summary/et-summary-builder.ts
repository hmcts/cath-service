import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { CauseListCase, CauseListData, Party } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

// ET lists show party names as initials (e.g. "Capt. T. Surname") rather than full forenames,
// matching the on-screen/PDF style guide (pip-frontend createIndividualDetails(..., initialised = true)).
function createEtPartyName(party: Party): string {
  if (party.individualDetails) {
    const details = party.individualDetails;
    const title = details.title?.trim() ?? "";
    const forenameInitial = details.individualForenames?.trim().charAt(0) ?? "";
    const surname = details.individualSurname?.trim() ?? "";

    return `${title}${title.length > 0 ? " " : ""}${forenameInitial}${forenameInitial.length > 0 ? ". " : ""}${surname}`.trim();
  }

  if (party.organisationDetails?.organisationName) {
    return party.organisationDetails.organisationName;
  }

  return "";
}

function extractEtParty(caseItem: CauseListCase, targetRole: string): string {
  let result = "";

  for (const party of caseItem.party ?? []) {
    if (party.partyRole !== targetRole) continue;

    const name = createEtPartyName(party).trim();
    if (!name) continue;

    if (result.length > 0) result += ", ";
    result += name;
  }

  return result.replace(/,\s*$/, "").trim();
}

// Employment Tribunal daily and fortnightly press lists share the same email summary fields:
// Claimant (applicant), Respondent, Case reference, and Hearing type — one entry per case.
export function extractEtCaseSummary(jsonData: CauseListData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              summaries.push([
                { label: "Claimant", value: extractEtParty(caseItem, "APPLICANT_PETITIONER") },
                { label: "Respondent", value: extractEtParty(caseItem, "RESPONDENT") },
                { label: "Case reference", value: caseItem.caseNumber || "" },
                { label: "Hearing type", value: hearing.hearingType || "" }
              ]);
            }
          }
        }
      }
    }
  }

  return summaries;
}
