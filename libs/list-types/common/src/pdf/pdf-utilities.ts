import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nunjucks from "nunjucks";
import { PDF_BASE_STYLES } from "./pdf-styles.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Navigate to monorepo root (from libs/list-types/common/src/pdf/)
const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..");

export const TEMP_STORAGE_BASE = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");
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

  await fs.mkdir(TEMP_STORAGE_BASE, { recursive: true });
  const pdfPath = path.join(TEMP_STORAGE_BASE, `${artefactId}.pdf`);
  await fs.writeFile(pdfPath, pdfBuffer);

  return {
    success: true,
    pdfPath,
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

export interface DailyHearingListRenderOptions {
  locale: string;
  courtName: string;
  contentDate: Date;
  lastReceivedDate: string;
  listTitle: string;
}

export interface DailyHearingListRenderedData {
  header: { listTitle: string; hearingDate: string; lastUpdatedDate: string; lastUpdatedTime: string };
  hearings: unknown[];
}

export interface PdfFromHtmlResult {
  success: boolean;
  pdfBuffer?: Buffer;
  sizeBytes?: number;
  error?: string;
}

export function createDailyHearingListPdfGenerator<T>(
  courtName: string,
  listTitle: string,
  renderFn: (data: T, options: DailyHearingListRenderOptions) => DailyHearingListRenderedData,
  importEn: () => Promise<{ en: Record<string, unknown> }>,
  importCy: () => Promise<{ cy: Record<string, unknown> }>,
  dirname: string,
  provenanceLabels: Record<string, string>,
  generatePdfFn: (html: string) => Promise<PdfFromHtmlResult>
) {
  return async function generatePdf(options: BasePdfGenerationOptions<T> & { contentDate: Date }): Promise<PdfGenerationResult> {
    try {
      const renderedData = renderFn(options.jsonData, {
        locale: options.locale,
        courtName,
        contentDate: options.contentDate,
        lastReceivedDate: new Date().toISOString(),
        listTitle
      });

      const translations = await loadTranslations(options.locale, importEn, importCy);

      const provenanceLabel = options.provenance ? provenanceLabels[options.provenance] || options.provenance : "";

      const env = configureNunjucks(dirname);
      const html = env.render("pdf-template.njk", {
        header: renderedData.header,
        hearings: renderedData.hearings,
        dataSource: provenanceLabel,
        t: translations,
        pdfStyles: PDF_BASE_STYLES
      });

      const pdfResult = await generatePdfFn(html);

      if (!pdfResult.success || !pdfResult.pdfBuffer) {
        return { success: false, error: pdfResult.error || "PDF generation failed" };
      }

      return await savePdfToStorage(options.artefactId, pdfResult.pdfBuffer, pdfResult.sizeBytes!);
    } catch (error) {
      return createPdfErrorResult(error);
    }
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
