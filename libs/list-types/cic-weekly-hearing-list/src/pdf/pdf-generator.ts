import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BasePdfGenerationOptions, generateListPdf, type PdfGenerationResult } from "@hmcts/list-types-common";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { CicWeeklyHearingList } from "../models/types.js";
import { renderCicWeeklyHearingListData } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateCicWeeklyHearingListPdf(options: BasePdfGenerationOptions<CicWeeklyHearingList>): Promise<PdfGenerationResult> {
  const t = options.locale === "cy" ? cy : en;

  return generateListPdf({
    ...options,
    listTitle: t.pageTitle,
    provenanceLabel: options.provenance ? t.provenanceLabels[options.provenance as keyof typeof t.provenanceLabels] || options.provenance : "",
    templateDir: __dirname,
    renderData: renderCicWeeklyHearingListData,
    importEn: () => import("../locales/en.js"),
    importCy: () => import("../locales/cy.js")
  });
}
