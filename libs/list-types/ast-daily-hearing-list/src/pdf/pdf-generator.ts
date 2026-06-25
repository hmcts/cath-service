import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type BasePdfGenerationOptions,
  buildPdfFromRenderedList,
  createPdfErrorResult,
  loadTranslations,
  type PdfGenerationResult
} from "@hmcts/list-types-common";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import type { AstDailyHearingList } from "../models/types.js";
import { renderAstDailyHearingListData } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateAstDailyHearingListPdf(options: BasePdfGenerationOptions<AstDailyHearingList>): Promise<PdfGenerationResult> {
  try {
    const renderedData = renderAstDailyHearingListData(options.jsonData, {
      locale: options.locale,
      contentDate: options.contentDate,
      lastReceivedDate: new Date().toISOString(),
      listTitle: "Asylum Support Tribunal Daily Hearing List"
    });

    const translations = await loadTranslations(
      options.locale,
      () => import("../locales/en.js"),
      () => import("../locales/cy.js")
    );

    const provenanceLabel = options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "";

    return await buildPdfFromRenderedList({
      artefactId: options.artefactId,
      templateDir: __dirname,
      header: renderedData.header,
      hearings: renderedData.hearings,
      provenanceLabel,
      translations
    });
  } catch (error) {
    return createPdfErrorResult(error);
  }
}
