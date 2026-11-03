import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Browser } from "playwright";
import { describe, expect, it, vi } from "vitest";
import { launchChromium } from "../../capture/browser.js";

vi.mock("../../capture/browser.js", () => ({ launchChromium: vi.fn() }));

const DIR = path.dirname(fileURLToPath(import.meta.url));

describe("make-pdfs", () => {
  it("should render the four test PDFs from one page and close the browser when run", async () => {
    // Arrange
    const page = { setContent: vi.fn().mockResolvedValue(undefined), pdf: vi.fn().mockResolvedValue(Buffer.from("")) };
    const browser = { newPage: vi.fn().mockResolvedValue(page), close: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(launchChromium).mockResolvedValue(browser as unknown as Browser);

    // Act
    await import("./make-pdfs.js");

    // Assert
    expect(page.pdf.mock.calls.map(([options]) => path.relative(DIR, options.path))).toEqual(["plain.pdf", "styled.pdf", "wrapped.pdf", "changed.pdf"]);
    expect(page.pdf.mock.calls[1][0]).toMatchObject({ format: "A4", landscape: true });
    expect(page.pdf.mock.calls[2][0]).toMatchObject({ displayHeaderFooter: true, footerTemplate: expect.stringContaining("pageNumber") });
    expect(page.setContent.mock.calls[2][0]).toContain("non-<br>devolved");
    expect(page.setContent.mock.calls[3][0]).toContain("<td>Court 9</td>");
    expect(page.setContent.mock.calls[0][0]).not.toContain("Court 9");
    expect(browser.close).toHaveBeenCalledTimes(1);
  });
});
