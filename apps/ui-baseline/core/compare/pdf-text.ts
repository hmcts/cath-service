import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

// The text of a PDF as lines in reading order, for comparing content between two apps that style
// their PDFs differently. pdf.js hands text back as positioned fragments; fragments on the same
// baseline make a line, and fragments that touch are one word, however the generator split them.
// Page numbering is dropped, with any running footer that carries it (pip ends each page with the
// service name and "page 1 of 5"): it depends on where page breaks fall, which is styling.
const SAME_LINE_TOLERANCE = 2;
// A gap narrower than this fraction of the font size is inside a word, not between words
const WORD_GAP_RATIO = 0.15;
const PAGE_NUMBERING = /(^|\s)(page|tudalen)\s+\d+(\s+(of|o)\s+\d+)?\.?$/i;

export async function pdfText(data: Uint8Array): Promise<PdfText> {
  // pdf.js takes ownership of the buffer it is given, so it gets a copy
  const loading = getDocument({ data: new Uint8Array(data), disableFontFace: true, useSystemFonts: false, verbosity: 0 });
  const document = await loading.promise;
  try {
    const lines: string[] = [];
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      const fragments = content.items.flatMap((item) =>
        "str" in item && item.str.trim()
          ? [{ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width, size: Math.hypot(item.transform[2], item.transform[3]) }]
          : []
      );
      lines.push(...linesOf(fragments).filter((line) => !PAGE_NUMBERING.test(line)));
      page.cleanup();
    }
    return { pages: document.numPages, lines };
  } finally {
    await loading.destroy();
  }
}

function linesOf(fragments: Fragment[]): string[] {
  const rows: Fragment[][] = [];
  for (const fragment of [...fragments].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.find((candidate) => Math.abs(candidate[0].y - fragment.y) <= SAME_LINE_TOLERANCE);
    if (row) row.push(fragment);
    else rows.push([fragment]);
  }
  return rows.map((row) =>
    row
      .sort((a, b) => a.x - b.x)
      .reduce((line, fragment, index, sorted) => {
        if (index === 0) return fragment.text;
        const previous = sorted[index - 1];
        const gap = fragment.x - (previous.x + previous.width);
        return gap > previous.size * WORD_GAP_RATIO ? `${line} ${fragment.text}` : `${line}${fragment.text}`;
      }, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export interface PdfText {
  pages: number;
  lines: string[];
}

interface Fragment {
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
}
