import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDailyHearingListPdfGenerator } from "@hmcts/list-types-common";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import type { UtlcHearingList } from "../models/types.js";
import { renderUtlcDailyHearingListData } from "../rendering/renderer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const generateUtlcDailyHearingListPdf = createDailyHearingListPdfGenerator<UtlcHearingList>(
  "Upper Tribunal (Lands Chamber)",
  "Upper Tribunal (Lands Chamber) Daily Hearing list",
  renderUtlcDailyHearingListData,
  () => import("../pages/en.js"),
  () => import("../pages/cy.js"),
  __dirname,
  PROVENANCE_LABELS,
  generatePdfFromHtml
);
