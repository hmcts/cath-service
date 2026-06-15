import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { CrownFirmListData, PddaDefendant } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

function formatDefendantName(defendant: PddaDefendant): string {
  if (defendant.PersonalDetails.IsMasked === "yes" && defendant.PersonalDetails.MaskedName) {
    return defendant.PersonalDetails.MaskedName;
  }
  const name = defendant.PersonalDetails.Name;
  return [name.CitizenNameForename, name.CitizenNameSurname].filter(Boolean).join(" ");
}

export function extractCaseSummary(jsonData: CrownFirmListData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of jsonData.FirmList.CourtLists) {
    for (const sitting of courtList.Sittings) {
      for (const hearing of sitting.Hearings ?? []) {
        const defendants = (hearing.Defendants ?? []).map(formatDefendantName).filter((n) => n.length > 0);
        const hearingType = hearing.HearingDetails.HearingDescription || hearing.HearingDetails.HearingType || "";
        const fields: CaseSummary = [];

        if (defendants.length > 0) {
          fields.push({ label: "Defendant", value: defendants.join(", ") });
        }
        fields.push({ label: "Case number", value: hearing.CaseNumber });
        fields.push({ label: "Prosecuting authority", value: hearing.Prosecution?.ProsecutingAuthority || "" });
        fields.push({ label: "Hearing type", value: hearingType });

        summaries.push(fields);
      }
    }
  }

  return summaries;
}
