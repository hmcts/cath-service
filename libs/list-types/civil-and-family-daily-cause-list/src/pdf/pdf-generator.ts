import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import nunjucks from "nunjucks";
import type { CauseListData, RenderOptions } from "../models/types.js";
import { renderCauseListData } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Navigate to monorepo root (from libs/list-types/civil-and-family-daily-cause-list/src/pdf/)
const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..");
const TEMP_STORAGE_BASE = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

const MAX_PDF_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

interface PdfGenerationOptions {
  artefactId: string;
  contentDate: Date;
  locale: string;
  locationId: string;
  jsonData: CauseListData;
  provenance?: string;
}

interface PdfGenerationResult {
  success: boolean;
  pdfPath?: string;
  sizeBytes?: number;
  exceedsMaxSize?: boolean;
  error?: string;
}

function configureNunjucks(): nunjucks.Environment {
  // Use the standalone PDF template directory (current directory)
  const templateDir = __dirname;

  const env = nunjucks.configure([templateDir], {
    autoescape: true,
    noCache: true
  });

  return env;
}

export async function generateCauseListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  try {
    // Render the data using the existing renderer
    const renderOptions: RenderOptions = {
      contentDate: options.contentDate,
      locale: options.locale,
      locationId: options.locationId
    };

    const renderedData = await renderCauseListData(options.jsonData, renderOptions);

    // Load translations
    const translations = await loadTranslations(options.locale);

    // Normalize provenance text
    const provenanceLabel = options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "";

    // Configure Nunjucks and render the standalone PDF template
    const env = configureNunjucks();
    const html = env.render("pdf-template.njk", {
      header: renderedData.header,
      openJustice: renderedData.openJustice,
      listData: renderedData.listData,
      dataSource: provenanceLabel,
      t: translations
    });

    // Generate PDF from HTML
    const pdfResult = await generatePdfFromHtml(html);

    if (!pdfResult.success || !pdfResult.pdfBuffer) {
      return {
        success: false,
        error: pdfResult.error || "PDF generation failed"
      };
    }

    // Check if PDF exceeds 2MB
    const exceedsMaxSize = pdfResult.sizeBytes! > MAX_PDF_SIZE_BYTES;

    // Ensure storage directory exists and save PDF
    await fs.mkdir(TEMP_STORAGE_BASE, { recursive: true });
    const pdfPath = path.join(TEMP_STORAGE_BASE, `${options.artefactId}.pdf`);
    await fs.writeFile(pdfPath, pdfResult.pdfBuffer);

    return {
      success: true,
      pdfPath,
      sizeBytes: pdfResult.sizeBytes,
      exceedsMaxSize
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Failed to generate PDF: ${errorMessage}`
    };
  }
}

async function loadTranslations(locale: string): Promise<Record<string, unknown>> {
  // Import from the pages directory where translations are stored
  if (locale === "cy") {
    const { cy } = await import("../pages/cy.js");
    return cy;
  }
  const { en } = await import("../pages/en.js");
  return en;
}
