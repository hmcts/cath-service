import type { CauseListCase, CauseListData, Party } from "../models/types.js";

export interface CaseSummaryItem {
  applicant: string;
  caseReferenceNumber: string;
  caseName: string;
  caseType: string;
  hearingType: string;
}

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

export function extractCaseSummary(jsonData: CauseListData): CaseSummaryItem[] {
  const summaries: CaseSummaryItem[] = [];

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              summaries.push({
                applicant: extractApplicant(caseItem),
                caseReferenceNumber: caseItem.caseNumber || "",
                caseName: caseItem.caseName || "",
                caseType: caseItem.caseType || "",
                hearingType: hearing.hearingType || ""
              });
            }
          }
        }
      }
    }
  }

  return summaries;
}

export function formatCaseSummaryForEmail(items: CaseSummaryItem[]): string {
  if (items.length === 0) {
    return "No cases scheduled.";
  }

  const lines: string[] = [];

  // Add horizontal line at the start (below the heading in the template)
  lines.push("---");
  lines.push("");

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.applicant) {
      lines.push(`Applicant - ${item.applicant}`);
    }
    lines.push(`Case reference - ${item.caseReferenceNumber}`);
    lines.push(`Case name - ${item.caseName}`);
    lines.push(`Case type - ${item.caseType}`);
    lines.push(`Hearing type - ${item.hearingType}`);

    // Add horizontal line between cases (not after the last one)
    if (i < items.length - 1) {
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}
