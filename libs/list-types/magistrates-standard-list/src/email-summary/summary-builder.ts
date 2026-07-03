import { type CaseSummary, formatCaseSummaryForEmail } from "@hmcts/list-types-common";
import type { MagistratesStandardList } from "../models/types.js";

export { formatCaseSummaryForEmail };

function extractPartyName(party: {
  partyRole?: string;
  subject?: boolean;
  individualDetails?: { individualForenames?: string; individualMiddleName?: string; individualSurname?: string };
  organisationDetails?: { organisationName: string };
}): string {
  if (party.individualDetails) {
    const { individualForenames, individualMiddleName, individualSurname } = party.individualDetails;
    const forenames = [individualForenames, individualMiddleName].filter(Boolean).join(" ");
    const parts = [individualSurname, forenames].filter(Boolean);
    return parts.join(", ");
  }
  if (party.organisationDetails) {
    return party.organisationDetails.organisationName;
  }
  return "";
}

function extractOffenceTitles(party: { offence?: { offenceTitle?: string }[] }): string {
  const titles = (party.offence ?? []).map((o) => o.offenceTitle).filter(Boolean) as string[];
  return titles.join(", ");
}

export function extractCaseSummary(jsonData: MagistratesStandardList): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case ?? []) {
              const defendant = caseItem.party?.find((p) => p.partyRole === "DEFENDANT");
              const prosecutor = caseItem.party?.find((p) => p.partyRole === "PROSECUTING_AUTHORITY");
              const fields: CaseSummary = [];

              if (defendant) {
                const name = extractPartyName(defendant);
                if (name) fields.push({ label: "Name", value: name });
              }

              if (prosecutor) {
                const authority = extractPartyName(prosecutor);
                if (authority) fields.push({ label: "Prosecuting authority", value: authority });
              }

              fields.push({ label: "Reference", value: caseItem.caseUrn });

              if (hearing.hearingType) {
                fields.push({ label: "Hearing type", value: hearing.hearingType });
              }

              if (defendant) {
                const offences = extractOffenceTitles(defendant);
                if (offences) fields.push({ label: "Offence", value: offences });
              }

              summaries.push(fields);
            }

            for (const application of hearing.application ?? []) {
              const subject = application.party?.find((p) => p.subject === true);
              const fields: CaseSummary = [];

              if (subject) {
                const name = extractPartyName(subject);
                if (name) fields.push({ label: "Name", value: name });
              }

              fields.push({ label: "Reference", value: application.applicationReference });

              if (hearing.hearingType) {
                fields.push({ label: "Hearing type", value: hearing.hearingType });
              }

              if (subject) {
                const offences = extractOffenceTitles(subject);
                if (offences) fields.push({ label: "Offence", value: offences });
              }

              summaries.push(fields);
            }
          }
        }
      }
    }
  }

  return summaries;
}
