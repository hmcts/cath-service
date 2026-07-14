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

      expect($("h1").text()).toContain(en.jsonFileTitle);
      expect($("h2").text()).toContain(en.jsonFileMetadataHeading);
      expect($("button").text()).toContain(en.jsonFileResubmitButton);

      const tableText = $(".govuk-table").text();
      expect(tableText).toContain(en.metadataArtefactId);
      expect(tableText).toContain(mockMetadata.artefactId);
      expect(tableText).toContain(en.metadataLocationName);
      expect(tableText).toContain(mockMetadata.locationName);
      expect(tableText).toContain(`formatted:${mockMetadata.contentDate}`);

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
      expect($(".govuk-table")).toHaveLength(0);
      expect($("button")).toHaveLength(0);
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

      expect($("h1").text()).toContain(cy.jsonFileTitle);
      expect($("h2").text()).toContain(cy.jsonFileMetadataHeading);
      expect($(".govuk-table").text()).toContain(cy.metadataArtefactId);
      assertNoErrors($);
    });
  });
});
