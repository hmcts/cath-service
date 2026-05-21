import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type BasePdfGenerationOptions,
  configureNunjucks,
  createPdfErrorResult,
  extractPressCases,
  formatLastUpdatedDateTime,
  loadTranslations,
  PDF_BASE_STYLES,
  type PdfGenerationResult,
  type SjpJson,
  savePdfToStorage
} from "@hmcts/list-types-common";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { PROVENANCE_LABELS } from "@hmcts/publication";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PdfGenerationOptions extends BasePdfGenerationOptions<SjpJson> {
  contentDate: Date;
  listTypeId: number;
}

const LIST_TITLE_MAP: Record<number, string> = {
  24: "SJP_PRESS_LIST",
  26: "SJP_DELTA_PRESS_LIST"
};

function formatDateOfBirth(dob: Date | null): string {
  if (!dob) return "";
  return dob.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

export async function generateSjpPressListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  try {
    const cases = extractPressCases(options.jsonData);
    const listTypeKey = LIST_TITLE_MAP[options.listTypeId] || "SJP_PRESS_LIST";

    const translations = await loadTranslations(
      options.locale,
      () => import("../pages/en.js"),
      () => import("../pages/cy.js")
    );

    const t = translations.common as Record<string, string>;
    const listTitle = (translations[listTypeKey] as Record<string, string>)?.title || "";
    const provenanceLabel = options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "";
    const published = formatLastUpdatedDateTime(options.jsonData.document.publicationDate, options.locale);

    const formattedCases = cases.map((c) => ({
      ...c,
      formattedDob: formatDateOfBirth(c.dateOfBirth)
    }));

    const env = configureNunjucks(__dirname);
    const html = env.render("pdf-template.njk", {
      listTitle,
      contentDate: options.contentDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
      publishedDateTime: `${published.date} ${t.at} ${published.time}`,
      cases: formattedCases,
      t,
      dataSource: provenanceLabel,
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
