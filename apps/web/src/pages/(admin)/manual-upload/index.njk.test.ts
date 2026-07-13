import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(admin)/manual-upload/index.njk";

const baseData = (t: typeof en) => ({
  ...t,
  data: { locationName: "" },
  locations: [],
  listTypes: [{ value: "", text: "<Please choose a list type>" }],
  sensitivityOptions: [{ value: "", text: "<Please choose a sensitivity>" }],
  languageOptions: [{ value: "", text: "" }],
  listTypeSensitivityMap: "{}",
  locale: "en",
  hideLanguageToggle: true
});

describe("manual-upload template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Template rendering", () => {
    it("should render the English page heading and warning", () => {
      // Arrange
      const data = baseData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.title);
      expect($(".manual-upload-warning h2").text()).toContain(en.warningTitle);
      expect($(".manual-upload-warning__text").text()).toContain(en.warningMessage);
    });

    it("should render the form with file upload, court field and continue button", () => {
      // Arrange
      const data = baseData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("form[method='post']").attr("enctype")).toBe("multipart/form-data");
      expect($("input#file[name='file']")).toHaveLength(1);
      expect($("label[for='file']").text()).toContain(en.fileUploadLabel);
      expect($("input#court[name='locationId']")).toHaveLength(1);
      expect($("button.govuk-button").text()).toContain(en.continueButton);
    });

    it("should render the list type, sensitivity and language selects", () => {
      // Arrange
      const data = baseData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("select#listType[name='listType']")).toHaveLength(1);
      expect($("select#sensitivity[name='sensitivity']")).toHaveLength(1);
      expect($("select#language[name='language']")).toHaveLength(1);
    });

    it("should render the page help aside", () => {
      // Arrange
      const data = baseData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const aside = $("aside.app-related-items").text();
      expect(aside).toContain(en.pageHelpTitle);
      expect(aside).toContain(en.pageHelpSensitivityPublic);
      expect($("a.back-to-top-link").text()).toContain(en.backToTop);
    });

    it("should populate the court field from data", () => {
      // Arrange
      const data = { ...baseData(en), data: { locationName: "Test Court" } };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("input#court").attr("value")).toBe("Test Court");
    });

    it("should render the Welsh heading, warning and button", () => {
      // Arrange
      const data = baseData(cy);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.title);
      expect($(".manual-upload-warning h2").text()).toContain(cy.warningTitle);
      expect($("button.govuk-button").text()).toContain(cy.continueButton);
    });

    it("should not render an error summary when there are no errors", () => {
      // Arrange
      const data = baseData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });

    it("should render an error summary when errors are present", () => {
      // Arrange
      const data = {
        ...baseData(en),
        errors: [
          { text: en.errorMessages.fileRequired, href: "#file" },
          { text: en.errorMessages.courtRequired, href: "#court" }
        ]
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [en.errorMessages.fileRequired, en.errorMessages.courtRequired]);
      expect($(".govuk-form-group--error label[for='file']")).toHaveLength(1);
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      // Assert
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have same error message keys in English and Welsh", () => {
      // Assert
      expect(Object.keys(en.errorMessages).sort()).toEqual(Object.keys(cy.errorMessages).sort());
    });

    it("should have all required keys", () => {
      // Arrange
      const requiredKeys = [
        "title",
        "pageTitle",
        "warningTitle",
        "warningMessage",
        "fileUploadLabel",
        "courtLabel",
        "listTypeLabel",
        "listTypePlaceholder",
        "hearingStartDateLabel",
        "hearingStartDateHint",
        "sensitivityLabel",
        "languageLabel",
        "displayFromLabel",
        "displayFromHint",
        "displayToLabel",
        "displayToHint",
        "continueButton",
        "errorSummaryTitle",
        "pageHelpTitle",
        "dayLabel",
        "monthLabel",
        "yearLabel",
        "backToTop",
        "errorMessages"
      ];

      // Assert
      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });

    it("should have all required error message keys", () => {
      // Arrange
      const requiredErrorKeys = [
        "fileRequired",
        "fileType",
        "fileSize",
        "courtRequired",
        "courtTooShort",
        "listTypeRequired",
        "hearingStartDateRequired",
        "hearingStartDateInvalid",
        "sensitivityRequired",
        "languageRequired",
        "displayFromRequired",
        "displayFromInvalid",
        "displayToRequired",
        "displayToInvalid",
        "displayToBeforeFrom"
      ];

      // Assert
      requiredErrorKeys.forEach((key) => {
        expect(en.errorMessages).toHaveProperty(key);
        expect(cy.errorMessages).toHaveProperty(key);
      });
    });
  });
});
