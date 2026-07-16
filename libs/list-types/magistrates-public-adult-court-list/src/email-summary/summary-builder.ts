import { type CaseSummary, formatCaseSummaryForEmail } from "@hmcts/list-types-common";
import type { MagistratesPublicAdultCourtListData } from "../rendering/renderer.js";

export { formatCaseSummaryForEmail };

export function extractCaseSummary(jsonData: MagistratesPublicAdultCourtListData): CaseSummary[] {
  const summaries: CaseSummary[] = [];
  const sessions = jsonData.document?.data?.job?.sessions?.session ?? [];

  for (const session of sessions) {
    for (const block of session.blocks?.block ?? []) {
      for (const caseNode of block.cases?.case ?? []) {
        summaries.push([
          { label: "Defendant Name", value: caseNode.def_name ?? "" },
          { label: "Case Number", value: caseNode.caseno ?? "" }
        ]);
      }
    }
  }

  return summaries;
}
