import { existsSync } from "node:fs";

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

const CHROMIUM_PATHS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/usr/bin/chromium-browser", // Alpine Linux (apk add chromium)
  "/usr/bin/chromium" // Alpine Linux alternative
];

function findChromiumExecutable(): string | undefined {
  for (const chromiumPath of CHROMIUM_PATHS) {
    if (chromiumPath && existsSync(chromiumPath)) return chromiumPath;
  }
  return undefined;
}

export async function generatePdfFromHtml(html: string): Promise<PdfGenerationResult> {
  // Dynamically import puppeteer to avoid ESM/CJS issues in tests
  const puppeteer = await import("puppeteer");
  let browser: Awaited<ReturnType<typeof puppeteer.default.launch>> | undefined;

  try {
    browser = await puppeteer.default.launch({
      headless: true,
      executablePath: findChromiumExecutable(),
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
