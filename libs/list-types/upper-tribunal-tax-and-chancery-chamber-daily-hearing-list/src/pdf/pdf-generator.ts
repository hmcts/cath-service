import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import { createUtDailyHearingListPdfGenerator } from "@hmcts/upper-tribunal-common";
import type { UtccHearingList } from "../models/types.js";
import { renderUtccDailyHearingListData } from "../rendering/renderer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function generateUtccDailyHearingListPdf(options: Parameters<ReturnType<typeof createUtDailyHearingListPdfGenerator<UtccHearingList>>>[0]) {
  return createUtDailyHearingListPdfGenerator<UtccHearingList>(
    renderUtccDailyHearingListData,
    () => import("../locales/en.js"),
    () => import("../locales/cy.js"),
    __dirname,
    PROVENANCE_LABELS,
    generatePdfFromHtml
  )(options);
}
