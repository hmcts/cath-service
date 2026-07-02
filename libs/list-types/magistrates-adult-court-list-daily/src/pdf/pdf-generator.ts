import path from "node:path";
import { fileURLToPath } from "node:url";
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
import type { MagistratesAdultListData } from "@hmcts/magistrates-adult-common";
import { renderMagistratesAdultList } from "@hmcts/magistrates-adult-common";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { PROVENANCE_LABELS } from "@hmcts/publication";

export interface MagistratesAdultPdfOptions extends BasePdfGenerationOptions<MagistratesAdultListData> {
  contentDate: Date;
}

export async function generateMagistratesAdultCourtListDailyPdf(options: MagistratesAdultPdfOptions): Promise<PdfGenerationResult> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  try {
    const renderedData = await renderMagistratesAdultList(options.jsonData, {
      contentDate: options.contentDate,
      locale: options.locale,
      locationId: options.locationId
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
      listData: renderedData.listData,
      dataSource: provenanceLabel,
      t: translations,
      pdfStyles: PDF_BASE_STYLES + PDF_CIVIL_FAMILY_STYLES
    });

    const pdfResult = await generatePdfFromHtml(html);

    if (!pdfResult.success || !pdfResult.pdfBuffer) {
      return { success: false, error: pdfResult.error || "PDF generation failed" };
    }

    return await savePdfToStorage(options.artefactId, pdfResult.pdfBuffer, pdfResult.sizeBytes ?? 0);
  } catch (error) {
    return createPdfErrorResult(error);
  }
}
