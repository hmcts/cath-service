import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/blob-explorer-json-file/index.njk";

const formatDateTime = (value: string) => `formatted:${value}`;

const mockMetadata = {
  artefactId: "abc-123",
  locationId: "42",
  locationName: "Test Court",
  publicationType: "LIST",
  listType: "Civil Daily Cause List",
  provenance: "MANUAL_UPLOAD",
  language: "ENGLISH",
  sensitivity: "PUBLIC",
  contentDate: "2024-01-01T00:00:00Z",
  displayFrom: "2024-01-02T00:00:00Z",
  displayTo: "2024-01-03T00:00:00Z"
};

const PDF_URL = "/blob-explorer-json-file/download?artefactId=abc-123&type=pdf";
const EXCEL_URL = "/blob-explorer-json-file/download?artefactId=abc-123&type=xlsx";

function buildPageData(locale: typeof en | typeof cy = en, overrides: Record<string, unknown> = {}) {
  return {
    ...locale,
    metadata: mockMetadata,
    jsonContent: null,
    renderedTemplateUrl: null,
    pdfDownloadUrl: null,
    pdfFileSize: null,
    excelDownloadUrl: null,
    excelFileSize: null,
    formatDateTime,
    locale: locale === cy ? "cy" : "en",
    ...overrides
  };
}

describe("blob-explorer-json-file template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the heading, metadata table, resubmit button and template link", () => {
      const data = {
        ...en,
        metadata: mockMetadata,
        jsonContent: "{\n  &quot;case&quot;: &quot;1&quot;\n}",
        renderedTemplateUrl: "https://example.com/rendered.html",
        formatDateTime,
        locale: "en"
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.header);
      expect($("h2").text()).toContain(en.jsonFileMetadataHeading);
      expect($("button").text()).toContain(en.jsonFileResubmitButton);

      const summaryListText = $(".govuk-summary-list").text();
      expect(summaryListText).toContain(en.metadataArtefactId);
      expect(summaryListText).toContain(mockMetadata.artefactId);
      expect(summaryListText).toContain(en.metadataLocationName);
      expect(summaryListText).toContain(mockMetadata.locationName);
      expect(summaryListText).toContain(`formatted:${mockMetadata.contentDate}`);

      expect($('a[href="https://example.com/rendered.html"]').text()).toContain(en.jsonFileLinkToTemplate);
      expect($(".govuk-details__summary-text").text()).toContain(en.jsonFileAccordionTitle);

      assertNoErrors($);
    });

    it("should omit the template link and JSON details when they are not provided", () => {
      const data = {
        ...en,
        metadata: mockMetadata,
        jsonContent: null,
        renderedTemplateUrl: null,
        formatDateTime,
        locale: "en"
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($(`a:contains("${en.jsonFileLinkToTemplate}")`)).toHaveLength(0);
      expect($(".govuk-details")).toHaveLength(0);
      assertNoErrors($);
    });

    it("should render an error summary and hide the metadata when an error is present", () => {
      const data = { ...en, error: en.jsonFileError, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.jsonFileError]);
      expect($(".govuk-summary-list")).toHaveLength(0);
      expect($("button")).toHaveLength(0);
    });
  });

  describe("Generated files", () => {
    it("should render the heading and both download links with their sizes when both files exist", () => {
      const { $ } = render(
        env,
        TEMPLATE,
        buildPageData(en, { pdfDownloadUrl: PDF_URL, pdfFileSize: "120.45KB", excelDownloadUrl: EXCEL_URL, excelFileSize: "1.50MB" })
      );

      expect($("h2").filter((_, el) => $(el).text().trim() === en.jsonFileGeneratedFilesHeading)).toHaveLength(1);
      expect($("#generated-files li")).toHaveLength(2);
      expect($(`#generated-file-pdf a[href="${PDF_URL}"]`).text().trim()).toBe("Download PDF (120.45KB)");
      expect($(`#generated-file-excel a[href="${EXCEL_URL}"]`).text().trim()).toBe("Download Excel (1.50MB)");
      expect($("#generated-files").text()).not.toContain(en.jsonFileNoPdf);
      expect($("#generated-files").text()).not.toContain(en.jsonFileNoExcel);
    });

    it("should show the not available text instead of links when neither file exists", () => {
      const { $ } = render(env, TEMPLATE, buildPageData(en));

      expect($("#generated-files a")).toHaveLength(0);
      expect($("#generated-file-pdf").text().trim()).toBe(en.jsonFileNoPdf);
      expect($("#generated-file-excel").text().trim()).toBe(en.jsonFileNoExcel);
    });

    it("should show the PDF link and the no Excel text when only the PDF exists", () => {
      const { $ } = render(env, TEMPLATE, buildPageData(en, { pdfDownloadUrl: PDF_URL, pdfFileSize: "2.00KB" }));

      expect($("#generated-file-pdf a")).toHaveLength(1);
      expect($("#generated-file-excel a")).toHaveLength(0);
      expect($("#generated-file-excel").text().trim()).toBe(en.jsonFileNoExcel);
    });

    it("should show the Excel link and the no PDF text when only the Excel file exists", () => {
      const { $ } = render(env, TEMPLATE, buildPageData(en, { excelDownloadUrl: EXCEL_URL, excelFileSize: "2.00KB" }));

      expect($("#generated-file-pdf a")).toHaveLength(0);
      expect($("#generated-file-pdf").text().trim()).toBe(en.jsonFileNoPdf);
      expect($("#generated-file-excel a").text().trim()).toBe("Download Excel (2.00KB)");
    });

    it("should not render the generated files section when the page has an error", () => {
      const { $ } = render(env, TEMPLATE, { ...en, error: en.jsonFileError, locale: "en" });

      expect($("#generated-files")).toHaveLength(0);
      expect($("h2").filter((_, el) => $(el).text().trim() === en.jsonFileGeneratedFilesHeading)).toHaveLength(0);
    });

    it("should render the Welsh download link text with the cy locale", () => {
      const { $ } = render(
        env,
        TEMPLATE,
        buildPageData(cy, { pdfDownloadUrl: `${PDF_URL}&lng=cy`, pdfFileSize: "120.45KB", excelDownloadUrl: `${EXCEL_URL}&lng=cy`, excelFileSize: "1.50MB" })
      );

      expect($("#generated-file-pdf a").text().trim()).toBe("Llwytho’r PDF (120.45KB) i lawr");
      expect($("#generated-file-excel a").text().trim()).toBe("Llwytho’r daenlen Excel (1.50MB) i lawr");
      expect($("#generated-file-pdf a").attr("href")).toBe(`${PDF_URL}&lng=cy`);
    });

    it("should keep the heading and not available text in English for the cy locale", () => {
      const { $ } = render(env, TEMPLATE, buildPageData(cy));

      expect($("h2").filter((_, el) => $(el).text().trim() === cy.jsonFileGeneratedFilesHeading)).toHaveLength(1);
      expect($("#generated-file-pdf").text().trim()).toBe(cy.jsonFileNoPdf);
      expect($("#generated-file-excel").text().trim()).toBe(cy.jsonFileNoExcel);
    });
  });

  describe("locale files", () => {
    it("should have the same keys in en and cy", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh headings and metadata labels", () => {
      const data = {
        ...cy,
        metadata: mockMetadata,
        jsonContent: null,
        renderedTemplateUrl: null,
        formatDateTime,
        locale: "cy"
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.header);
      expect($("h2").text()).toContain(cy.jsonFileMetadataHeading);
      expect($(".govuk-summary-list").text()).toContain(cy.metadataArtefactId);
      assertNoErrors($);
    });
  });
});
