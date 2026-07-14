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

type Content = typeof en;

const baseData = (t: Content) => ({
  ...t,
  data: { locationName: "" },
  locations: [],
  listTypes: [{ value: "", text: t.listTypePlaceholder }],
  sensitivityOptions: [{ value: "", text: "<Please choose a sensitivity>" }],
  languageOptions: [{ value: "", text: "" }],
  listTypeSensitivityMap: "{}",
  locale: "en",
  hideLanguageToggle: true
});

const allErrors = (t: Content) => [
  { text: t.errorMessages.fileRequired, href: "#file" },
  { text: t.errorMessages.fileType, href: "#file" },
  { text: t.errorMessages.fileSize, href: "#file" },
  { text: t.errorMessages.courtRequired, href: "#court" },
  { text: t.errorMessages.courtTooShort, href: "#court" },
  { text: t.errorMessages.listTypeRequired, href: "#listType" },
  { text: t.errorMessages.hearingStartDateRequired, href: "#hearingStartDate" },
  { text: t.errorMessages.hearingStartDateInvalid, href: "#hearingStartDate" },
  { text: t.errorMessages.sensitivityRequired, href: "#sensitivity" },
  { text: t.errorMessages.languageRequired, href: "#language" },
  { text: t.errorMessages.displayFromRequired, href: "#displayFrom" },
  { text: t.errorMessages.displayFromInvalid, href: "#displayFrom" },
  { text: t.errorMessages.displayToRequired, href: "#displayTo" },
  { text: t.errorMessages.displayToInvalid, href: "#displayTo" },
  { text: t.errorMessages.displayToBeforeFrom, href: "#displayTo" }
];

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
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.title);
      expect($(".manual-upload-warning h2").text()).toContain(en.warningTitle);
      expect($(".manual-upload-warning__text").text()).toContain(en.warningMessage);
    });

    it("should render the form with file upload, court field and continue button", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("form[method='post']").attr("enctype")).toBe("multipart/form-data");
      expect($("input#file[name='file']")).toHaveLength(1);
      expect($("label[for='file']").text()).toContain(en.fileUploadLabel);
      expect($("input#court[name='locationId']")).toHaveLength(1);
      expect($("button.govuk-button").text()).toContain(en.continueButton);
    });

    it("should render the list type, sensitivity and language selects", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("select#listType[name='listType']")).toHaveLength(1);
      expect($("select#sensitivity[name='sensitivity']")).toHaveLength(1);
      expect($("select#language[name='language']")).toHaveLength(1);
    });

    it("should render the page help aside", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      const aside = $("aside.app-related-items").text();
      expect(aside).toContain(en.pageHelpTitle);
      expect(aside).toContain(en.pageHelpSensitivityPublic);
      expect($("a.back-to-top-link").text()).toContain(en.backToTop);
    });

    it("should populate the court field from data", () => {
      const data = { ...baseData(en), data: { locationName: "Test Court" } };

      const { $ } = render(env, TEMPLATE, data);

      expect($("input#court").attr("value")).toBe("Test Court");
    });

    it("should render the Welsh heading, warning and button", () => {
      const data = baseData(cy);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.title);
      expect($(".manual-upload-warning h2").text()).toContain(cy.warningTitle);
      expect($("button.govuk-button").text()).toContain(cy.continueButton);
    });

    it("should not render an error summary when there are no errors", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render an error summary when errors are present", () => {
      const data = {
        ...baseData(en),
        errors: [
          { text: en.errorMessages.fileRequired, href: "#file" },
          { text: en.errorMessages.courtRequired, href: "#court" }
        ]
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorMessages.fileRequired, en.errorMessages.courtRequired]);
      expect($(".govuk-form-group--error label[for='file']")).toHaveLength(1);
    });

    it("should render the English page title, all field labels, hints and placeholder", () => {
      const { html, $ } = render(env, TEMPLATE, baseData(en));

      expect(html).toContain(en.pageTitle);
      expect($("label[for='court']").text()).toContain(en.courtLabel);
      expect($("label[for='listType']").text()).toContain(en.listTypeLabel);
      expect(html).toContain(en.listTypePlaceholder);
      expect($("label[for='sensitivity']").text()).toContain(en.sensitivityLabel);
      expect($("label[for='language']").text()).toContain(en.languageLabel);
      expect(html).toContain(en.hearingStartDateLabel);
      expect(html).toContain(en.hearingStartDateHint);
      expect(html).toContain(en.displayFromLabel);
      expect(html).toContain(en.displayFromHint);
      expect(html).toContain(en.displayToLabel);
      expect(html).toContain(en.displayToHint);
      expect(html).toContain(en.dayLabel);
      expect(html).toContain(en.monthLabel);
      expect(html).toContain(en.yearLabel);
    });

    it("should render all English page help aside content", () => {
      const { $ } = render(env, TEMPLATE, baseData(en));

      const aside = $("aside.app-related-items").text();
      expect(aside).toContain(en.pageHelpTitle);
      expect(aside).toContain(en.pageHelpLists);
      expect(aside).toContain(en.pageHelpListsText);
      expect(aside).toContain(en.pageHelpSensitivity);
      expect(aside).toContain(en.pageHelpSensitivityText);
      expect(aside).toContain(en.pageHelpSensitivityPublicText);
      expect(aside).toContain(en.pageHelpSensitivityPrivate);
      expect(aside).toContain(en.pageHelpSensitivityPrivateText);
      expect(aside).toContain(en.pageHelpSensitivityClassified);
      expect(aside).toContain(en.pageHelpSensitivityClassifiedText);
      expect(aside).toContain(en.pageHelpDisplayFrom);
      expect(aside).toContain(en.pageHelpDisplayFromText);
      expect(aside).toContain(en.pageHelpDisplayTo);
      expect(aside).toContain(en.pageHelpDisplayToText);
    });

    it("should render every English validation error in the error summary", () => {
      const errors = allErrors(en);
      const data = { ...baseData(en), errors };

      const { html, $ } = render(env, TEMPLATE, data);

      expect(html).toContain(en.errorSummaryTitle);
      assertErrorSummary(
        $,
        errors.map((error) => error.text)
      );
    });

    it("should render the Welsh page title, warning, field labels, hints and placeholder", () => {
      const { html, $ } = render(env, TEMPLATE, baseData(cy));

      const bodyText = $("body").text();
      expect(html).toContain(cy.pageTitle);
      expect($(".manual-upload-warning__text").text()).toContain(cy.warningMessage);
      expect($("a.back-to-top-link").text()).toContain(cy.backToTop);
      expect($("label[for='file']").text()).toContain(cy.fileUploadLabel);
      expect($("label[for='court']").text()).toContain(cy.courtLabel);
      expect($("label[for='listType']").text()).toContain(cy.listTypeLabel);
      expect(bodyText).toContain(cy.listTypePlaceholder);
      expect($("label[for='sensitivity']").text()).toContain(cy.sensitivityLabel);
      expect($("label[for='language']").text()).toContain(cy.languageLabel);
      expect(bodyText).toContain(cy.hearingStartDateLabel);
      expect(bodyText).toContain(cy.hearingStartDateHint);
      expect(bodyText).toContain(cy.displayFromLabel);
      expect(bodyText).toContain(cy.displayFromHint);
      expect(bodyText).toContain(cy.displayToLabel);
      expect(bodyText).toContain(cy.displayToHint);
      expect(bodyText).toContain(cy.dayLabel);
      expect(bodyText).toContain(cy.monthLabel);
      expect(bodyText).toContain(cy.yearLabel);
    });

    it("should render all Welsh page help aside content", () => {
      const { $ } = render(env, TEMPLATE, baseData(cy));

      const aside = $("aside.app-related-items").text();
      expect(aside).toContain(cy.pageHelpTitle);
      expect(aside).toContain(cy.pageHelpLists);
      expect(aside).toContain(cy.pageHelpSensitivity);
      expect(aside).toContain(cy.pageHelpDisplayFrom);
      expect(aside).toContain(cy.pageHelpDisplayTo);
    });

    it("should render every Welsh validation error in the error summary", () => {
      const errors = allErrors(cy);
      const data = { ...baseData(cy), errors };

      const { html, $ } = render(env, TEMPLATE, data);

      expect(html).toContain(cy.errorSummaryTitle);
      assertErrorSummary(
        $,
        errors.map((error) => error.text)
      );
    });
  });

  describe("Content standards", () => {
    it("should have the exact English validation messages", () => {
      expect(en.errorMessages.fileRequired).toBe("Please provide a file");
      expect(en.errorMessages.fileType).toBe("Please upload a valid file format");
      expect(en.errorMessages.fileSize).toBe("File too large, please upload file smaller than 2MB");
      expect(en.errorMessages.courtRequired).toBe("Please enter and select a valid court");
      expect(en.errorMessages.courtTooShort).toBe("Court name must be three characters or more");
      expect(en.errorMessages.listTypeRequired).toBe("Please select a list type");
      expect(en.errorMessages.hearingStartDateRequired).toBe("Please enter a valid hearing start date");
      expect(en.errorMessages.hearingStartDateInvalid).toBe("Please enter a valid hearing start date");
      expect(en.errorMessages.sensitivityRequired).toBe("Please select a sensitivity");
      expect(en.errorMessages.languageRequired).toBe("Select a language");
      expect(en.errorMessages.displayFromRequired).toBe("Please enter a valid display file from date");
      expect(en.errorMessages.displayFromInvalid).toBe("Please enter a valid display file from date");
      expect(en.errorMessages.displayToRequired).toBe("Please enter a valid display file to date");
      expect(en.errorMessages.displayToInvalid).toBe("Please enter a valid display file to date");
      expect(en.errorMessages.displayToBeforeFrom).toBe("Display to date must be after display from date");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have same error message keys in English and Welsh", () => {
      expect(Object.keys(en.errorMessages).sort()).toEqual(Object.keys(cy.errorMessages).sort());
    });

    it("should have all required keys", () => {
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

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });

    it("should have all required error message keys", () => {
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

      requiredErrorKeys.forEach((key) => {
        expect(en.errorMessages).toHaveProperty(key);
        expect(cy.errorMessages).toHaveProperty(key);
      });
    });
  });
});
