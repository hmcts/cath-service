import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type BasePdfGenerationOptions,
  configureNunjucks,
  createPdfErrorResult,
  PDF_BASE_STYLES,
  type PdfGenerationResult,
  savePdfToStorage
} from "@hmcts/list-types-common";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { AdministrativeCourtHearingList } from "../models/types.js";
import { renderAdminCourt } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_LIST_TITLE = "Administrative Court Daily Cause List";

export async function generateAdministrativeCourtDailyCauseListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  try {
    const t = options.locale === "cy" ? cy : en;
    const court = isCourtListTypeName(options.listTypeName) ? t[options.listTypeName] : undefined;

    const renderedData = renderAdminCourt(options.jsonData, {
      locale: options.locale,
      listTypeName: options.listTypeName,
      listTitle: court?.pageTitle ?? DEFAULT_LIST_TITLE,
      contentDate: options.contentDate,
      lastReceivedDate: new Date().toISOString()
    });

    const provenanceLabel = options.provenance
      ? t.common.provenanceLabels[options.provenance as keyof typeof t.common.provenanceLabels] || options.provenance
      : "";

    const env = configureNunjucks(__dirname);
    const html = env.render("pdf-template.njk", {
      header: renderedData.header,
      hearings: renderedData.hearings,
      dataSource: provenanceLabel,
      t,
      court,
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

function isCourtListTypeName(listTypeName: string): listTypeName is CourtListTypeName {
  return listTypeName !== "common" && Object.hasOwn(en, listTypeName);
}

interface PdfGenerationOptions extends BasePdfGenerationOptions<AdministrativeCourtHearingList> {
  contentDate: Date;
  listTypeName: string;
}

type CourtListTypeName = Exclude<keyof typeof en, "common">;
