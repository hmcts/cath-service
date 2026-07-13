import {
  type BasePdfGenerationOptions,
  configureNunjucks,
  createPdfErrorResult,
  loadTranslations,
  PDF_BASE_STYLES,
  type PdfFromHtmlResult,
  type PdfGenerationResult,
  savePdfToStorage
} from "@hmcts/list-types-common";

export interface DailyHearingListRenderOptions {
  locale: string;
  contentDate: Date;
  lastReceivedDate: string;
  listTitle: string;
}

export interface DailyHearingListRenderedData {
  header: { listTitle: string; hearingDate: string; lastUpdatedDate: string; lastUpdatedTime: string };
  hearings: unknown[];
}

export function createUtDailyHearingListPdfGenerator<T>(
  renderFn: (data: T, options: DailyHearingListRenderOptions) => DailyHearingListRenderedData,
  importEn: () => Promise<{ en: Record<string, unknown> }>,
  importCy: () => Promise<{ cy: Record<string, unknown> }>,
  dirname: string,
  provenanceLabels: Record<string, string>,
  generatePdfFn: (html: string) => Promise<PdfFromHtmlResult>
) {
  return async function generatePdf(options: BasePdfGenerationOptions<T> & { contentDate: Date }): Promise<PdfGenerationResult> {
    try {
      const translations = await loadTranslations(options.locale, importEn, importCy);

      const renderedData = renderFn(options.jsonData, {
        locale: options.locale,
        contentDate: options.contentDate,
        lastReceivedDate: new Date().toISOString(),
        listTitle: translations.pageTitle as string
      });

      const provenanceLabel = options.provenance ? provenanceLabels[options.provenance] || options.provenance : "";

      const env = configureNunjucks(dirname);
      const html = env.render("pdf-template.njk", {
        header: renderedData.header,
        hearings: renderedData.hearings,
        dataSource: provenanceLabel,
        t: translations,
        pdfStyles: PDF_BASE_STYLES
      });

      const pdfResult = await generatePdfFn(html);

      if (!pdfResult.success || !pdfResult.pdfBuffer) {
        return { success: false, error: pdfResult.error || "PDF generation failed" };
      }

      return await savePdfToStorage(options.artefactId, pdfResult.pdfBuffer, pdfResult.sizeBytes!);
    } catch (error) {
      return createPdfErrorResult(error);
    }
  };
}
