import { beforeEach, describe, expect, it, vi } from "vitest";
import { comparePdf } from "./file-compare.js";
import { pdfText } from "./pdf-text.js";

// The committed test PDFs only differ by one word, so the other ways text can differ are tested
// with the text pdfText reads given directly
vi.mock("./pdf-text.js", () => ({ pdfText: vi.fn() }));

function pdfsRead(source: string[], target: string[]) {
  vi.mocked(pdfText)
    .mockResolvedValueOnce({ lines: source, pages: 1 } as never)
    .mockResolvedValueOnce({ lines: target, pages: 2 } as never);
}

describe("comparePdf text findings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should report missing and extra words with up to four words of the unchanged text before them", async () => {
    // Arrange
    pdfsRead(["Civil Daily Cause List", "for Oxford Combined Court"], ["Draft Civil Daily Cause List", "for Oxford Court Centre"]);

    // Act
    const result = await comparePdf(new Uint8Array(), new Uint8Array());

    // Assert
    expect(result.findings).toEqual([
      { category: "pdf", change: "extra", detail: 'at the start: "Draft"' },
      { category: "pdf", change: "missing", detail: 'after "Cause List for Oxford": "Combined"' },
      { category: "pdf", change: "extra", detail: 'after "Court": "Centre"' }
    ]);
    expect(result.pages).toEqual({ source: 1, target: 2 });
  });

  it("should join a word broken across lines at a hyphen when comparing", async () => {
    // Arrange
    pdfsRead(["some non-", "devolved tribunals", "", "end"], ["some non-devolved", "tribunals end"]);

    // Act
    const result = await comparePdf(new Uint8Array(), new Uint8Array());

    // Assert
    expect(result.findings).toEqual([]);
  });

  it("should count the words in common when the text differs too much to diff", async () => {
    // Arrange
    const words = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix}${i}`).join(" ");
    pdfsRead([`${words("a", 1001)} shared shared`], [`${words("b", 1001)} shared`]);

    // Act
    const result = await comparePdf(new Uint8Array(), new Uint8Array());

    // Assert
    expect(result.findings).toEqual([{ category: "pdf", change: "rewritten", detail: "the text differs throughout: 1 of 1003 words in common" }]);
  });
});
