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
import type { AdministrativeCourtHearingList } from "../models/types.js";
import { renderAdminCourt } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PdfGenerationOptions extends BasePdfGenerationOptions<AdministrativeCourtHearingList> {
  contentDate: Date;
  listTypeName: string;
}

const LIST_TITLE_MAP: Record<string, string> = {
  BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: "Birmingham Administrative Court Daily Cause List",
  LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: "Leeds Administrative Court Daily Cause List",
  BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: "Bristol and Cardiff Administrative Court Daily Cause List",
  MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: "Manchester Administrative Court Daily Cause List"
};

export async function generateAdministrativeCourtDailyCauseListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  try {
    const listTitle = LIST_TITLE_MAP[options.listTypeName] || "Administrative Court Daily Cause List";

    const renderedData = renderAdminCourt(options.jsonData, {
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

    const courtTranslations = translations[options.listTypeName as keyof typeof translations] as Record<string, string>;

    const env = configureNunjucks(__dirname);
    const html = env.render("pdf-template.njk", {
      header: renderedData.header,
      hearings: renderedData.hearings,
      dataSource: provenanceLabel,
      t: translations,
      court: courtTranslations,
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
