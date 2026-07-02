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
import { SJP_PRESS_LIST_PDF_STYLES } from "./pdf-styles.js";

const PROVENANCE_LABELS: Record<string, string> = {
  MANUAL_UPLOAD: "Manual Upload",
  XHIBIT: "XHIBIT",
  SNL: "SNL",
  COMMON_PLATFORM: "Common Platform"
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PdfGenerationOptions extends BasePdfGenerationOptions<SjpJson> {
  contentDate: Date;
  listTypeName: string;
}

function formatDateOfBirth(dob: Date | null, age: number | null): string {
  if (!dob) return "";
  const formatted = dob.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  return age !== null ? `${formatted} (${age})` : formatted;
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
    const provenanceLabel = options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "";
    const published = formatLastUpdatedDateTime(options.jsonData.document.publicationDate, options.locale);

    const formattedCases = cases.map((c) => ({
      ...c,
      formattedDob: formatDateOfBirth(c.dateOfBirth, c.age)
    }));

    const env = configureNunjucks(__dirname);
    const html = env.render("pdf-template.njk", {
      listTitle,
      contentDate: options.contentDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
      publishedDateTime: `${published.date} ${t.at} ${published.time}`,
      cases: formattedCases,
      t,
      dataSource: provenanceLabel,
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
