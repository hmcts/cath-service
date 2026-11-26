import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type BasePdfGenerationOptions,
  configureNunjucks,
  createPdfErrorResult,
  extractPressCases,
  formatAccusedDateOfBirth,
  formatLastUpdatedDateTime,
  loadTranslations,
  PDF_BASE_STYLES,
  type PdfGenerationResult,
  type SjpJson,
  savePdfToStorage
} from "@hmcts/list-types-common";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { SJP_PRESS_LIST_PDF_STYLES } from "./pdf-styles.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PdfGenerationOptions extends BasePdfGenerationOptions<SjpJson> {
  contentDate: Date;
  listTypeName: string;
}

export async function generateSjpPressListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  try {
    const cases = extractPressCases(options.jsonData);

    const translations = await loadTranslations(
      options.locale,
      () => import("../sjp-press-list/en.js"),
      () => import("../sjp-press-list/cy.js")
    );

    const t = translations.common as Record<string, string>;
    const listTitle = (translations[options.listTypeName] as Record<string, string>)?.title || "";
    const published = formatLastUpdatedDateTime(options.jsonData.document.publicationDate, options.locale);

    const formattedCases = cases.map((c) => ({
      ...c,
      formattedDob: formatAccusedDateOfBirth(c.rawDateOfBirth, c.age)
    }));

    const env = configureNunjucks(__dirname);
    const html = env.render("pdf-template.njk", {
      listTitle,
      contentDate: options.contentDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
      publishedDateTime: `${published.date} ${t.at} ${published.time}`,
      cases: formattedCases,
      t,
      pdfStyles: PDF_BASE_STYLES + SJP_PRESS_LIST_PDF_STYLES
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
