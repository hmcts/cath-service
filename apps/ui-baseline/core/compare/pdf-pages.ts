import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

// A PDF's pages as PNG images, for a report to show pip's and CaTH's side by side. Drawn by pdf.js
// with the canvas it brings for Node (@napi-rs/canvas), so no browser is needed. Only the text is
// compared (file-compare.ts); the pictures are for a person to look at.
const SCALE = 1.25;

export async function pdfPagePngs(data: Uint8Array, maxPages: number): Promise<PdfPages> {
  // pdf.js takes ownership of the buffer it is given, so it gets a copy
  const loading = getDocument({ data: new Uint8Array(data), verbosity: 0 });
  const document = await loading.promise;
  try {
    const images: Buffer[] = [];
    for (let number = 1; number <= Math.min(document.numPages, maxPages); number++) {
      const page = await document.getPage(number);
      const viewport = page.getViewport({ scale: SCALE });
      const { canvas, context } = (document.canvasFactory as CanvasFactory).create(viewport.width, viewport.height);
      // pdf.js types its canvas as a browser one; in Node it takes the one its own factory made
      await page.render({ canvas, canvasContext: context, viewport } as unknown as Parameters<typeof page.render>[0]).promise;
      images.push(canvas.toBuffer("image/png"));
      page.cleanup();
    }
    return { pages: document.numPages, images };
  } finally {
    await loading.destroy();
  }
}

export interface PdfPages {
  // How many pages the PDF has, which can be more than were drawn
  pages: number;
  images: Buffer[];
}

interface CanvasFactory {
  create(width: number, height: number): { canvas: { toBuffer(type: "image/png"): Buffer }; context: unknown };
}
