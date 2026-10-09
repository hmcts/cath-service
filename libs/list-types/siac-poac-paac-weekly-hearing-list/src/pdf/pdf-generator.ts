import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BasePdfGenerationOptions, generateFttSiacWeeklyHearingListPdf, type PdfGenerationResult } from "@hmcts/list-types-common";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { SiacPoacPaacHearingList } from "../models/types.js";
import { renderSiacPoacPaacData } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LIST_TYPE_KEYS: Partial<Record<string, ListTypeKeys>> = {
  SIAC_WEEKLY_HEARING_LIST: { courtName: "siacCourtName", title: "siacPageTitle" },
  POAC_WEEKLY_HEARING_LIST: { courtName: "poacCourtName", title: "poacPageTitle" },
  PAAC_WEEKLY_HEARING_LIST: { courtName: "paacCourtName", title: "paacPageTitle" }
};

export async function generateSiacPoacPaacWeeklyHearingListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  const keys = LIST_TYPE_KEYS[options.listTypeName];
  if (!keys) {
    return { success: false, error: `Unsupported list type: ${options.listTypeName}` };
  }
  const t = options.locale === "cy" ? cy : en;

  return generateFttSiacWeeklyHearingListPdf({
    ...options,
    courtName: t[keys.courtName],
    listTitle: t[keys.title],
    moduleDir: __dirname,
    provenanceLabel: options.provenance ? t.provenanceLabels[options.provenance as keyof typeof t.provenanceLabels] || options.provenance : "",
    importEn: () => import("../locales/en.js"),
    importCy: () => import("../locales/cy.js"),
    generatePdf: generatePdfFromHtml,
    renderData: renderSiacPoacPaacData
  });
}

interface ListTypeKeys {
  courtName: "siacCourtName" | "poacCourtName" | "paacCourtName";
  title: "siacPageTitle" | "poacPageTitle" | "paacPageTitle";
}

interface PdfGenerationOptions extends BasePdfGenerationOptions<SiacPoacPaacHearingList> {
  contentDate: Date;
  listTypeName: string;
}
