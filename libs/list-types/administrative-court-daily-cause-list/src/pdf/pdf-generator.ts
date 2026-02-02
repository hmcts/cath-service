import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type BasePdfGenerationOptions,
  configureNunjucks,
  createPdfErrorResult,
  loadTranslations,
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
  listTypeId: number;
}

const LIST_TYPE_KEY_MAP: Record<number, string> = {
  20: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
  21: "LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
  22: "BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
  23: "MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
};

const LIST_TITLE_MAP: Record<number, string> = {
  20: "Birmingham Administrative Court Daily Cause List",
  21: "Leeds Administrative Court Daily Cause List",
  22: "Bristol and Cardiff Administrative Court Daily Cause List",
  23: "Manchester Administrative Court Daily Cause List"
};

export async function generateAdministrativeCourtDailyCauseListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  try {
    const listTitle = LIST_TITLE_MAP[options.listTypeId] || "Administrative Court Daily Cause List";
    const listTypeKey = LIST_TYPE_KEY_MAP[options.listTypeId] || "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST";

    const renderedData = renderAdminCourt(options.jsonData, {
      locale: options.locale,
      listTypeId: options.listTypeId,
      listTitle,
      displayFrom: options.contentDate,
      displayTo: options.contentDate,
      lastReceivedDate: new Date().toISOString()
    });

    const translations = await loadTranslations(
      options.locale,
      () => import("../pages/en.js"),
      () => import("../pages/cy.js")
    );

    const provenanceLabel = options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "";

    const courtTranslations = translations[listTypeKey as keyof typeof translations] as Record<string, string>;

    const env = configureNunjucks(__dirname);
    const html = env.render("pdf-template.njk", {
      header: renderedData.header,
      hearings: renderedData.hearings,
      dataSource: provenanceLabel,
      t: translations,
      court: courtTranslations
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
