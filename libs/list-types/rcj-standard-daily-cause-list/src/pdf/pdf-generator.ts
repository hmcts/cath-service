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
import type { StandardHearingList } from "../models/types.js";
import { renderStandardDailyCauseList } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PdfGenerationOptions extends BasePdfGenerationOptions<StandardHearingList> {
  contentDate: Date;
  listTypeName: string;
}

const LIST_TITLE_MAP: Record<string, string> = {
  CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST: "Civil Courts at the Royal Courts of Justice Daily Cause List",
  COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST: "County Court at Central London Civil Daily Cause List",
  COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST: "Court of Appeal (Criminal Division) Daily Cause List",
  FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST: "Family Division of the High Court Daily Cause List",
  KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST: "King's Bench Division Daily Cause List",
  KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST: "King's Bench Masters Daily Cause List",
  MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST: "Civil Daily Cause List",
  SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST: "Senior Courts Costs Office Daily Cause List"
};

export async function generateRcjStandardDailyCauseListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  try {
    const listTitle = LIST_TITLE_MAP[options.listTypeName] || "RCJ Standard Daily Cause List";

    const renderedData = renderStandardDailyCauseList(options.jsonData, {
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
