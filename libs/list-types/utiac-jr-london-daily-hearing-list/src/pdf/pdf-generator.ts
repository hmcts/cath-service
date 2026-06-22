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
import type { UtiacJrLondonHearingList } from "../models/types.js";
import { renderUtiacJrLondonDailyHearingListData } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PdfGenerationOptions extends BasePdfGenerationOptions<UtiacJrLondonHearingList> {
  displayFrom: Date;
}

export async function generateUtiacJrLondonDailyHearingListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  try {
    const renderedData = renderUtiacJrLondonDailyHearingListData(options.jsonData, {
      locale: options.locale,
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      displayFrom: options.displayFrom,
      lastReceivedDate: new Date().toISOString(),
      listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List"
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
