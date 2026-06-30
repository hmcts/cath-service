import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import { createUtDailyHearingListPdfGenerator } from "@hmcts/upper-tribunal-common";
import type { UtaacHearingList } from "../models/types.js";
import { renderUtaacDailyHearingListData } from "../rendering/renderer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const generateUtaacDailyHearingListPdf = createUtDailyHearingListPdfGenerator<UtaacHearingList>(
  "Upper Tribunal (Administrative Appeals Chamber)",
  "Upper Tribunal (Administrative Appeals Chamber) Daily Hearing List",
  renderUtaacDailyHearingListData,
  () => import("../locales/en.js"),
  () => import("../locales/cy.js"),
  __dirname,
  PROVENANCE_LABELS,
  generatePdfFromHtml
);
