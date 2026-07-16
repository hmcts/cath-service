import path from "node:path";
import { fileURLToPath } from "node:url";
import { type DailyCauseListPdfOptions, generateDailyCauseListPdf } from "@hmcts/daily-cause-list-common";
import type { PdfGenerationResult } from "@hmcts/list-types-common";
import { PROVENANCE_LABELS } from "@hmcts/publication";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type PdfGenerationOptions = Omit<DailyCauseListPdfOptions, "provenanceLabel">;

export async function generateEtDailyListPdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  const provenanceLabel = options.provenance ? PROVENANCE_LABELS[options.provenance as keyof typeof PROVENANCE_LABELS] || options.provenance : "";

  return generateDailyCauseListPdf(
    { ...options, provenanceLabel },
    __dirname,
    () => import("../locales/en.js"),
    () => import("../locales/cy.js")
  );
}
