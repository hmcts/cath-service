import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sjpPublicListCy as cy, sjpPublicListEn as en } from "@hmcts/sjp-public-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "list-download-files.njk";

const ARTEFACT_ID = "12345678-1234-1234-1234-123456789abc";

interface FileOverrides {
  type?: string;
  url?: string;
  sizeLabel?: string;
}

// A single download file entry as produced by getAvailableFiles — tests only
// vary the leaf field they care about.
function buildFile(overrides: FileOverrides = {}) {
  return {
    type: "pdf",
    url: `/sjp-public-list/download?artefactId=${ARTEFACT_ID}&type=pdf`,
    sizeLabel: "51.2KB",
    ...overrides
  };
}

function baseData(locale: typeof en | typeof cy = en, files: ReturnType<typeof buildFile>[] = [buildFile()]) {
  const content = locale === cy ? cy : en;
  return {
    t: content.downloadFiles,
    en,
    cy,
    artefactId: ARTEFACT_ID,
    locale: locale === cy ? "cy" : "en",
    files,
    cspNonce: "test-nonce"
  };
}

function renderFiles(files: ReturnType<typeof buildFile>[] = [buildFile()], locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, baseData(locale, files));
}

// The chrome (cookie banner, phase banner) also emits `a.govuk-link`, so scope
// download-link assertions to anchors pointing at the download route.
function downloadLinks($: CheerioAPI) {
  return $('a.govuk-link[href^="/sjp-public-list/download"]');
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("list-download-files template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same download-files keys in English and Welsh", () => {
      expect(Object.keys(en.downloadFiles).sort()).toEqual(Object.keys(cy.downloadFiles).sort());
    });
  });

  describe("Page header", () => {
    it("should render the page title in the heading", () => {
      const { $ } = renderFiles();

      expect($("h1.govuk-heading-l").text().trim()).toBe(en.downloadFiles.pageTitle);
    });

    it("should render the save instructions", () => {
      const { $ } = renderFiles();

      expect($("p.govuk-body").text()).toContain(en.downloadFiles.saveInstructions);
    });

    it("should render the contact information", () => {
      const { $ } = renderFiles();

      expect($("p.govuk-body").text()).toContain(en.downloadFiles.contactInfo);
    });
  });

  describe("File download links", () => {
    it("should render a link per available file", () => {
      const { $ } = renderFiles([
        buildFile({ type: "pdf" }),
        buildFile({ type: "xlsx", url: `/sjp-public-list/download?artefactId=${ARTEFACT_ID}&type=xlsx`, sizeLabel: "36.8KB" })
      ]);

      expect(downloadLinks($)).toHaveLength(2);
    });

    it("should render the PDF link text, href and size for a pdf file", () => {
      const { $ } = renderFiles([buildFile({ type: "pdf", sizeLabel: "51.2KB" })]);

      const link = downloadLinks($);
      expect(link).toHaveLength(1);
      expect(link.attr("href")).toBe(`/sjp-public-list/download?artefactId=${ARTEFACT_ID}&type=pdf`);
      const text = link.text().replace(/\s+/g, " ").trim();
      expect(text).toContain(en.downloadFiles.downloadPdfLink);
      expect(text).toContain("51.2KB");
      expect(text).toContain(en.downloadFiles.toDevice);
    });

    it("should render the Excel link text and href for a non-pdf file", () => {
      const excelUrl = `/sjp-public-list/download?artefactId=${ARTEFACT_ID}&type=xlsx`;
      const { $ } = renderFiles([buildFile({ type: "xlsx", url: excelUrl, sizeLabel: "36.8KB" })]);

      const link = downloadLinks($);
      expect(link).toHaveLength(1);
      expect(link.attr("href")).toBe(excelUrl);
      const text = link.text().replace(/\s+/g, " ").trim();
      expect(text).toContain(en.downloadFiles.downloadExcelLink);
      expect(text).not.toContain(en.downloadFiles.downloadPdfLink);
      expect(text).toContain("36.8KB");
    });

    it("should map each file to its own link with the correct href", () => {
      const pdfUrl = `/sjp-public-list/download?artefactId=${ARTEFACT_ID}&type=pdf`;
      const excelUrl = `/sjp-public-list/download?artefactId=${ARTEFACT_ID}&type=xlsx`;
      const { $ } = renderFiles([buildFile({ type: "pdf", url: pdfUrl }), buildFile({ type: "xlsx", url: excelUrl, sizeLabel: "2.0MB" })]);

      const hrefs = downloadLinks($)
        .map((_, el) => $(el).attr("href"))
        .get();
      expect(hrefs).toEqual([pdfUrl, excelUrl]);
    });

    it("should render no download links when the file list is empty", () => {
      const { $ } = renderFiles([]);

      expect(downloadLinks($)).toHaveLength(0);
      expect($("h1.govuk-heading-l").text().trim()).toBe(en.downloadFiles.pageTitle);
    });
  });

  describe("Welsh rendering", () => {
    it("should render the Welsh page title, instructions and contact info", () => {
      const { $ } = renderFiles([buildFile()], cy);

      expect($("h1.govuk-heading-l").text().trim()).toBe(cy.downloadFiles.pageTitle);
      const bodyText = $("p.govuk-body").text();
      expect(bodyText).toContain(cy.downloadFiles.saveInstructions);
      expect(bodyText).toContain(cy.downloadFiles.contactInfo);
    });

    it("should render the Welsh download link labels", () => {
      const { $ } = renderFiles(
        [buildFile({ type: "pdf" }), buildFile({ type: "xlsx", url: `/sjp-public-list/download?artefactId=${ARTEFACT_ID}&type=xlsx` })],
        cy
      );

      const linksText = downloadLinks($).text().replace(/\s+/g, " ");
      expect(linksText).toContain(cy.downloadFiles.downloadPdfLink);
      expect(linksText).toContain(cy.downloadFiles.downloadExcelLink);
      expect(linksText).toContain(cy.downloadFiles.toDevice);
    });
  });
});
