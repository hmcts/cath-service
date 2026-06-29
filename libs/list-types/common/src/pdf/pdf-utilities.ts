import { CONTAINER, uploadBlob } from "@hmcts/azure-blob";
import nunjucks from "nunjucks";
import { PDF_BASE_STYLES } from "./pdf-styles.js";

export const MAX_PDF_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export interface PdfGenerationResult {
  success: boolean;
  pdfPath?: string;
  sizeBytes?: number;
  exceedsMaxSize?: boolean;
  error?: string;
}

export interface BasePdfGenerationOptions<T = unknown> {
  artefactId: string;
  locale: string;
  locationId: string;
  contentDate: Date;
  jsonData: T;
  provenance?: string;
}

export function configureNunjucks(templateDir: string): nunjucks.Environment {
  return nunjucks.configure([templateDir], {
    autoescape: true,
    noCache: true
  });
}

export async function savePdfToStorage(artefactId: string, pdfBuffer: Buffer, sizeBytes: number): Promise<PdfGenerationResult> {
  const exceedsMaxSize = sizeBytes > MAX_PDF_SIZE_BYTES;
  const blobKey = `${artefactId}.pdf`;

  await uploadBlob(blobKey, pdfBuffer, "application/pdf", CONTAINER.PUBLICATIONS);

  return {
    success: true,
    pdfPath: blobKey,
    sizeBytes,
    exceedsMaxSize
  };
}

export function createPdfErrorResult(error: unknown): PdfGenerationResult {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  return {
    success: false,
    error: `Failed to generate PDF: ${errorMessage}`
  };
}

export async function loadTranslations(
  locale: string,
  importEn: () => Promise<{ en: Record<string, unknown> }>,
  importCy: () => Promise<{ cy: Record<string, unknown> }>
): Promise<Record<string, unknown>> {
  if (locale === "cy") {
    const { cy } = await importCy();
    return cy;
  }
  const { en } = await importEn();
  return en;
}

export async function buildPdfFromRenderedList(params: {
  artefactId: string;
  templateDir: string;
  header: unknown;
  hearings: unknown;
  provenanceLabel: string;
  translations: Record<string, unknown>;
}): Promise<PdfGenerationResult> {
  const env = configureNunjucks(params.templateDir);
  const html = env.render("pdf-template.njk", {
    header: params.header,
    hearings: params.hearings,
    dataSource: params.provenanceLabel,
    t: params.translations,
    pdfStyles: PDF_BASE_STYLES
  });

  const pdfResult = await generatePdfFromHtml(html);

  if (!pdfResult.success || !pdfResult.pdfBuffer) {
    return { success: false, error: pdfResult.error || "PDF generation failed" };
  }

  return savePdfToStorage(params.artefactId, pdfResult.pdfBuffer, pdfResult.sizeBytes!);
}
