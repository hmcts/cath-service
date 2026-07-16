import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type BasePdfGenerationOptions,
  configureNunjucks,
  createPdfErrorResult,
  extractPublicCases,
  formatLastUpdatedDateTime,
  loadTranslations,
  PDF_BASE_STYLES,
  type PdfGenerationResult,
  type SjpJson,
  savePdfToStorage
} from "@hmcts/list-types-common";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PdfGenerationOptions extends BasePdfGenerationOptions<SjpJson> {
  contentDate: Date;
  listTypeName: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

export async function generateSjpPublicListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  try {
    const cases = extractPublicCases(options.jsonData);

    const translations = await loadTranslations(
      options.locale,
      () => import("../sjp-public-list/en.js"),
      () => import("../sjp-public-list/cy.js")
    );

    const listTypeTranslations = translations[options.listTypeName] as Record<string, string>;
    const t = translations.common as Record<string, string>;
    const pdfTitle = listTypeTranslations?.pdfTitle || "";
    const published = formatLastUpdatedDateTime(options.jsonData.document.publicationDate, options.locale);

    const env = configureNunjucks(__dirname);
    const html = env.render("pdf-template.njk", {
      pdfTitle,
      contentDate: formatDate(options.contentDate),
      publishedDateTime: `${published.date} ${t.at} ${published.time}`,
      cases,
      t: translations.common as Record<string, string>,
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
