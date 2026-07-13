import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import { createUtDailyHearingListPdfGenerator } from "@hmcts/upper-tribunal-common";
import type { UtlcHearingList } from "../models/types.js";
import { renderUtlcDailyHearingListData } from "../rendering/renderer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const generateUtlcDailyHearingListPdf = createUtDailyHearingListPdfGenerator<UtlcHearingList>(
  renderUtlcDailyHearingListData,
  () => import("../locales/en.js"),
  () => import("../locales/cy.js"),
  __dirname,
  PROVENANCE_LABELS,
  generatePdfFromHtml
);
