import {
  type BasePdfGenerationOptions,
  configureNunjucks,
  createPdfErrorResult,
  loadTranslations,
  PDF_BASE_STYLES,
  PDF_CIVIL_FAMILY_STYLES,
  type PdfGenerationResult,
  savePdfToStorage
} from "@hmcts/list-types-common";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import type { CauseListData, RenderOptions } from "../models/types.js";
import { renderCauseListData } from "../rendering/renderer.js";

export interface DailyCauseListPdfOptions extends BasePdfGenerationOptions<CauseListData> {
  contentDate: Date;
}

export async function generateDailyCauseListPdf(
  options: DailyCauseListPdfOptions,
  templateDir: string,
  importEn: () => Promise<{ en: Record<string, unknown> }>,
  importCy: () => Promise<{ cy: Record<string, unknown> }>
): Promise<PdfGenerationResult> {
  try {
    const renderOptions: RenderOptions = {
      contentDate: options.contentDate,
      locale: options.locale,
      locationId: options.locationId
    };

    const renderedData = await renderCauseListData(options.jsonData, renderOptions);

    const translations = await loadTranslations(options.locale, importEn, importCy);

    const provenanceLabel = options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "";

    const env = configureNunjucks(templateDir);
    const html = env.render("pdf-template.njk", {
      header: renderedData.header,
      openJustice: renderedData.openJustice,
      listData: renderedData.listData,
      dataSource: provenanceLabel,
      t: translations,
      pdfStyles: PDF_BASE_STYLES + PDF_CIVIL_FAMILY_STYLES
    });

    const pdfResult = await generatePdfFromHtml(html);

    if (!pdfResult.success || !pdfResult.pdfBuffer) {
      return {
        success: false,
        error: pdfResult.error || "PDF generation failed"
      };
    }

    return await savePdfToStorage(options.artefactId, pdfResult.pdfBuffer, pdfResult.sizeBytes ?? 0);
  } catch (error) {
    return createPdfErrorResult(error);
  }
}
