import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import nunjucks from "nunjucks";
import type { CareStandardsTribunalHearingList } from "../models/types.js";
import { renderCareStandardsTribunalData } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..");
const TEMP_STORAGE_BASE = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

const MAX_PDF_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

interface PdfGenerationOptions {
  artefactId: string;
  displayFrom: Date;
  displayTo: Date;
  locale: string;
  locationId: string;
  jsonData: CareStandardsTribunalHearingList;
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
  const templateDir = __dirname;
  const env = nunjucks.configure([templateDir], {
    autoescape: true,
    noCache: true
  });
  return env;
}

export async function generateCareStandardsTribunalWeeklyHearingListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  try {
    const renderedData = renderCareStandardsTribunalData(options.jsonData, {
      locale: options.locale,
      courtName: "Care Standards Tribunal",
      displayFrom: options.displayFrom,
      displayTo: options.displayTo,
      lastReceivedDate: new Date().toISOString(),
      listTitle: "Care Standards Tribunal Weekly Hearing List"
    });

    const translations = await loadTranslations(options.locale);

    const provenanceLabel = options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "";

    const env = configureNunjucks();
    const html = env.render("pdf-template.njk", {
      header: renderedData.header,
      hearings: renderedData.hearings,
      dataSource: provenanceLabel,
      t: translations
    });

    const pdfResult = await generatePdfFromHtml(html);

    if (!pdfResult.success || !pdfResult.pdfBuffer) {
      return {
        success: false,
        error: pdfResult.error || "PDF generation failed"
      };
    }

    const exceedsMaxSize = pdfResult.sizeBytes! > MAX_PDF_SIZE_BYTES;

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
  if (locale === "cy") {
    const { cy } = await import("../pages/cy.js");
    return cy;
  }
  const { en } = await import("../pages/en.js");
  return en;
}
