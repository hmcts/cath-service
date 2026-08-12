import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ChdKbHearingList } from "@hmcts/chd-kb-common";
import { type BasePdfGenerationOptions, generateListPdf, type PdfGenerationResult } from "@hmcts/list-types-common";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import { renderCompetitionListChdDailyCauseList } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PdfGenerationOptions extends BasePdfGenerationOptions<ChdKbHearingList> {
  contentDate: Date;
}

export async function generateCompetitionListChdDailyCauseListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  const provenanceLabel = options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "";

  // The renderer sources its own list title from this package's locales, so listTitle is unused here.
  return generateListPdf<ChdKbHearingList>({
    ...options,
    listTitle: "",
    provenanceLabel,
    templateDir: __dirname,
    renderData: (jsonData, { locale, contentDate, lastReceivedDate }) =>
      renderCompetitionListChdDailyCauseList(jsonData, { locale, contentDate, lastReceivedDate }),
    importEn: () => import("../locales/en.js"),
    importCy: () => import("../locales/cy.js")
  });
}
