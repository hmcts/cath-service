import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BasePdfGenerationOptions, generateListPdf, type PdfGenerationResult } from "@hmcts/list-types-common";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import type { CicWeeklyHearingList } from "../models/types.js";
import { renderCicWeeklyHearingListData } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateCicWeeklyHearingListPdf(options: BasePdfGenerationOptions<CicWeeklyHearingList>): Promise<PdfGenerationResult> {
  return generateListPdf({
    ...options,
    listTitle: "Criminal Injuries Compensation Weekly Hearing List",
    provenanceLabel: options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "",
    templateDir: __dirname,
    renderData: renderCicWeeklyHearingListData,
    importEn: () => import("../locales/en.js"),
    importCy: () => import("../locales/cy.js")
  });
}
