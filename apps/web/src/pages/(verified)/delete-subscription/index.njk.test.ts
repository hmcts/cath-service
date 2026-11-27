import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/delete-subscription/index.njk";
const SUBSCRIPTION_ID = "550e8400-e29b-41d4-a716-446655440000";

function buildData(content: typeof en | typeof cy = en, overrides: Record<string, unknown> = {}) {
  return { ...content, subscriptionId: SUBSCRIPTION_ID, csrfToken: "csrf-token", ...overrides };
}

function buildErrors(content: typeof en | typeof cy = en) {
  return {
    errors: {
      titleText: content.errorSummaryTitle,
      errorList: [{ text: content.errorNoSelection, href: "#unsubscribe-confirm" }]
    }
  };
}

describe("delete-subscription template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the question as the h1 inside the fieldset legend", () => {
      const { $ } = render(env, TEMPLATE, buildData());

      const legendHeading = $("fieldset.govuk-fieldset legend.govuk-fieldset__legend--l h1.govuk-fieldset__heading");
      expect(legendHeading).toHaveLength(1);
      expect(legendHeading.text().trim()).toBe(en.header);
      expect($("h1")).toHaveLength(1);
    });

    it("should wrap both radio options in the fieldset", () => {
      const { $ } = render(env, TEMPLATE, buildData());

      expect($("fieldset.govuk-fieldset")).toHaveLength(1);
      expect($("fieldset.govuk-fieldset input[name='unsubscribe-confirm']")).toHaveLength(2);
    });

    it("should render both radio options and continue button", () => {
      const { $ } = render(env, TEMPLATE, buildData());

      const radios = $('input[name="unsubscribe-confirm"]');
      expect(radios).toHaveLength(2);
      expect(radios.eq(0).attr("value")).toBe("yes");
      expect(radios.eq(1).attr("value")).toBe("no");
      expect(
        $(`label[for="${radios.eq(0).attr("id")}"]`)
          .text()
          .trim()
      ).toBe(en.radio1);
      expect(
        $(`label[for="${radios.eq(1).attr("id")}"]`)
          .text()
          .trim()
      ).toBe(en.radio2);
      expect($("button.govuk-button").text()).toContain(en.continueButton);
    });

    it("should render the hidden subscription and csrf inputs", () => {
      const { $ } = render(env, TEMPLATE, buildData());

      expect($('input[name="subscription"]').attr("value")).toBe(SUBSCRIPTION_ID);
      expect($('input[name="_csrf"]').attr("value")).toBe("csrf-token");
      expect($("form").attr("action")).toBe("/delete-subscription");
    });

    it("should use the standard two-thirds grid layout", () => {
      const { $ } = render(env, TEMPLATE, buildData());

      expect($(".govuk-grid-row .govuk-grid-column-two-thirds form#delete-subscription-form")).toHaveLength(1);
      expect($(".parent-box")).toHaveLength(0);
    });

    it("should not render an error summary, inline error or Error title prefix when there are no errors", () => {
      const { $ } = render(env, TEMPLATE, buildData());

      assertNoErrors($);
      expect($(".govuk-error-message")).toHaveLength(0);
      expect($(".govuk-form-group--error")).toHaveLength(0);
      expect($("title").text().trim().startsWith("Error:")).toBe(false);
    });

    it("should not include an inline validation script", () => {
      const { $ } = render(env, TEMPLATE, buildData(en, buildErrors()));

      const inlineScripts = $("script")
        .map((_, el) => $(el).html() ?? "")
        .get()
        .filter((source) => source.includes("unsubscribe-confirm"));
      expect(inlineScripts).toHaveLength(0);
    });
  });

  describe("error state", () => {
    it("should render the error summary with a link to the first radio option", () => {
      const { $ } = render(env, TEMPLATE, buildData(en, buildErrors()));

      assertErrorSummary($, [en.errorNoSelection]);
      const summaryHref = $(".govuk-error-summary__list a").attr("href");
      const firstRadioId = $("input.govuk-radios__input").first().attr("id");
      expect(summaryHref).toBe(`#${firstRadioId}`);
    });

    it("should render the inline error inside the fieldset, after the legend and before the radios", () => {
      const { $ } = render(env, TEMPLATE, buildData(en, buildErrors()));

      const errorMessage = $("fieldset.govuk-fieldset > .govuk-error-message");
      expect(errorMessage).toHaveLength(1);
      expect(errorMessage.text()).toContain(en.errorNoSelection);
      expect(errorMessage.prevAll("legend")).toHaveLength(1);
      expect(errorMessage.nextAll(".govuk-radios")).toHaveLength(1);
      expect($(".govuk-radios__item .govuk-error-message")).toHaveLength(0);
    });

    it("should mark the form group as errored and describe the fieldset with the error", () => {
      const { $ } = render(env, TEMPLATE, buildData(en, buildErrors()));

      expect($(".govuk-form-group.govuk-form-group--error fieldset.govuk-fieldset")).toHaveLength(1);
      const errorId = $(".govuk-error-message").attr("id");
      expect($("fieldset.govuk-fieldset").attr("aria-describedby")).toContain(errorId);
    });

    it("should prefix the page title with Error:", () => {
      const { $ } = render(env, TEMPLATE, buildData(en, buildErrors()));

      expect($("title").text().trim().startsWith(`Error: ${en.title}`)).toBe(true);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh question in the legend and Welsh options", () => {
      const { $ } = render(env, TEMPLATE, buildData(cy));

      expect($("legend h1.govuk-fieldset__heading").text().trim()).toBe(cy.header);
      const radios = $('input[name="unsubscribe-confirm"]');
      expect(
        $(`label[for="${radios.eq(0).attr("id")}"]`)
          .text()
          .trim()
      ).toBe(cy.radio1);
      expect(
        $(`label[for="${radios.eq(1).attr("id")}"]`)
          .text()
          .trim()
      ).toBe(cy.radio2);
      expect($("button.govuk-button").text()).toContain(cy.continueButton);
    });

    it("should render the Welsh error summary and inline error", () => {
      const { $ } = render(env, TEMPLATE, buildData(cy, buildErrors(cy)));

      assertErrorSummary($, [cy.errorNoSelection]);
      expect($(".govuk-error-summary__title").text().trim()).toBe(cy.errorSummaryTitle);
      expect($("fieldset .govuk-error-message").text()).toContain(cy.errorNoSelection);
    });
  });

  it("should have matching English and Welsh content keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
  });
});
