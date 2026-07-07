import { type CaseSummary, formatCaseSummaryForEmail } from "@hmcts/list-types-common";
import type { MagistratesAdultCourtListData } from "../rendering/renderer.js";

export { formatCaseSummaryForEmail };

export function extractCaseSummary(jsonData: MagistratesAdultCourtListData): CaseSummary[] {
  const summaries: CaseSummary[] = [];
  const sessions = jsonData.document.data?.job?.sessions?.session ?? [];

  for (const session of sessions) {
    for (const block of session.blocks?.block ?? []) {
      for (const caseItem of block.cases?.case ?? []) {
        const offenceTitle = caseItem.offences?.offence?.[0]?.title ?? "";
        summaries.push([
          { label: "Defendant Name", value: caseItem.def_name ?? "" },
          { label: "Informant", value: caseItem.inf ?? "" },
          { label: "Case Number", value: caseItem.caseno ?? "" },
          { label: "Offence Title", value: offenceTitle }
        ]);
      }
    }
  }

  return summaries;
}
