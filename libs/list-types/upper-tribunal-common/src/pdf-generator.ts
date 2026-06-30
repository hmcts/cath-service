import {
  type BasePdfGenerationOptions,
  configureNunjucks,
  createPdfErrorResult,
  type DailyHearingListRenderedData,
  type DailyHearingListRenderOptions,
  loadTranslations,
  PDF_BASE_STYLES,
  type PdfFromHtmlResult,
  type PdfGenerationResult,
  savePdfToStorage
} from "@hmcts/list-types-common";

export function createUpperTribunalPdfGenerator<T>(
  courtName: string,
  listTitle: string,
  renderFn: (data: T, options: DailyHearingListRenderOptions) => DailyHearingListRenderedData,
  importEn: () => Promise<{ en: Record<string, unknown> }>,
  importCy: () => Promise<{ cy: Record<string, unknown> }>,
  dirname: string,
  provenanceLabels: Record<string, string>,
  generatePdfFn: (html: string) => Promise<PdfFromHtmlResult>
) {
  return async function generatePdf(options: BasePdfGenerationOptions<T> & { contentDate: Date }): Promise<PdfGenerationResult> {
    try {
      const renderedData = renderFn(options.jsonData, {
        locale: options.locale,
        courtName,
        contentDate: options.contentDate,
        lastReceivedDate: new Date().toISOString(),
        listTitle
      });

      const translations = await loadTranslations(options.locale, importEn, importCy);

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
