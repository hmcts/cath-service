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
import { pdfTemplateDir } from "../config.js";
import type { UtiacJrLeedsHearingList } from "../models/types.js";
import { renderUtiacJrLeedsDailyHearingListData } from "../rendering/renderer.js";

interface PdfGenerationOptions extends BasePdfGenerationOptions<UtiacJrLeedsHearingList> {
  contentDate: Date;
}

async function generatePdf(options: PdfGenerationOptions, listTitle: string): Promise<PdfGenerationResult> {
  try {
    const renderedData = renderUtiacJrLeedsDailyHearingListData(options.jsonData, {
      locale: options.locale,
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      contentDate: options.contentDate,
      lastReceivedDate: new Date().toISOString(),
      listTitle
    });

    const translations = await loadTranslations(
      options.locale,
      () => import("../locales/en.js"),
      () => import("../locales/cy.js")
    );

    const provenanceLabel = options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "";

    const env = configureNunjucks(pdfTemplateDir);
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

export async function generateUtiacJrLeedsDailyHearingListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  return generatePdf(options, "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List");
}

export function createUtiacJrDailyHearingListPdfGenerator(listTitle: string) {
  return (options: PdfGenerationOptions) => generatePdf(options, listTitle);
}
