import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/location-metadata-manage/index.njk";
const LOCATION_NAME = "Central London County Court";
const WELSH_LOCATION_NAME = "Llys Sirol Canol Llundain";

const baseData = (content: typeof en | typeof cy, overrides: Record<string, unknown> = {}) => ({
  ...content,
  locationName: LOCATION_NAME,
  cautionMessage: "",
  welshCautionMessage: "",
  noListMessage: "",
  welshNoListMessage: "",
  hasExistingMetadata: false,
  errors: undefined,
  fieldErrors: {},
  ...overrides
});

const FIELDS = [
  { id: "cautionMessage", requiredKey: "cautionMessageRequired" },
  { id: "welshCautionMessage", requiredKey: "welshCautionMessageRequired" },
  { id: "noListMessage", requiredKey: "noListMessageRequired" },
  { id: "welshNoListMessage", requiredKey: "welshNoListMessageRequired" }
] as const;

const emptyFormErrors = (content: typeof en | typeof cy) => ({
  errors: [
    { text: content.atLeastOneMessageRequired, href: "#cautionMessage" },
    ...FIELDS.map((field) => ({ text: content[field.requiredKey], href: `#${field.id}` }))
  ],
  fieldErrors: Object.fromEntries(FIELDS.map((field) => [field.id, { text: content[field.requiredKey] }]))
});

describe("location-metadata-manage template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the heading with the location name", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-l").text().trim()).toBe(`${en.heading} ${LOCATION_NAME}`);
    });

    it("should render all four message textareas with their labels", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("textarea#cautionMessage")).toHaveLength(1);
      expect($("textarea#welshCautionMessage")).toHaveLength(1);
      expect($("textarea#noListMessage")).toHaveLength(1);
      expect($("textarea#welshNoListMessage")).toHaveLength(1);
      const labels = $("label.govuk-label--m")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(labels).toContain(en.cautionMessageLabel);
      expect(labels).toContain(en.welshCautionMessageLabel);
      expect(labels).toContain(en.noListMessageLabel);
      expect(labels).toContain(en.welshNoListMessageLabel);
    });

    it("should pre-fill the textareas with existing metadata values", () => {
      const data = baseData(en, {
        cautionMessage: "Be careful",
        welshCautionMessage: "Byddwch yn ofalus",
        noListMessage: "No list today",
        welshNoListMessage: "Dim rhestr heddiw",
        hasExistingMetadata: true
      });

      const { $ } = render(env, TEMPLATE, data);

      expect($("textarea#cautionMessage").val()).toBe("Be careful");
      expect($("textarea#welshCautionMessage").val()).toBe("Byddwch yn ofalus");
      expect($("textarea#noListMessage").val()).toBe("No list today");
      expect($("textarea#welshNoListMessage").val()).toBe("Dim rhestr heddiw");
    });

    it("should render only the create button when there is no existing metadata", () => {
      const data = baseData(en, { hasExistingMetadata: false });

      const { $ } = render(env, TEMPLATE, data);

      expect($("form").attr("method")).toBe("post");
      const buttonValues = $("button[name='action']")
        .map((_, el) => $(el).attr("value"))
        .get();
      expect(buttonValues).toEqual(["create"]);
      expect($("button[name='action'][value='create']").text().trim()).toBe(en.createButtonText);
    });

    it("should render update and delete buttons when metadata already exists", () => {
      const data = baseData(en, { hasExistingMetadata: true });

      const { $ } = render(env, TEMPLATE, data);

      const buttonValues = $("button[name='action']")
        .map((_, el) => $(el).attr("value"))
        .get();
      expect(buttonValues).toEqual(["update", "delete"]);
      expect($("button[name='action'][value='update']").text().trim()).toBe(en.updateButtonText);
      expect($("button[name='action'][value='delete']").text().trim()).toBe(en.deleteButtonText);
    });

    it("should not render an error summary when there are no errors", () => {
      const data = baseData(en);

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render an error summary when a validation error exists", () => {
      const data = baseData(en, {
        errors: [{ text: en.atLeastOneMessageRequired, href: "#cautionMessage" }]
      });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.atLeastOneMessageRequired]);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and message labels", () => {
      const data = baseData(cy, { locationName: WELSH_LOCATION_NAME });

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-l").text().trim()).toBe(`${cy.heading} ${WELSH_LOCATION_NAME}`);
      const labels = $("label.govuk-label--m")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(labels).toContain(cy.cautionMessageLabel);
      expect(labels).toContain(cy.welshNoListMessageLabel);
    });

    it("should render the Welsh create button", () => {
      const data = baseData(cy, { locationName: WELSH_LOCATION_NAME });

      const { $ } = render(env, TEMPLATE, data);

      expect($("button[name='action'][value='create']").text().trim()).toBe(cy.createButtonText);
    });

    it("should render the Welsh error summary", () => {
      const data = baseData(cy, {
        locationName: WELSH_LOCATION_NAME,
        errors: [{ text: cy.atLeastOneMessageRequired, href: "#cautionMessage" }]
      });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.atLeastOneMessageRequired]);
    });
  });

  describe("Empty form errors", () => {
    it("should list the five agreed messages in the error summary in order", () => {
      const { $ } = render(env, TEMPLATE, baseData(en, emptyFormErrors(en)));

      assertErrorSummary($, [
        "Enter at least one message",
        "Enter English caution message",
        "Enter Welsh caution message",
        "Enter English no list message",
        "Enter Welsh no list message"
      ]);
      const links = $(".govuk-error-summary__list a")
        .map((_, el) => ({ text: $(el).text().trim(), href: $(el).attr("href") }))
        .get();
      expect(links.map((link) => link.href)).toEqual(["#cautionMessage", "#cautionMessage", "#welshCautionMessage", "#noListMessage", "#welshNoListMessage"]);
      expect($(".govuk-error-summary__title").text().trim()).toBe(en.errorSummaryTitle);
    });

    it("should link every summary item to an existing textarea", () => {
      const { $ } = render(env, TEMPLATE, baseData(en, emptyFormErrors(en)));

      $(".govuk-error-summary__list a").each((_, el) => {
        expect($(`textarea${$(el).attr("href")}`)).toHaveLength(1);
      });
    });

    it("should show each required message inline under its own field and link it with aria-describedby", () => {
      const { $ } = render(env, TEMPLATE, baseData(en, emptyFormErrors(en)));

      for (const field of FIELDS) {
        const errorMessage = $(`#${field.id}-error`);
        expect(errorMessage).toHaveLength(1);
        expect(errorMessage.text()).toContain(en[field.requiredKey]);
        expect(errorMessage.closest(".govuk-form-group").find(`textarea#${field.id}`)).toHaveLength(1);
        expect($(`textarea#${field.id}`).attr("aria-describedby")).toContain(`${field.id}-error`);
        expect($(`textarea#${field.id}`).hasClass("govuk-textarea--error")).toBe(true);
      }
      expect($(".govuk-error-message")).toHaveLength(4);
    });

    it("should show an HTML tag error only on the affected field", () => {
      const tagError = en.htmlTagsNotAllowed(en.noListMessageLabel, ["script"]);
      const { $ } = render(
        env,
        TEMPLATE,
        baseData(en, { errors: [{ text: tagError, href: "#noListMessage" }], fieldErrors: { noListMessage: { text: tagError } } })
      );

      expect($("#noListMessage-error").text()).toContain(tagError);
      expect($(".govuk-error-message")).toHaveLength(1);
      expect($("textarea#cautionMessage").attr("aria-describedby")).toBeUndefined();
    });

    it("should not show inline errors for a summary-only error", () => {
      const { $ } = render(env, TEMPLATE, baseData(en, { errors: [{ text: "Database error", href: "#cautionMessage" }] }));

      assertErrorSummary($, ["Database error"]);
      expect($(".govuk-error-message")).toHaveLength(0);
    });

    it("should render the five messages in Welsh", () => {
      const { $ } = render(env, TEMPLATE, baseData(cy, emptyFormErrors(cy)));

      assertErrorSummary($, [cy.atLeastOneMessageRequired, ...FIELDS.map((field) => cy[field.requiredKey])]);
      expect($("#welshCautionMessage-error").text()).toContain(cy.welshCautionMessageRequired);
    });
  });

  describe("Locale files", () => {
    it("should have matching keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });
  });
});
