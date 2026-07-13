import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "../../cy.js";
import { en } from "../../en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(public)/hearing-lists/[locationId]/[artefactId]/index.njk";

describe("hearing-lists [locationId] [artefactId] template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("error state", () => {
    it("should render the error title, message and back link with English content", () => {
      // Arrange
      const data = {
        en,
        cy,
        locale: "en",
        isError: true,
        error: en.errorNotFound,
        title: en.errorTitle,
        backMessage: en.backMessage,
        backButton: en.backButton,
        locationId: "9"
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1.govuk-heading-l").text().trim()).toBe(en.errorTitle);
      expect($("p.govuk-body").eq(0).text()).toContain(en.errorNotFound);
      expect($("p.govuk-body").eq(1).text()).toContain(en.backMessage);

      const backLink = $('a[href="/summary-of-publications?locationId=9"]');
      expect(backLink).toHaveLength(1);
      expect(backLink.text().trim()).toBe(en.backButton);
    });

    it("should render the error summary with the error message", () => {
      // Arrange
      const data = {
        en,
        cy,
        locale: "en",
        isError: true,
        error: en.errorInvalidRequest,
        title: en.errorTitle,
        backMessage: en.backMessage,
        backButton: en.backButton,
        locationId: "9"
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [en.errorInvalidRequest]);
    });

    it("should render Welsh error content", () => {
      // Arrange
      const data = {
        en,
        cy,
        locale: "cy",
        isError: true,
        error: cy.errorNotFound,
        title: cy.errorTitle,
        backMessage: cy.backMessage,
        backButton: cy.backButton,
        locationId: "42"
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1.govuk-heading-l").text().trim()).toBe(cy.errorTitle);
      expect($('a[href="/summary-of-publications?locationId=42"]').text().trim()).toBe(cy.backButton);
      assertErrorSummary($, [cy.errorNotFound]);
    });
  });

  describe("PDF viewer state", () => {
    it("should render the PDF object with the download URL and no error summary", () => {
      // Arrange
      const data = {
        en,
        cy,
        locale: "en",
        isError: false,
        pageTitle: "Crown Daily List - Test Court",
        courtName: "Test Court",
        listTypeName: "Crown Daily List",
        contentDate: new Date("2025-01-15"),
        downloadUrl: "/api/flat-file/test-artefact-id/download",
        artefactId: "test-artefact-id",
        contentType: "application/pdf",
        pdfNotSupportedMessage: en.pdfNotSupportedMessage,
        downloadLinkText: en.downloadLinkText
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const object = $("object");
      expect(object.attr("data")).toBe("/api/flat-file/test-artefact-id/download");
      expect(object.attr("type")).toBe("application/pdf");

      const downloadLink = $('a[href="/api/flat-file/test-artefact-id/download"]');
      expect(downloadLink.text().trim()).toBe(en.downloadLinkText);
      expect(downloadLink.attr("download")).toBeDefined();

      expect($("title").text()).toBe("Crown Daily List - Test Court");
      assertNoErrors($);
    });

    it("should render the Welsh fallback message and download link text", () => {
      // Arrange
      const data = {
        en,
        cy,
        locale: "cy",
        isError: false,
        pageTitle: "Rhestr Ddyddiol y Goron - Llys Prawf",
        courtName: "Llys Prawf",
        listTypeName: "Rhestr Ddyddiol y Goron",
        contentDate: new Date("2025-01-15"),
        downloadUrl: "/api/flat-file/test-artefact-id/download",
        artefactId: "test-artefact-id",
        contentType: "application/pdf",
        pdfNotSupportedMessage: cy.pdfNotSupportedMessage,
        downloadLinkText: cy.downloadLinkText
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("object p").text()).toContain(cy.pdfNotSupportedMessage);
      expect($('a[href="/api/flat-file/test-artefact-id/download"]').text().trim()).toBe(cy.downloadLinkText);
      expect($("html").attr("lang")).toBe("cy");
    });
  });
});
