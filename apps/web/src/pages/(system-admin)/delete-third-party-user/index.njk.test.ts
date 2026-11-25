import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/delete-third-party-user/index.njk";
const USER_NAME = "Test User";

const DATA = { ...en, userName: USER_NAME, errors: undefined };
const DATA_CY = { ...cy, userName: USER_NAME, errors: undefined };

describe("delete-third-party-user template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the page heading with the user name", () => {
      const data = { ...en, userName: USER_NAME, errors: undefined };

      const { $ } = render(env, TEMPLATE, data);

      expect($("legend.govuk-fieldset__legend--xl h1.govuk-fieldset__heading").text().trim()).toBe(`${en.pageTitle} ${USER_NAME}?`);
    });

    it("should render both radio options within a post form", () => {
      const data = { ...en, userName: USER_NAME, errors: undefined };

      const { $ } = render(env, TEMPLATE, data);

      expect($("form").attr("method")).toBe("post");
      const radios = $("input[type='radio'][name='confirmDelete']");
      expect(radios).toHaveLength(2);
      const radioValues = radios.map((_, el) => $(el).attr("value")).get();
      expect(radioValues).toEqual(["yes", "no"]);
    });

    it("should render the radio option labels", () => {
      const data = { ...en, userName: USER_NAME, errors: undefined };

      const { $ } = render(env, TEMPLATE, data);

      const labels = $("label.govuk-radios__label")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(labels).toEqual([en.yesOption, en.noOption]);
    });

    it("should render the continue button", () => {
      const data = { ...en, userName: USER_NAME, errors: undefined };

      const { $ } = render(env, TEMPLATE, data);

      expect($("button.govuk-button").text().trim()).toBe(en.continueButtonText);
    });

    it("should not render an error summary when there are no errors", () => {
      const data = { ...en, userName: USER_NAME, errors: undefined };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render an error summary when a radio selection error exists", () => {
      const data = {
        ...en,
        userName: USER_NAME,
        errors: [{ text: en.noRadioSelected, href: "#confirm-delete" }]
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.noRadioSelected]);
    });

    it("should render a user not found error summary", () => {
      const data = { ...en, errors: [{ text: en.userNotFound }] };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.userNotFound]);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and controls", () => {
      const data = { ...cy, userName: USER_NAME, errors: undefined };

      const { $ } = render(env, TEMPLATE, data);

      expect($("legend.govuk-fieldset__legend--xl h1.govuk-fieldset__heading").text().trim()).toBe(`${cy.pageTitle} ${USER_NAME}?`);
      expect($("button.govuk-button").text().trim()).toBe(cy.continueButtonText);
      const labels = $("label.govuk-radios__label")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(labels).toEqual([cy.yesOption, cy.noOption]);
    });

    it("should render the Welsh error summary", () => {
      const data = {
        ...cy,
        userName: USER_NAME,
        errors: [{ text: cy.noRadioSelected, href: "#confirm-delete" }]
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.noRadioSelected]);
    });
  });

  describe("fieldset and legend", () => {
    it("should render the question as the only h1, inside the fieldset legend", () => {
      const { $ } = render(env, TEMPLATE, DATA);

      expect($("h1")).toHaveLength(1);
      expect($("fieldset.govuk-fieldset > legend h1.govuk-fieldset__heading").text().trim()).toBe(`${en.pageTitle} ${USER_NAME}?`);
      expect($("legend.govuk-visually-hidden")).toHaveLength(0);
    });

    it("should wrap both radio options in the fieldset", () => {
      const { $ } = render(env, TEMPLATE, DATA);

      expect($("fieldset.govuk-fieldset")).toHaveLength(1);
      expect($("fieldset.govuk-fieldset input[name='confirmDelete']")).toHaveLength(2);
    });

    it("should link the error summary to the first radio option and show the inline error", () => {
      const { $ } = render(env, TEMPLATE, { ...DATA, errors: [{ text: en.noRadioSelected, href: "#confirm-delete" }] });

      const firstRadioId = $("input.govuk-radios__input").first().attr("id");
      expect($(".govuk-error-summary__list a").attr("href")).toBe(`#${firstRadioId}`);
      expect(`#${firstRadioId}`).toBe("#confirm-delete");
      expect($("fieldset.govuk-fieldset .govuk-error-message")).toHaveLength(1);
    });

    it("should render the Welsh question in the legend", () => {
      const { $ } = render(env, TEMPLATE, DATA_CY);

      expect($("legend h1.govuk-fieldset__heading").text().trim()).toBe(`${cy.pageTitle} ${USER_NAME}?`);
    });
  });

  it("should have matching English and Welsh content keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
  });
});
