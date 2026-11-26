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
import type { IacDailyList } from "../models/types.js";
import { renderIacDailyList } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PdfGenerationOptions extends BasePdfGenerationOptions<IacDailyList> {
  contentDate: Date;
  listTypeName: string;
}

const LIST_TITLE_MAP: Record<string, string> = {
  IAC_DAILY_LIST: "Immigration and Asylum Chamber Daily List",
  IAC_DAILY_LIST_ADDITIONAL_CASES: "Immigration and Asylum Chamber Daily List - Additional Cases"
};

export async function generateIacDailyListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  try {
    const listTitle = LIST_TITLE_MAP[options.listTypeName] || "Immigration and Asylum Chamber Daily List";

    const renderedData = renderIacDailyList(options.jsonData, {
      locale: options.locale,
      listTypeName: options.listTypeName,
      listTitle,
      contentDate: options.contentDate,
      lastReceivedDate: new Date().toISOString()
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
      common: translations.common,
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
