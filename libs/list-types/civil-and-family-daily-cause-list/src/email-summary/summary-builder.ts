import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { CauseListCase, CauseListData, Party } from "../models/types.js";

export { formatCaseSummaryForEmail };

function convertPartyRole(role: string): string {
  const roleMap: Record<string, string> = {
    APPLICANT_PETITIONER: "APPLICANT_PETITIONER",
    APPLICANT_PETITIONER_REPRESENTATIVE: "APPLICANT_PETITIONER_REPRESENTATIVE",
    RESPONDENT: "RESPONDENT",
    RESPONDENT_REPRESENTATIVE: "RESPONDENT_REPRESENTATIVE"
  };

  return roleMap[role] || role;
}

function createPartyDetails(party: Party): string {
  if (party.individualDetails) {
    const details = party.individualDetails;
    const parts: string[] = [];

    if (details.title) parts.push(details.title);
    if (details.individualForenames) parts.push(details.individualForenames);
    if (details.individualMiddleName) parts.push(details.individualMiddleName);
    if (details.individualSurname) parts.push(details.individualSurname);

    return parts.filter((n) => n.length > 0).join(" ");
  }

  if (party.organisationDetails?.organisationName) {
    return party.organisationDetails.organisationName;
  }

  return "";
}

function extractApplicant(caseItem: CauseListCase): string {
  let applicant = "";

  caseItem.party?.forEach((party) => {
    const role = convertPartyRole(party.partyRole);
    const details = createPartyDetails(party).trim();

    if (!details) return;

    if (role === "APPLICANT_PETITIONER") {
      if (applicant.length > 0) applicant += ", ";
      applicant += details;
    }
  });

  return applicant.replace(/,\s*$/, "").trim();
}

export function extractCaseSummary(jsonData: CauseListData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              const applicant = extractApplicant(caseItem);
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
