import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BasePdfGenerationOptions, generateFttSiacWeeklyHearingListPdf, type PdfGenerationResult } from "@hmcts/list-types-common";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import type { SiacPoacPaacHearingList } from "../models/types.js";
import { renderSiacPoacPaacData } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PdfGenerationOptions extends BasePdfGenerationOptions<SiacPoacPaacHearingList> {
  contentDate: Date;
  courtName: string;
  listTitle: string;
}

export async function generateSiacPoacPaacWeeklyHearingListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  return generateFttSiacWeeklyHearingListPdf({
    ...options,
    moduleDir: __dirname,
    provenanceLabel: options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "",
    importEn: () => import("../locales/en.js"),
    importCy: () => import("../locales/cy.js"),
    generatePdf: generatePdfFromHtml,
    renderData: renderSiacPoacPaacData
  });
}
