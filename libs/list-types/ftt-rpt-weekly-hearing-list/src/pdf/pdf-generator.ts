import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BasePdfGenerationOptions, generateFttSiacWeeklyHearingListPdf, type PdfGenerationResult } from "@hmcts/list-types-common";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import { buildImportantInformationText } from "../locales/important-information-text.js";
import type { FttRptHearingList } from "../models/types.js";
import { renderFttRptData } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MARKET_RENTS_LIST_TYPE = "FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST";

interface PdfGenerationOptions extends BasePdfGenerationOptions<FttRptHearingList> {
  contentDate: Date;
  courtName: string;
  listTitle: string;
  listTypeName?: string;
}

interface RptTranslations {
  importantInformationTextTemplate: string;
  rptRegionalEmail: Record<string, string>;
  marketRentsExtraInformation: string;
}

export async function generateFttRptWeeklyHearingListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  const listTypeName = options.listTypeName ?? "";

  return generateFttSiacWeeklyHearingListPdf({
    ...options,
    moduleDir: __dirname,
    provenanceLabel: options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "",
    importEn: () => import("../locales/en.js"),
    importCy: () => import("../locales/cy.js"),
    generatePdf: generatePdfFromHtml,
    renderData: renderFttRptData,
    resolveTemplateVars: (translations) => {
      const t = translations as unknown as RptTranslations;
      const regionalEmail = t.rptRegionalEmail[listTypeName];
      const importantInformationText = regionalEmail ? buildImportantInformationText(t.importantInformationTextTemplate, regionalEmail) : "";
      const extraInformationText = listTypeName === MARKET_RENTS_LIST_TYPE ? t.marketRentsExtraInformation : "";

      return { importantInformationText, extraInformationText };
    }
  });
}
