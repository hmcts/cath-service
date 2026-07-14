import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockMetadata = {
  artefactId: "abc-123",
  locationId: "42",
  locationName: "Test Court",
  publicationType: "LIST",
  listType: "CIVIL_DAILY_CAUSE_LIST",
  provenance: "MANUAL_UPLOAD",
  language: "ENGLISH",
  sensitivity: "PUBLIC",
  contentDate: "2024-01-01T00:00:00Z",
  displayFrom: "2024-01-02T00:00:00Z",
  displayTo: "2024-01-03T00:00:00Z"
};

const formatDateTime = (value: string) => `formatted:${value}`;

describe("blob-explorer-flat-file template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = { ...en, metadata: mockMetadata, flatFileUrl: "https://example.com/file.pdf", formatDateTime };

      const { $ } = render(env, "(system-admin)/blob-explorer-flat-file/index.njk", data);

      expect($("h1.govuk-heading-xl").text().trim()).toBe(en.flatFileTitle);
    });

    it("should render the metadata heading and re-submit button", () => {
      const data = { ...en, metadata: mockMetadata, flatFileUrl: "https://example.com/file.pdf", formatDateTime };

      const { $ } = render(env, "(system-admin)/blob-explorer-flat-file/index.njk", data);

      expect($("h2.govuk-heading-m").text()).toContain(en.flatFileMetadataHeading);
      expect($("form[method='post'] button").text()).toContain(en.flatFileResubmitButton);
    });

    it("should render the metadata table values", () => {
      const data = { ...en, metadata: mockMetadata, flatFileUrl: "https://example.com/file.pdf", formatDateTime };

      const { $ } = render(env, "(system-admin)/blob-explorer-flat-file/index.njk", data);

      const tableText = $(".govuk-table").text();
      expect(tableText).toContain(en.metadataArtefactId);
      expect(tableText).toContain(mockMetadata.locationName);
      expect(tableText).toContain(mockMetadata.listType);
      expect(tableText).toContain(`formatted:${mockMetadata.contentDate}`);
      expect(tableText).toContain(`formatted:${mockMetadata.displayTo}`);
    });

    it("should render the link to the flat file", () => {
      const flatFileUrl = "https://example.com/file.pdf";
      const data = { ...en, metadata: mockMetadata, flatFileUrl, formatDateTime };

      const { $ } = render(env, "(system-admin)/blob-explorer-flat-file/index.njk", data);

      const link = $(`a[href="${flatFileUrl}"]`);
      expect(link).toHaveLength(1);
      expect(link.text()).toBe(en.flatFileLinkToFile);
    });

    it("should not render an error summary when no error", () => {
      const data = { ...en, metadata: mockMetadata, flatFileUrl: "https://example.com/file.pdf", formatDateTime };

      const { $ } = render(env, "(system-admin)/blob-explorer-flat-file/index.njk", data);

      assertNoErrors($);
    });

    it("should render an error summary and hide the table when error is set", () => {
      const data = { ...en, error: en.flatFileError };

      const { $ } = render(env, "(system-admin)/blob-explorer-flat-file/index.njk", data);

      assertErrorSummary($, [en.flatFileError]);
      expect($(".govuk-table")).toHaveLength(0);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh page heading and metadata", () => {
      const data = { ...cy, metadata: mockMetadata, flatFileUrl: "https://example.com/file.pdf", formatDateTime };

      const { $ } = render(env, "(system-admin)/blob-explorer-flat-file/index.njk", data);

      expect($("h1.govuk-heading-xl").text().trim()).toBe(cy.flatFileTitle);
      expect($("h2.govuk-heading-m").text()).toContain(cy.flatFileMetadataHeading);
      expect($("form[method='post'] button").text()).toContain(cy.flatFileResubmitButton);
    });

    it("should render Welsh error summary", () => {
      const data = { ...cy, error: cy.flatFileError };

      const { $ } = render(env, "(system-admin)/blob-explorer-flat-file/index.njk", data);

      assertErrorSummary($, [cy.flatFileError]);
    });
  });
});
