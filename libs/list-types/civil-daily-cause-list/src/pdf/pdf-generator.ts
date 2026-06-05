import path from "node:path";
import { fileURLToPath } from "node:url";
import { type DailyCauseListPdfOptions, generateDailyCauseListPdf, type PdfGenerationResult } from "@hmcts/daily-cause-list-common";
import { PROVENANCE_LABELS } from "@hmcts/publication";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateCivilDailyCauseListPdf(options: Omit<DailyCauseListPdfOptions, "provenanceLabel">): Promise<PdfGenerationResult> {
  const provenanceLabel = options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "";
  return generateDailyCauseListPdf(
    { ...options, provenanceLabel },
    __dirname,
    () => import("../pages/en.js"),
    () => import("../pages/cy.js")
  );
}
