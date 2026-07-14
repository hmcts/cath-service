import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("reference-data-upload template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render page heading and title", () => {
      const data = {
        pageTitle: en.pageTitle,
        warningText: en.warningText,
        downloadLinkText: en.downloadLinkText,
        addJurisdictionLinkText: en.addJurisdictionLinkText,
        addSubJurisdictionLinkText: en.addSubJurisdictionLinkText,
        addRegionLinkText: en.addRegionLinkText,
        fileUploadLabel: en.fileUploadLabel,
        continueButtonText: en.continueButtonText,
        errorSummaryTitle: en.errorSummaryTitle
      };

      const { $ } = render(env, "(system-admin)/reference-data-upload/index.njk", data);

      expect($("h1.govuk-heading-xl").text().trim()).toBe(en.pageTitle);
      expect($(".govuk-warning-text__text").text()).toContain(en.warningText);
    });

    it("should render download link", () => {
      const data = {
        pageTitle: en.pageTitle,
        warningText: en.warningText,
        downloadLinkText: en.downloadLinkText,
        addJurisdictionLinkText: en.addJurisdictionLinkText,
        addSubJurisdictionLinkText: en.addSubJurisdictionLinkText,
        addRegionLinkText: en.addRegionLinkText,
        fileUploadLabel: en.fileUploadLabel,
        continueButtonText: en.continueButtonText
      };

      const { $ } = render(env, "(system-admin)/reference-data-upload/index.njk", data);

      const downloadLink = $('a[href="/reference-data-download"]');
      expect(downloadLink).toHaveLength(1);
      expect(downloadLink.text()).toBe(en.downloadLinkText);
    });

    it("should render action buttons with correct links", () => {
      const data = {
        pageTitle: en.pageTitle,
        warningText: en.warningText,
        downloadLinkText: en.downloadLinkText,
        addJurisdictionLinkText: en.addJurisdictionLinkText,
        addSubJurisdictionLinkText: en.addSubJurisdictionLinkText,
        addRegionLinkText: en.addRegionLinkText,
        fileUploadLabel: en.fileUploadLabel,
        continueButtonText: en.continueButtonText
      };

      const { $ } = render(env, "(system-admin)/reference-data-upload/index.njk", data);

      const jurisdictionBtn = $('a[href="/add-jurisdiction"]');
      expect(jurisdictionBtn.text().trim()).toBe(en.addJurisdictionLinkText);
      expect(jurisdictionBtn.hasClass("govuk-button--secondary")).toBe(true);

      const subJurisdictionBtn = $('a[href="/add-sub-jurisdiction"]');
      expect(subJurisdictionBtn.text().trim()).toBe(en.addSubJurisdictionLinkText);

      const regionBtn = $('a[href="/add-region"]');
      expect(regionBtn.text().trim()).toBe(en.addRegionLinkText);
    });

    it("should render file upload form with correct attributes", () => {
      const data = {
        pageTitle: en.pageTitle,
        warningText: en.warningText,
        downloadLinkText: en.downloadLinkText,
        addJurisdictionLinkText: en.addJurisdictionLinkText,
        addSubJurisdictionLinkText: en.addSubJurisdictionLinkText,
        addRegionLinkText: en.addRegionLinkText,
        fileUploadLabel: en.fileUploadLabel,
        continueButtonText: en.continueButtonText
      };

      const { $ } = render(env, "(system-admin)/reference-data-upload/index.njk", data);

      const form = $("form");
      expect(form.attr("method")).toBe("post");
      expect(form.attr("enctype")).toBe("multipart/form-data");
      expect(form.attr("novalidate")).toBeDefined();

      const fileInput = $("#file");
      expect(fileInput).toHaveLength(1);
      expect(fileInput.attr("name")).toBe("file");

      const submitButton = $("button[type='submit']");
      expect(submitButton.text().trim()).toBe(en.continueButtonText);
    });

    it("should not render error summary when no errors", () => {
      const data = {
        pageTitle: en.pageTitle,
        warningText: en.warningText,
        downloadLinkText: en.downloadLinkText,
        addJurisdictionLinkText: en.addJurisdictionLinkText,
        addSubJurisdictionLinkText: en.addSubJurisdictionLinkText,
        addRegionLinkText: en.addRegionLinkText,
        fileUploadLabel: en.fileUploadLabel,
        continueButtonText: en.continueButtonText,
        errors: null
      };

      const { $ } = render(env, "(system-admin)/reference-data-upload/index.njk", data);

      assertNoErrors($);
    });

    it("should render error summary when errors exist", () => {
      const data = {
        pageTitle: en.pageTitle,
        warningText: en.warningText,
        downloadLinkText: en.downloadLinkText,
        addJurisdictionLinkText: en.addJurisdictionLinkText,
        addSubJurisdictionLinkText: en.addSubJurisdictionLinkText,
        addRegionLinkText: en.addRegionLinkText,
        fileUploadLabel: en.fileUploadLabel,
        continueButtonText: en.continueButtonText,
        errorSummaryTitle: en.errorSummaryTitle,
        errors: [{ text: en.errorMessages.fileRequired, href: "#file" }]
      };

      const { $ } = render(env, "(system-admin)/reference-data-upload/index.njk", data);

      assertErrorSummary($, [en.errorMessages.fileRequired]);
    });

    it("should render file upload error message when error exists", () => {
      const errors = [{ text: en.errorMessages.fileType, href: "#file" }];
      const data = {
        pageTitle: en.pageTitle,
        warningText: en.warningText,
        downloadLinkText: en.downloadLinkText,
        addJurisdictionLinkText: en.addJurisdictionLinkText,
        addSubJurisdictionLinkText: en.addSubJurisdictionLinkText,
        addRegionLinkText: en.addRegionLinkText,
        fileUploadLabel: en.fileUploadLabel,
        continueButtonText: en.continueButtonText,
        errorSummaryTitle: en.errorSummaryTitle,
        errors
      };

      const { $ } = render(env, "(system-admin)/reference-data-upload/index.njk", data);

      const formGroup = $("#file").closest(".govuk-form-group");
      expect(formGroup.hasClass("govuk-form-group--error")).toBe(true);

      const errorMessage = $("#file-error");
      expect(errorMessage.text()).toContain(en.errorMessages.fileType);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh page heading and title", () => {
      const data = {
        pageTitle: cy.pageTitle,
        warningText: cy.warningText,
        downloadLinkText: cy.downloadLinkText,
        addJurisdictionLinkText: cy.addJurisdictionLinkText,
        addSubJurisdictionLinkText: cy.addSubJurisdictionLinkText,
        addRegionLinkText: cy.addRegionLinkText,
        fileUploadLabel: cy.fileUploadLabel,
        continueButtonText: cy.continueButtonText
      };

      const { $ } = render(env, "(system-admin)/reference-data-upload/index.njk", data);

      expect($("h1.govuk-heading-xl").text().trim()).toBe(cy.pageTitle);
      expect($(".govuk-warning-text__text").text()).toContain(cy.warningText);
    });

    it("should render Welsh button text", () => {
      const data = {
        pageTitle: cy.pageTitle,
        warningText: cy.warningText,
        downloadLinkText: cy.downloadLinkText,
        addJurisdictionLinkText: cy.addJurisdictionLinkText,
        addSubJurisdictionLinkText: cy.addSubJurisdictionLinkText,
        addRegionLinkText: cy.addRegionLinkText,
        fileUploadLabel: cy.fileUploadLabel,
        continueButtonText: cy.continueButtonText
      };

      const { $ } = render(env, "(system-admin)/reference-data-upload/index.njk", data);

      const submitButton = $("button[type='submit']");
      expect(submitButton.text().trim()).toBe(cy.continueButtonText);

      const jurisdictionBtn = $('a[href="/add-jurisdiction"]');
      expect(jurisdictionBtn.text().trim()).toBe(cy.addJurisdictionLinkText);
    });

    it("should render Welsh error messages", () => {
      const data = {
        pageTitle: cy.pageTitle,
        warningText: cy.warningText,
        downloadLinkText: cy.downloadLinkText,
        addJurisdictionLinkText: cy.addJurisdictionLinkText,
        addSubJurisdictionLinkText: cy.addSubJurisdictionLinkText,
        addRegionLinkText: cy.addRegionLinkText,
        fileUploadLabel: cy.fileUploadLabel,
        continueButtonText: cy.continueButtonText,
        errorSummaryTitle: cy.errorSummaryTitle,
        errors: [{ text: cy.errorMessages.fileRequired, href: "#file" }]
      };

      const { $ } = render(env, "(system-admin)/reference-data-upload/index.njk", data);

      assertErrorSummary($, [cy.errorMessages.fileRequired]);
    });
  });
});
