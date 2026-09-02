import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BasePdfGenerationOptions, generateFttSiacWeeklyHearingListPdf, type PdfGenerationResult } from "@hmcts/list-types-common";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import type { FttLrtHearingList } from "../models/types.js";
import { renderFttLrtData } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PdfGenerationOptions extends BasePdfGenerationOptions<FttLrtHearingList> {
  contentDate: Date;
}

export async function generateFttLrtWeeklyHearingListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  return generateFttSiacWeeklyHearingListPdf({
    ...options,
    courtName: "First-tier Tribunal (Land Registration Tribunal)",
    listTitle: "First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List",
    moduleDir: __dirname,
    provenanceLabel: options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "",
    importEn: () => import("../locales/en.js"),
    importCy: () => import("../locales/cy.js"),
    generatePdf: generatePdfFromHtml,
    renderData: renderFttLrtData
  });
}
