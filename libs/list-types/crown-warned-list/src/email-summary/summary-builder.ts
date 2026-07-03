import { type CaseSummary, formatCaseSummaryForEmail, formatPddaDefendantName, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import { formatShortDate } from "../date-formatting.js";
import type { CrownWarnedListData, PddaCase } from "../models/types.js";

export { formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING };

function buildCaseSummary(caseItem: PddaCase, fixedDate: string | undefined): CaseSummary {
  const defendants = (caseItem.Defendants ?? []).map((d) => formatPddaDefendantName(d.PersonalDetails)).filter((n) => n.length > 0);
  const fields: CaseSummary = [];

  fields.push({ label: "Fixed for", value: formatShortDate(fixedDate) });
  fields.push({ label: "Case Reference", value: caseItem.CaseNumberCaTH ?? caseItem.CaseNumber ?? "" });

  if (defendants.length > 0) {
    fields.push({ label: "Defendant Name(s)", value: defendants.join(", ") });
  }

  fields.push({ label: "Prosecuting Authority", value: caseItem.Prosecution?.ProsecutingAuthority || "" });

  return fields;
}

export function extractCaseSummary(jsonData: CrownWarnedListData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const courtList of jsonData.WarnedList.CourtLists) {
    for (const entry of courtList.WithFixedDate ?? []) {
      for (const fixture of entry.Fixture ?? []) {
        for (const caseItem of fixture.Cases ?? []) {
          summaries.push(buildCaseSummary(caseItem, fixture.FixedDate));
        }
      }
    }

    for (const entry of courtList.WithoutFixedDate ?? []) {
      for (const fixture of entry.Fixture ?? []) {
        for (const caseItem of fixture.Cases ?? []) {
          summaries.push(buildCaseSummary(caseItem, fixture.FixedDate));
        }
      }
    }
  }

  return summaries;
}
