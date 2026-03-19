interface PdfGenerationResult {
  success: boolean;
  pdfBuffer?: Buffer;
  sizeBytes?: number;
  error?: string;
}

const PDF_OPTIONS = {
  format: "A4" as const,
  printBackground: true,
  margin: {
    top: "1cm",
    right: "1cm",
    bottom: "1cm",
    left: "1cm"
  }
};

export async function generatePdfFromHtml(html: string): Promise<PdfGenerationResult> {
  // Dynamically import puppeteer to avoid ESM/CJS issues in tests
  const puppeteer = await import("puppeteer");
  let browser: Awaited<ReturnType<typeof puppeteer.default.launch>> | undefined;

  try {
    browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0"
    });

    const pdfBuffer = await page.pdf(PDF_OPTIONS);

    const sizeBytes = pdfBuffer.length;

    return {
      success: true,
      pdfBuffer: Buffer.from(pdfBuffer),
      sizeBytes
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `PDF generation failed: ${errorMessage}`
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
