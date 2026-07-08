import { type CaseSummary, formatCaseSummaryForEmail } from "@hmcts/list-types-common";
import { buildPartyName } from "../rendering/party-name.js";
import type { MagistratesPublicListData } from "../rendering/renderer.js";

export { formatCaseSummaryForEmail };

interface PartyData {
  partyRole?: string;
  subject?: boolean;
  individualDetails?: { individualForenames?: string; individualSurname?: string };
  organisationDetails?: { organisationName?: string };
}

export function extractCaseSummary(jsonData: MagistratesPublicListData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case ?? []) {
              const parties = (caseItem.party as PartyData[] | undefined) ?? [];
              summaries.push([
                { label: "Name", value: buildPartyName(parties.find((p) => p.partyRole === "DEFENDANT")) },
                { label: "Prosecuting authority", value: buildPartyName(parties.find((p) => p.partyRole === "PROSECUTING_AUTHORITY")) },
                { label: "URN", value: caseItem.caseUrn ?? "" },
                { label: "Hearing type", value: hearing.hearingType ?? "" }
              ]);
            }
            for (const application of hearing.application ?? []) {
              const parties = (application.party as PartyData[] | undefined) ?? [];
              summaries.push([
                { label: "Name", value: buildPartyName(parties.find((p) => p.subject === true)) },
                { label: "Prosecuting authority", value: buildPartyName(parties.find((p) => p.partyRole === "PROSECUTING_AUTHORITY")) },
                { label: "URN", value: application.applicationReference ?? "" }
              ]);
            }
          }
        }
      }
    }
  }

  return summaries;
}
