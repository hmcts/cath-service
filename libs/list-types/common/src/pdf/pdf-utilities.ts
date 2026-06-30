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

export interface RenderedPdfData {
  header: Record<string, unknown>;
  hearings: unknown[];
}

export interface FttSiacWeeklyHearingListPdfOptions<T> extends BasePdfGenerationOptions<T> {
  contentDate: Date;
  courtName: string;
  listTitle: string;
  moduleDir: string;
  provenanceLabel: string;
  importEn: () => Promise<{ en: Record<string, unknown> }>;
  importCy: () => Promise<{ cy: Record<string, unknown> }>;
  generatePdf: (html: string) => Promise<{ success: boolean; pdfBuffer?: Buffer; sizeBytes?: number; error?: string }>;
  renderData: (jsonData: T, opts: { locale: string; courtName: string; contentDate: Date; lastReceivedDate: string; listTitle: string }) => RenderedPdfData;
}

export async function generateFttSiacWeeklyHearingListPdf<T>(options: FttSiacWeeklyHearingListPdfOptions<T>): Promise<PdfGenerationResult> {
  try {
    const renderedData = options.renderData(options.jsonData, {
      locale: options.locale,
      courtName: options.courtName,
      contentDate: options.contentDate,
      lastReceivedDate: new Date().toISOString(),
      listTitle: options.listTitle
    });

    const translations = await loadTranslations(options.locale, options.importEn, options.importCy);

    const env = configureNunjucks(options.moduleDir);
    const html = env.render("pdf-template.njk", {
      header: renderedData.header,
      hearings: renderedData.hearings,
      dataSource: options.provenanceLabel,
      t: translations,
      pdfStyles: PDF_BASE_STYLES
    });

    const pdfResult = await options.generatePdf(html);

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
