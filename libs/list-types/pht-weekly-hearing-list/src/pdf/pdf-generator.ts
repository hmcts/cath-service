import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BasePdfGenerationOptions, generateListPdf, type PdfGenerationResult } from "@hmcts/list-types-common";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import type { PhtHearingList } from "../models/types.js";
import { PHT_LIST_TITLE, renderPhtData } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PdfGenerationOptions extends BasePdfGenerationOptions<PhtHearingList> {
  contentDate: Date;
}

export function generatePhtWeeklyHearingListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  return generateListPdf({
    ...options,
    listTitle: PHT_LIST_TITLE,
    provenanceLabel: options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "",
    templateDir: __dirname,
    renderData: (jsonData, opts) => renderPhtData(jsonData, opts),
    importEn: () => import("../locales/en.js"),
    importCy: () => import("../locales/cy.js")
  });
}
