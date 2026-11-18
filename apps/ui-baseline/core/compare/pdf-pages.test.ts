import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { pdfPagePngs } from "./pdf-pages.js";

const TEST_FILES = path.join(path.dirname(fileURLToPath(import.meta.url)), "test-files");
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("pdfPagePngs", () => {
  it("should draw each page of a PDF as a PNG", async () => {
    // Arrange
    const data = await readFile(path.join(TEST_FILES, "plain.pdf"));

    // Act
    const result = await pdfPagePngs(data, 10);

    // Assert
    expect(result.images).toHaveLength(result.pages);
    for (const image of result.images) expect(image.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
  });

  it("should draw no more pages than it is asked for, and still say how many there are", async () => {
    // Arrange
    const data = await readFile(path.join(TEST_FILES, "plain.pdf"));

    // Act
    const result = await pdfPagePngs(data, 0);

    // Assert
    expect(result.images).toHaveLength(0);
    expect(result.pages).toBeGreaterThan(0);
  });

  it("should reject what is not a PDF", async () => {
    // Act and assert
    await expect(pdfPagePngs(Buffer.from("not a pdf"), 10)).rejects.toThrow();
  });
});
