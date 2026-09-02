import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BasePdfGenerationOptions, generateListPdf, type PdfGenerationResult } from "@hmcts/list-types-common";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import type { SendDailyHearingList } from "../models/types.js";
import { renderSendDailyHearingListData } from "../rendering/renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateSendDailyHearingListPdf(options: BasePdfGenerationOptions<SendDailyHearingList>): Promise<PdfGenerationResult> {
  return generateListPdf({
    ...options,
    listTitle: "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List",
    provenanceLabel: options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "",
    templateDir: __dirname,
    renderData: renderSendDailyHearingListData,
    importEn: () => import("../locales/en.js"),
    importCy: () => import("../locales/cy.js")
  });
}
