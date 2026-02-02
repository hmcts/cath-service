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
import type { StandardHearingList } from "../models/types.js";
import { renderStandardDailyCauseList } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PdfGenerationOptions extends BasePdfGenerationOptions<StandardHearingList> {
  contentDate: Date;
  listTypeId: number;
}

const LIST_TYPE_KEY_MAP: Record<number, string> = {
  10: "CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST",
  11: "COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST",
  12: "COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST",
  13: "FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST",
  14: "KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST",
  15: "KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST",
  16: "MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST",
  17: "SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST"
};

const LIST_TITLE_MAP: Record<number, string> = {
  10: "Civil Courts at the Royal Courts of Justice Daily Cause List",
  11: "County Court at Central London Civil Daily Cause List",
  12: "Court of Appeal (Criminal Division) Daily Cause List",
  13: "Family Division of the High Court Daily Cause List",
  14: "King's Bench Division Daily Cause List",
  15: "King's Bench Masters Daily Cause List",
  16: "Civil Daily Cause List",
  17: "Senior Courts Costs Office Daily Cause List"
};

export async function generateRcjStandardDailyCauseListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  try {
    const listTitle = LIST_TITLE_MAP[options.listTypeId] || "RCJ Standard Daily Cause List";
    const listTypeKey = LIST_TYPE_KEY_MAP[options.listTypeId] || "CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST";

    const renderedData = renderStandardDailyCauseList(options.jsonData, {
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
