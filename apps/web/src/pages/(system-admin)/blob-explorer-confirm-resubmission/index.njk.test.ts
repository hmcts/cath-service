import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/blob-explorer-confirm-resubmission/index.njk";

const metadata = {
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

const formatDateTime = (date: string) => date;

describe("blob-explorer-confirm-resubmission template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      // Arrange
      const data = { ...en, metadata, artefactId: "abc-123", formatDateTime, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1.govuk-heading-xl").text().trim()).toBe(en.confirmTitle);
    });

    it("should render the metadata table with values", () => {
      // Arrange
      const data = { ...en, metadata, artefactId: "abc-123", formatDateTime, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const tableText = $(".govuk-table").text();
      expect(tableText).toContain(en.metadataLocationName);
      expect(tableText).toContain(metadata.locationName);
      expect(tableText).toContain(en.metadataListType);
      expect(tableText).toContain(metadata.listType);
      expect(tableText).toContain(metadata.provenance);
      expect(tableText).toContain(metadata.sensitivity);
    });

    it("should render the confirm form and cancel link", () => {
      // Arrange
      const data = { ...en, metadata, artefactId: "abc-123", formatDateTime, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const form = $("form");
      expect(form.attr("method")).toBe("post");

      const submitButton = $("button[type='submit']");
      expect(submitButton.text().trim()).toBe(en.confirmButton);

      const cancelLink = $('a[href="/blob-explorer-locations"]');
      expect(cancelLink.text().trim()).toBe(en.confirmCancelLink);
    });

    it("should not render error summary when no error", () => {
      // Arrange
      const data = { ...en, metadata, artefactId: "abc-123", formatDateTime, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });

    it("should render error summary and no table when error exists", () => {
      // Arrange
      const data = { ...en, error: en.confirmError, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [en.confirmError]);
      expect($(".govuk-table")).toHaveLength(0);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading and confirm button", () => {
      // Arrange
      const data = { ...cy, metadata, artefactId: "abc-123", formatDateTime, locale: "cy" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1.govuk-heading-xl").text().trim()).toBe(cy.confirmTitle);
      expect($("button[type='submit']").text().trim()).toBe(cy.confirmButton);
    });

    it("should render Welsh error summary when error exists", () => {
      // Arrange
      const data = { ...cy, error: cy.confirmError, locale: "cy" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [cy.confirmError]);
    });
  });
});
