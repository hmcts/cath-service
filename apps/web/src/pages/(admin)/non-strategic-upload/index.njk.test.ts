import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(admin)/non-strategic-upload/index.njk";

const LIST_TYPE_OPTIONS = [
  { value: "", text: "<Please choose a list type>", selected: true },
  { value: "1", text: "Some List Type", selected: false }
];

const SENSITIVITY_OPTIONS = [
  { value: "", text: "<Please choose a sensitivity>", selected: true },
  { value: "PUBLIC", text: "Public", selected: false }
];

const LANGUAGE_OPTIONS = [
  { value: "", text: "", selected: false },
  { value: "ENGLISH", text: "English", selected: true }
];

function buildData(t: typeof en, overrides: Record<string, unknown> = {}) {
  return {
    ...t,
    errors: undefined,
    data: { locationName: "" },
    locations: [],
    listTypes: LIST_TYPE_OPTIONS,
    sensitivityOptions: SENSITIVITY_OPTIONS,
    languageOptions: LANGUAGE_OPTIONS,
    listTypeSensitivityMap: JSON.stringify({ "1": "PUBLIC" }),
    locale: "en",
    ...overrides
  };
}

describe("non-strategic-upload template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading and warning", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.title);
      expect($(".manual-upload-warning__text").text()).toContain(en.warningMessage);
      expect($("h2.govuk-heading-m").text()).toContain(en.warningTitle);
    });

    it("should render the file upload, court input and continue button", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("input#file[type='file']")).toHaveLength(1);
      expect($("label[for='file']").text()).toContain(en.fileUploadLabel);
      expect($("input#court[name='locationId']")).toHaveLength(1);
      expect($("button.govuk-button").text()).toContain(en.continueButton);
    });

    it("should render list type, sensitivity and language selects with options", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("select#listType option")).toHaveLength(LIST_TYPE_OPTIONS.length);
      expect($("select#sensitivity option")).toHaveLength(SENSITIVITY_OPTIONS.length);
      expect($("select#language option")).toHaveLength(LANGUAGE_OPTIONS.length);
      expect($("select#listType").text()).toContain("Some List Type");
    });

    it("should render date inputs for hearing start, display from and display to", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("input#hearingStartDate-day")).toHaveLength(1);
      expect($("input#displayFrom-day")).toHaveLength(1);
      expect($("input#displayTo-day")).toHaveLength(1);
    });

    it("should expose the list type sensitivity map on the form", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("form").attr("data-list-type-sensitivity")).toBe(JSON.stringify({ "1": "PUBLIC" }));
    });

    it("should render the page help sidebar", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const aside = $("aside.app-related-items").text();
      expect(aside).toContain(en.pageHelpTitle);
      expect(aside).toContain(en.pageHelpListsText);
      expect(aside).toContain(en.pageHelpSensitivityPublic);
    });

    it("should populate court value from data.locationName", () => {
      const data = buildData(en, { data: { locationName: "Cardiff Court", locationId: "42" } });

      const { $ } = render(env, TEMPLATE, data);

      expect($("input#court").attr("value")).toBe("Cardiff Court");
      expect($("input#court").attr("data-location-id")).toBe("42");
    });

    it("should not render an error summary when there are no errors", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading and warning", () => {
      const data = buildData(cy, { locale: "cy" });

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.title);
      expect($(".manual-upload-warning__text").text()).toContain(cy.warningMessage);
      expect($("button.govuk-button").text()).toContain(cy.continueButton);
    });
  });

  describe("Error states", () => {
    it("should render an error summary listing the provided errors", () => {
      const errors = [
        { text: en.errorMessages.fileRequired, href: "#file" },
        { text: en.errorMessages.courtRequired, href: "#court" }
      ];
      const data = buildData(en, { errors });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorMessages.fileRequired, en.errorMessages.courtRequired]);
    });

    it("should render the file error message inline against the file field", () => {
      const errors = [{ text: en.errorMessages.fileRequired, href: "#file" }];
      const data = buildData(en, { errors });

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-error-message").text()).toContain(en.errorMessages.fileRequired);
      expect($("input#file").hasClass("govuk-file-upload--error")).toBe(true);
    });
  });
});
