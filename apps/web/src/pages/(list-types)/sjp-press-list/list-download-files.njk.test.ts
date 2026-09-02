import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sjpPressListCy as cy, sjpPressListEn as en } from "@hmcts/sjp-press-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
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

// Mirrors the shape produced by getAvailableFiles / passed to res.render.
function buildFile(overrides: FileOverrides = {}) {
  return {
    type: "pdf",
    url: `/sjp-press-list/download?artefactId=${ARTEFACT_ID}&type=pdf`,
    sizeLabel: "51.2KB",
    ...overrides
  };
}

function buildExcelFile(overrides: FileOverrides = {}) {
  return buildFile({
    type: "xlsx",
    url: `/sjp-press-list/download?artefactId=${ARTEFACT_ID}&type=xlsx`,
    sizeLabel: "36.8KB",
    ...overrides
  });
}

function renderFiles(files: ReturnType<typeof buildFile>[], locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, {
    en,
    cy,
    t: locale.downloadFiles,
    artefactId: ARTEFACT_ID,
    locale: locale === cy ? "cy" : "en",
    files
  });
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
    it("should have the same download files keys in English and Welsh", () => {
      expect(Object.keys(en.downloadFiles).sort()).toEqual(Object.keys(cy.downloadFiles).sort());
    });
  });

  describe("Header section", () => {
    it("should render the page title as the heading", () => {
      const { $ } = renderFiles([buildFile()]);

      expect($("h1.govuk-heading-l").text()).toContain(en.downloadFiles.pageTitle);
    });

    it("should render the save instructions", () => {
      const { $ } = renderFiles([buildFile()]);

      expect($("p.govuk-body").text()).toContain(en.downloadFiles.saveInstructions);
    });

    it("should render the contact information", () => {
      const { $ } = renderFiles([buildFile()]);

      expect($("p.govuk-body").text()).toContain(en.downloadFiles.contactInfo);
    });
  });

  describe("File links", () => {
    it("should render no download links when the files list is empty", () => {
      const { $ } = renderFiles([]);

      expect($("#main-content a.govuk-link")).toHaveLength(0);
    });

    it("should render a link per file with the correct href", () => {
      const files = [buildFile(), buildExcelFile()];
      const { $ } = renderFiles(files);

      const links = $("#main-content a.govuk-link");
      expect(links).toHaveLength(2);
      expect(links.eq(0).attr("href")).toBe(files[0].url);
      expect(links.eq(1).attr("href")).toBe(files[1].url);
    });

    it("should label a pdf file with the PDF download text and size", () => {
      const { $ } = renderFiles([buildFile({ sizeLabel: "51.2KB" })]);

      const link = $("#main-content a.govuk-link");
      expect(link).toHaveLength(1);
      const text = link.text().replace(/\s+/g, " ").trim();
      expect(text).toContain(en.downloadFiles.downloadPdfLink);
      expect(text).not.toContain(en.downloadFiles.downloadExcelLink);
      expect(text).toContain("51.2KB");
      expect(text).toContain(en.downloadFiles.toDevice);
    });

    it("should label an xlsx file with the Excel download text and size", () => {
      const { $ } = renderFiles([buildExcelFile({ sizeLabel: "36.8KB" })]);

      const link = $("#main-content a.govuk-link");
      expect(link).toHaveLength(1);
      const text = link.text().replace(/\s+/g, " ").trim();
      expect(text).toContain(en.downloadFiles.downloadExcelLink);
      expect(text).not.toContain(en.downloadFiles.downloadPdfLink);
      expect(text).toContain("36.8KB");
      expect(text).toContain(en.downloadFiles.toDevice);
    });
  });

  describe("Welsh rendering", () => {
    it("should render the Welsh heading, instructions and contact info", () => {
      const { $ } = renderFiles([buildFile()], cy);

      expect($("h1.govuk-heading-l").text()).toContain(cy.downloadFiles.pageTitle);
      const bodyText = $("p.govuk-body").text();
      expect(bodyText).toContain(cy.downloadFiles.saveInstructions);
      expect(bodyText).toContain(cy.downloadFiles.contactInfo);
    });

    it("should render Welsh file link text", () => {
      const { $ } = renderFiles([buildFile(), buildExcelFile()], cy);

      const linkText = $("#main-content a.govuk-link").text().replace(/\s+/g, " ").trim();
      expect(linkText).toContain(cy.downloadFiles.downloadPdfLink);
      expect(linkText).toContain(cy.downloadFiles.downloadExcelLink);
      expect(linkText).toContain(cy.downloadFiles.toDevice);
    });
  });
});
