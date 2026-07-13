import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/list-types-common", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/list-types-common")>();
  return {
    ...actual,
    configureNunjucks: vi.fn().mockReturnValue({
      render: vi.fn().mockReturnValue("<html>mock pdf html</html>")
    }),
    loadTranslations: vi.fn().mockResolvedValue({ pageTitle: "Primary Health Tribunal Weekly Hearing List" }),
    savePdfToStorage: vi.fn().mockResolvedValue({ success: true, pdfPath: "/stored/path.pdf", sizeBytes: 3 }),
    createPdfErrorResult: vi.fn().mockReturnValue({ success: false, error: "error" })
  };
});

vi.mock("@hmcts/pdf-generation", () => ({
  generatePdfFromHtml: vi.fn().mockResolvedValue({ success: true, pdfBuffer: Buffer.from("pdf"), sizeBytes: 3 })
}));

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: { MANUAL_UPLOAD: "Manual Upload" }
}));

vi.mock("../rendering/renderer.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../rendering/renderer.js")>();
  return {
    ...actual,
    renderPhtData: vi.fn().mockReturnValue({
      header: {
        listTitle: "Primary Health Tribunal Weekly Hearing List",
        weekCommencingDate: "2 January 2025",
        lastUpdatedDate: "1 January 2025",
        lastUpdatedTime: "9am"
      },
      hearings: []
    })
  };
});

import { generatePhtWeeklyHearingListPdf } from "./pdf-generator.js";

const BASE_OPTIONS = {
  artefactId: "test-artefact-id",
  jsonData: [
    {
      date: "02/01/2025",
      caseName: "A Vs B",
      hearingLength: "1 hour",
      hearingType: "Substantive hearing",
      venue: "Primary Health Tribunal",
      additionalInformation: "Remote hearing"
    }
  ],
  locale: "en",
  provenance: "MANUAL_UPLOAD",
  contentDate: new Date(2025, 0, 2)
};

describe("generatePhtWeeklyHearingListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate PDF successfully", async () => {
    const { savePdfToStorage } = await import("@hmcts/list-types-common");
    vi.mocked(savePdfToStorage).mockResolvedValue({ success: true, pdfPath: "/stored/path.pdf", sizeBytes: 3 });

    const result = await generatePhtWeeklyHearingListPdf(BASE_OPTIONS);

    expect(result.success).toBe(true);
  });

  it("should call renderPhtData with PHT_COURT_NAME and PHT_LIST_TITLE constants", async () => {
    const { renderPhtData } = await import("../rendering/renderer.js");

    await generatePhtWeeklyHearingListPdf(BASE_OPTIONS);

    expect(renderPhtData).toHaveBeenCalledWith(
      BASE_OPTIONS.jsonData,
      expect.objectContaining({
        courtName: "Primary Health Tribunal",
        listTitle: "Primary Health Tribunal Weekly Hearing List",
        locale: "en",
        contentDate: BASE_OPTIONS.contentDate
      })
    );
  });

  it("should pass Welsh locale to renderPhtData when locale is cy", async () => {
    const { renderPhtData } = await import("../rendering/renderer.js");

    await generatePhtWeeklyHearingListPdf({ ...BASE_OPTIONS, locale: "cy" });

    expect(renderPhtData).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ locale: "cy" }));
  });

  it("should load translations for the given locale", async () => {
    const { loadTranslations } = await import("@hmcts/list-types-common");

    await generatePhtWeeklyHearingListPdf(BASE_OPTIONS);

    expect(loadTranslations).toHaveBeenCalledWith("en", expect.any(Function), expect.any(Function));
  });

  it("should load Welsh translations when locale is cy", async () => {
    const { loadTranslations } = await import("@hmcts/list-types-common");

    await generatePhtWeeklyHearingListPdf({ ...BASE_OPTIONS, locale: "cy" });

    expect(loadTranslations).toHaveBeenCalledWith("cy", expect.any(Function), expect.any(Function));
  });

  it("should use provenance label from PROVENANCE_LABELS when provenance matches", async () => {
    const { configureNunjucks } = await import("@hmcts/list-types-common");
    const mockRender = vi.fn().mockReturnValue("<html></html>");
    vi.mocked(configureNunjucks).mockReturnValue({ render: mockRender } as any);

    await generatePhtWeeklyHearingListPdf({ ...BASE_OPTIONS, provenance: "MANUAL_UPLOAD" });

    expect(mockRender).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "Manual Upload" }));
  });

  it("should use raw provenance string when not in PROVENANCE_LABELS", async () => {
    const { configureNunjucks } = await import("@hmcts/list-types-common");
    const mockRender = vi.fn().mockReturnValue("<html></html>");
    vi.mocked(configureNunjucks).mockReturnValue({ render: mockRender } as any);

    await generatePhtWeeklyHearingListPdf({ ...BASE_OPTIONS, provenance: "SOME_UNKNOWN_SOURCE" });

    expect(mockRender).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "SOME_UNKNOWN_SOURCE" }));
  });

  it("should use empty string for dataSource when provenance is not provided", async () => {
    const { configureNunjucks } = await import("@hmcts/list-types-common");
    const mockRender = vi.fn().mockReturnValue("<html></html>");
    vi.mocked(configureNunjucks).mockReturnValue({ render: mockRender } as any);

    const { provenance: _, ...optionsWithoutProvenance } = BASE_OPTIONS;
    await generatePhtWeeklyHearingListPdf(optionsWithoutProvenance as any);

    expect(mockRender).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "" }));
  });

  it("should pass rendered header and hearings to the template", async () => {
    const { configureNunjucks, loadTranslations } = await import("@hmcts/list-types-common");
    const { renderPhtData } = await import("../rendering/renderer.js");
    const mockRender = vi.fn().mockReturnValue("<html></html>");
    vi.mocked(configureNunjucks).mockReturnValue({ render: mockRender } as any);
    const mockTranslations = { title: "PHT" };
    vi.mocked(loadTranslations).mockResolvedValue(mockTranslations as any);
    const mockRenderedData = {
      header: { listTitle: "PHT List", weekCommencingDate: "2 January 2025", lastUpdatedDate: "1 January 2025", lastUpdatedTime: "9am" },
      hearings: [
        { date: "02 January 2025", caseName: "A Vs B", hearingLength: "1 hour", hearingType: "Substantive hearing", venue: "PHT", additionalInformation: "" }
      ]
    };
    vi.mocked(renderPhtData).mockReturnValue(mockRenderedData);

    await generatePhtWeeklyHearingListPdf(BASE_OPTIONS);

    expect(mockRender).toHaveBeenCalledWith(
      "pdf-template.njk",
      expect.objectContaining({
        header: mockRenderedData.header,
        hearings: mockRenderedData.hearings,
        t: mockTranslations
      })
    );
  });

  it("should return failure when generatePdfFromHtml returns success: false", async () => {
    const { generatePdfFromHtml } = await import("@hmcts/pdf-generation");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: false, error: "PDF engine error" });

    const result = await generatePhtWeeklyHearingListPdf(BASE_OPTIONS);

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF engine error");
  });

  it("should return 'PDF generation failed' when generatePdfFromHtml returns no error message", async () => {
    const { generatePdfFromHtml } = await import("@hmcts/pdf-generation");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: false });

    const result = await generatePhtWeeklyHearingListPdf(BASE_OPTIONS);

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should return failure when generatePdfFromHtml returns no pdfBuffer", async () => {
    const { generatePdfFromHtml } = await import("@hmcts/pdf-generation");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: undefined });

    const result = await generatePhtWeeklyHearingListPdf(BASE_OPTIONS);

    expect(result.success).toBe(false);
  });

  it("should call savePdfToStorage with artefactId and pdfBuffer", async () => {
    const { savePdfToStorage } = await import("@hmcts/list-types-common");
    const { generatePdfFromHtml } = await import("@hmcts/pdf-generation");
    const pdfBuffer = Buffer.from("test-pdf-content");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer, sizeBytes: 42 });

    await generatePhtWeeklyHearingListPdf(BASE_OPTIONS);

    expect(savePdfToStorage).toHaveBeenCalledWith("test-artefact-id", pdfBuffer, 42);
  });

  it("should return createPdfErrorResult when an unexpected error is thrown", async () => {
    const { renderPhtData } = await import("../rendering/renderer.js");
    const { createPdfErrorResult } = await import("@hmcts/list-types-common");
    vi.mocked(renderPhtData).mockImplementation(() => {
      throw new Error("Unexpected render error");
    });
    vi.mocked(createPdfErrorResult).mockReturnValue({ success: false, error: "Unexpected render error" });

    const result = await generatePhtWeeklyHearingListPdf(BASE_OPTIONS);

    expect(result.success).toBe(false);
    expect(createPdfErrorResult).toHaveBeenCalled();
  });
});
