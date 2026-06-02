import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDailyHearingListPdfGenerator } from "@hmcts/list-types-common";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import type { UtccHearingList } from "../models/types.js";
import { renderUtccDailyHearingListData } from "../rendering/renderer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const generateUtccDailyHearingListPdf = createDailyHearingListPdfGenerator<UtccHearingList>(
  "Upper Tribunal Tax and Chancery Chamber",
  "Upper Tribunal Tax and Chancery Chamber Daily Hearing list",
  renderUtccDailyHearingListData,
  () => import("../pages/en.js"),
  () => import("../pages/cy.js"),
  __dirname,
  PROVENANCE_LABELS,
  generatePdfFromHtml
);
