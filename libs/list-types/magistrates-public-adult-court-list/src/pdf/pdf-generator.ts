import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type BasePdfGenerationOptions,
  configureNunjucks,
  createPdfErrorResult,
  loadTranslations,
  PDF_BASE_STYLES,
  type PdfGenerationResult,
  savePdfToStorage
} from "@hmcts/list-types-common";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import type { MagistratesPublicAdultCourtListData, RenderOptions } from "../rendering/renderer.js";
import { renderMagistratesPublicAdultCourtListData } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PdfGenerationOptions extends BasePdfGenerationOptions<MagistratesPublicAdultCourtListData> {
  listTitle?: string;
}

export async function generateMagistratesPublicAdultCourtListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  try {
    const renderOptions: RenderOptions = {
      contentDate: options.contentDate,
      locale: options.locale,
      locationId: options.locationId
    };

    const renderedData = await renderMagistratesPublicAdultCourtListData(options.jsonData, renderOptions);

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
      listTitle: options.listTitle ?? (translations as { titleDaily?: string }).titleDaily ?? "",
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
