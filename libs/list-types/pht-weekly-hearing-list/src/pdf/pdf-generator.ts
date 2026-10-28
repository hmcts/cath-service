import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BasePdfGenerationOptions, generateListPdf, type PdfGenerationResult } from "@hmcts/list-types-common";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { PhtHearingList } from "../models/types.js";
import { renderPhtData } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PdfGenerationOptions extends BasePdfGenerationOptions<PhtHearingList> {
  contentDate: Date;
}

export function generatePhtWeeklyHearingListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  const t = options.locale === "cy" ? cy : en;

  return generateListPdf({
    ...options,
    listTitle: t.pageTitle,
    provenanceLabel: options.provenance ? t.provenanceLabels[options.provenance as keyof typeof t.provenanceLabels] || options.provenance : "",
    templateDir: __dirname,
    renderData: (jsonData, opts) => renderPhtData(jsonData, opts),
    importEn: () => import("../locales/en.js"),
    importCy: () => import("../locales/cy.js")
  });
}
