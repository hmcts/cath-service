import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type BasePdfGenerationOptions,
  configureNunjucks,
  createPdfErrorResult,
  loadTranslations,
  PDF_BASE_STYLES,
  type PdfGenerationResult,
  provenanceLabelsEn as PROVENANCE_LABELS,
  savePdfToStorage
} from "@hmcts/list-types-common";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import type { UtiacStatutoryAppealHearingList } from "../models/types.js";
import { renderUtiacStatutoryAppealDailyHearingListData } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PdfGenerationOptions extends BasePdfGenerationOptions<UtiacStatutoryAppealHearingList> {
  contentDate: Date;
}

export async function generateUtiacStatutoryAppealDailyHearingListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  try {
    const renderedData = renderUtiacStatutoryAppealDailyHearingListData(options.jsonData, {
      locale: options.locale,
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      contentDate: options.contentDate,
      lastReceivedDate: new Date().toISOString(),
      listTitle: "Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List"
    });

    const translations = await loadTranslations(
      options.locale,
      () => import("../locales/en.js"),
      () => import("../locales/cy.js")
    );

    const provenanceLabel = options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "";

    const env = configureNunjucks(__dirname);
    const html = env.render("pdf-template.njk", {
      header: renderedData.header,
      hearings: renderedData.hearings,
      dataSource: provenanceLabel,
      t: translations,
      pdfStyles: PDF_BASE_STYLES
    });

    const pdfResult = await generatePdfFromHtml(html);

    if (!pdfResult.success || !pdfResult.pdfBuffer) {
      return {
        success: false,
        error: pdfResult.error || "PDF generation failed"
      };
    }

    return await savePdfToStorage(options.artefactId, pdfResult.pdfBuffer, pdfResult.sizeBytes!);
  } catch (error) {
    return createPdfErrorResult(error);
  }
}
