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

describe("non-strategic-upload template accessibility structure", () => {
  let env: nunjucks.Environment;

  const dateErrors = (t: typeof en) => [
    { text: t.errorMessages.hearingStartDateRequired, href: "#hearingStartDate-day" },
    { text: t.errorMessages.displayFromInvalid, href: "#displayFrom-day" },
    { text: t.errorMessages.displayToBeforeFrom, href: "#displayTo-day" }
  ];

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  it("should link every date error summary item to an existing day input", () => {
    const { $ } = render(env, TEMPLATE, { ...buildData(en), errors: dateErrors(en) });

    const hrefs = $(".govuk-error-summary__list a")
      .map((_, el) => $(el).attr("href"))
      .get();

    expect(hrefs).toEqual(["#hearingStartDate-day", "#displayFrom-day", "#displayTo-day"]);
    for (const href of hrefs) {
      expect($(`input${href}`)).toHaveLength(1);
    }
  });

  it("should still render the inline date errors against the -day hrefs", () => {
    const { $ } = render(env, TEMPLATE, { ...buildData(en), errors: dateErrors(en) });

    expect($("#hearingStartDate-error").text()).toContain(en.errorMessages.hearingStartDateRequired);
    expect($("#displayFrom-error").text()).toContain(en.errorMessages.displayFromInvalid);
    expect($("#displayTo-error").text()).toContain(en.errorMessages.displayToBeforeFrom);
    expect($("#hearingStartDate-day").hasClass("govuk-input--error")).toBe(true);
  });

  it("should mark up the sensitivity labels as h4 headings with no bold text", () => {
    const { $ } = render(env, TEMPLATE, buildData(en));

    const subHeadings = $("aside h4")
      .map((_, el) => $(el).text().trim())
      .get();

    expect(subHeadings).toEqual([en.pageHelpSensitivityPublic, en.pageHelpSensitivityPrivate, en.pageHelpSensitivityClassified]);
    expect($("aside strong")).toHaveLength(0);
  });

  it("should not skip heading levels in the page help aside", () => {
    const { $ } = render(env, TEMPLATE, buildData(en));

    const levels = $("aside")
      .find("h2, h3, h4")
      .map((_, el) => Number(el.tagName.substring(1)))
      .get();

    expect(levels[0]).toBe(2);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeLessThanOrEqual(levels[i - 1] + 1);
    }
    expect(levels).toContain(4);
  });

  it("should render the h1 as the first heading in main, before the warning", () => {
    const { $ } = render(env, TEMPLATE, buildData(en));

    const firstHeading = $("main").find("h1, h2, h3, h4").first();

    expect(firstHeading.prop("tagName")).toBe("H1");
    expect(firstHeading.text().trim()).toBe(en.title);
  });

  it("should render a plain file input when no file is kept", () => {
    const { $ } = render(env, TEMPLATE, buildData(en));

    const input = $("input#file[type='file']");
    expect(input.attr("data-pending-file-url")).toBeUndefined();
    expect(input.attr("data-pending-file-name")).toBeUndefined();
    expect(input.attr("aria-describedby")).toBeUndefined();
    expect(input.attr("accept")).toBe(".xlsx");
  });

  it("should mark the file input so the kept file can be put back into it", () => {
    const { $ } = render(env, TEMPLATE, { ...buildData(en), pendingFileName: "hearing-list.xlsx", pendingFileUrl: "/non-strategic-upload/pending-file" });

    const input = $("input#file[type='file']");
    expect(input.attr("data-pending-file-url")).toBe("/non-strategic-upload/pending-file");
    expect(input.attr("data-pending-file-name")).toBe("hearing-list.xlsx");
    expect(input.attr("accept")).toBe(".xlsx");
  });

  it("should not render any separate kept-file text, hint or remove button", () => {
    const { $ } = render(env, TEMPLATE, { ...buildData(en), pendingFileName: "hearing-list.xlsx", pendingFileUrl: "/non-strategic-upload/pending-file" });

    expect($("#file-uploaded")).toHaveLength(0);
    expect($("#file-hint")).toHaveLength(0);
    expect($("#remove-file-form")).toHaveLength(0);
    expect($("input#file").attr("aria-describedby")).toBeUndefined();
    expect($("form[enctype] button")).toHaveLength(1);
  });

  it("should escape the kept file name in the file input attribute", () => {
    const { html } = render(env, TEMPLATE, { ...buildData(en), pendingFileName: '"><b>bad</b>', pendingFileUrl: "/non-strategic-upload/pending-file" });

    expect(html).not.toContain('"><b>bad</b>');
  });

  it("should link the file error message to the file input", () => {
    const { $ } = render(env, TEMPLATE, { ...buildData(en), errors: [{ text: en.errorMessages.fileRequired, href: "#file" }] });

    expect($("#file-error").text()).toContain(en.errorMessages.fileRequired);
    expect($("#file").attr("aria-describedby")).toBe("file-error");
    expect($("#file").closest(".govuk-form-group").hasClass("govuk-form-group--error")).toBe(true);
  });
});
