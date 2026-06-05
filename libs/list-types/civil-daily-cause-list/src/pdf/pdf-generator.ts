import path from "node:path";
import { fileURLToPath } from "node:url";
import { type DailyCauseListPdfOptions, generateDailyCauseListPdf, type PdfGenerationResult } from "@hmcts/daily-cause-list-common";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateCivilDailyCauseListPdf(options: DailyCauseListPdfOptions): Promise<PdfGenerationResult> {
  return generateDailyCauseListPdf(
    options,
    __dirname,
    () => import("../pages/en.js"),
    () => import("../pages/cy.js")
  );
}
