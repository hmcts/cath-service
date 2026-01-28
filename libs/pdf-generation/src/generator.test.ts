import { describe, expect, it } from "vitest";

// Note: Full integration tests for PDF generation require actual Puppeteer execution.
// These tests verify the module exports and basic structure.
// Integration tests in e2e-tests/ will verify actual PDF generation.

describe("pdf-generation module", () => {
  it("should export generatePdfFromHtml function", async () => {
    const module = await import("./generator.js");
    expect(typeof module.generatePdfFromHtml).toBe("function");
  });

  it("should have correct function signature", async () => {
    const { generatePdfFromHtml } = await import("./generator.js");
    // Function should accept a string parameter
    expect(generatePdfFromHtml.length).toBe(1);
  });
});

// PDF generation integration tests are skipped in unit tests
// They run in e2e-tests/ with actual browser
describe.skip("generatePdfFromHtml integration", () => {
  it("should generate PDF from simple HTML", async () => {
    const { generatePdfFromHtml } = await import("./generator.js");
    const result = await generatePdfFromHtml("<html><body><h1>Test</h1></body></html>");
    expect(result.success).toBe(true);
    expect(result.pdfBuffer).toBeInstanceOf(Buffer);
  });
});
