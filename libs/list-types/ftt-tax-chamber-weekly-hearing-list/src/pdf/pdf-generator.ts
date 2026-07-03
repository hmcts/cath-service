import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BasePdfGenerationOptions, generateFttSiacWeeklyHearingListPdf, type PdfGenerationResult } from "@hmcts/list-types-common";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import type { FttTaxChamberHearingList } from "../models/types.js";
import { renderFttTaxChamberData } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PdfGenerationOptions extends BasePdfGenerationOptions<FttTaxChamberHearingList> {
  contentDate: Date;
}

export async function generateFttTaxChamberWeeklyHearingListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  return generateFttSiacWeeklyHearingListPdf({
    ...options,
    courtName: "First-tier Tribunal (Tax Chamber)",
    listTitle: "First-tier Tribunal (Tax Chamber) Weekly Hearing List",
    moduleDir: __dirname,
    provenanceLabel: options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "",
    importEn: () => import("../locales/en.js"),
    importCy: () => import("../locales/cy.js"),
    generatePdf: generatePdfFromHtml,
    renderData: renderFttTaxChamberData
  });
}
