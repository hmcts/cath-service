import { type CaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { CrownWarnedListData, PddaCase, PddaDefendant } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

function formatDefendantName(defendant: PddaDefendant): string {
  if (defendant.PersonalDetails.IsMasked === "yes" && defendant.PersonalDetails.MaskedName) {
    return defendant.PersonalDetails.MaskedName;
  }
  const name = defendant.PersonalDetails.Name;
  const forenames = (name.CitizenNameForename ?? []).join(" ");
  return [forenames, name.CitizenNameSurname].filter(Boolean).join(" ");
}

function buildCaseSummary(caseItem: PddaCase): CaseSummary {
  const defendants = (caseItem.Defendants ?? []).map(formatDefendantName).filter((n) => n.length > 0);
  const fields: CaseSummary = [];

  if (defendants.length > 0) {
    fields.push({ label: "Defendant", value: defendants.join(", ") });
  }
  fields.push({ label: "Case reference", value: caseItem.CaseNumber ?? "" });
  fields.push({ label: "Prosecuting authority", value: caseItem.Prosecution?.ProsecutingAuthority || "" });

  return fields;
}

export function extractCaseSummary(jsonData: CrownWarnedListData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of jsonData.WarnedList.CourtLists) {
    for (const entry of courtList.WithFixedDate ?? []) {
      for (const fixture of entry.Fixture ?? []) {
        for (const caseItem of fixture.Cases ?? []) {
          summaries.push(buildCaseSummary(caseItem));
        }
      }
    }

    for (const entry of courtList.WithoutFixedDate ?? []) {
      for (const fixture of entry.Fixture ?? []) {
        for (const caseItem of fixture.Cases ?? []) {
          summaries.push(buildCaseSummary(caseItem));
        }
      }
    }
  }

  return summaries;
}
