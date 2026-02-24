import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPdf = vi.fn();
const mockSetContent = vi.fn();
const mockNewPage = vi.fn();
const mockClose = vi.fn();
const mockLaunch = vi.fn();

vi.mock("puppeteer", () => ({
  default: {
    launch: mockLaunch
  }
}));

describe("generatePdfFromHtml", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPdf.mockResolvedValue(Buffer.from("PDF content"));
    mockSetContent.mockResolvedValue(undefined);
    mockNewPage.mockResolvedValue({
      setContent: mockSetContent,
      pdf: mockPdf
    });
    mockClose.mockResolvedValue(undefined);
    mockLaunch.mockResolvedValue({
      newPage: mockNewPage,
      close: mockClose
    });
  });

  it("should generate PDF successfully from HTML", async () => {
    const { generatePdfFromHtml } = await import("./generator.js");

    const result = await generatePdfFromHtml("<html><body><h1>Test</h1></body></html>");

    expect(result.success).toBe(true);
    expect(result.pdfBuffer).toBeInstanceOf(Buffer);
    expect(result.sizeBytes).toBe(11);
    expect(result.error).toBeUndefined();
  });

  it("should launch browser with correct options", async () => {
    const { generatePdfFromHtml } = await import("./generator.js");

    await generatePdfFromHtml("<html></html>");

    expect(mockLaunch).toHaveBeenCalledWith({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });
  });

  it("should set page content with networkidle0 wait", async () => {
    const { generatePdfFromHtml } = await import("./generator.js");
    const html = "<html><body>Content</body></html>";

    await generatePdfFromHtml(html);

    expect(mockSetContent).toHaveBeenCalledWith(html, {
      waitUntil: "networkidle0"
    });
  });

  it("should generate PDF with A4 format and margins", async () => {
    const { generatePdfFromHtml } = await import("./generator.js");

    await generatePdfFromHtml("<html></html>");

    expect(mockPdf).toHaveBeenCalledWith({
      format: "A4",
      printBackground: true,
      margin: {
        top: "1cm",
        right: "1cm",
        bottom: "1cm",
        left: "1cm"
      }
    });
  });

  it("should close browser after successful generation", async () => {
    const { generatePdfFromHtml } = await import("./generator.js");

    await generatePdfFromHtml("<html></html>");

    expect(mockClose).toHaveBeenCalled();
  });

  it("should return error when browser launch fails", async () => {
    mockLaunch.mockRejectedValue(new Error("Browser not found"));

    const { generatePdfFromHtml } = await import("./generator.js");
    const result = await generatePdfFromHtml("<html></html>");

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed: Browser not found");
    expect(result.pdfBuffer).toBeUndefined();
  });

  it("should return error when setContent fails", async () => {
    mockSetContent.mockRejectedValue(new Error("Invalid HTML"));

    const { generatePdfFromHtml } = await import("./generator.js");
    const result = await generatePdfFromHtml("<invalid>");

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed: Invalid HTML");
    expect(mockClose).toHaveBeenCalled();
  });

  it("should return error when pdf generation fails", async () => {
    mockPdf.mockRejectedValue(new Error("PDF rendering error"));

    const { generatePdfFromHtml } = await import("./generator.js");
    const result = await generatePdfFromHtml("<html></html>");

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed: PDF rendering error");
    expect(mockClose).toHaveBeenCalled();
  });

  it("should handle non-Error exceptions", async () => {
    mockLaunch.mockRejectedValue("String error");

    const { generatePdfFromHtml } = await import("./generator.js");
    const result = await generatePdfFromHtml("<html></html>");

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed: Unknown error");
  });

  it("should return correct size for generated PDF", async () => {
    const pdfContent = Buffer.from("A".repeat(1000));
    mockPdf.mockResolvedValue(pdfContent);

    const { generatePdfFromHtml } = await import("./generator.js");
    const result = await generatePdfFromHtml("<html></html>");

    expect(result.sizeBytes).toBe(1000);
  });

  it("should close browser even when pdf generation fails", async () => {
    mockPdf.mockRejectedValue(new Error("Failed"));

    const { generatePdfFromHtml } = await import("./generator.js");
    await generatePdfFromHtml("<html></html>");

    expect(mockClose).toHaveBeenCalled();
  });
});

describe("pdf-generation module exports", () => {
  it("should export generatePdfFromHtml function", async () => {
    const module = await import("./generator.js");
    expect(typeof module.generatePdfFromHtml).toBe("function");
  });
});
