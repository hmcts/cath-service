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

describe("delete-subscription template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the confirmation heading", () => {
      const data = { ...en, subscriptionId: SUBSCRIPTION_ID, csrfToken: "csrf-token" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h2").text()).toContain(en.header);
    });

    it("should render both radio options and continue button", () => {
      const data = { ...en, subscriptionId: SUBSCRIPTION_ID, csrfToken: "csrf-token" };

      const { $ } = render(env, TEMPLATE, data);

      const radios = $('input[name="unsubscribe-confirm"]');
      expect(radios).toHaveLength(2);
      expect(radios.eq(0).attr("value")).toBe("yes");
      expect(radios.eq(1).attr("value")).toBe("no");
      const body = $("body").text();
      expect(body).toContain(en.radio1);
      expect(body).toContain(en.radio2);
      expect($("button").text()).toContain(en.continueButton);
    });

    it("should render the hidden subscription and csrf inputs", () => {
      const data = { ...en, subscriptionId: SUBSCRIPTION_ID, csrfToken: "csrf-token" };

      const { $ } = render(env, TEMPLATE, data);

      expect($('input[name="subscription"]').attr("value")).toBe(SUBSCRIPTION_ID);
      expect($('input[name="_csrf"]').attr("value")).toBe("csrf-token");
      expect($("form").attr("action")).toBe("/delete-subscription");
    });

    it("should not render an error summary when there are no errors", () => {
      const data = { ...en, subscriptionId: SUBSCRIPTION_ID, csrfToken: "csrf-token" };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render an error summary when errors are present", () => {
      const data = {
        ...en,
        subscriptionId: SUBSCRIPTION_ID,
        csrfToken: "csrf-token",
        errors: {
          titleText: en.errorSummaryTitle,
          errorList: [{ text: en.errorNoSelection, href: "#unsubscribe-confirm" }]
        }
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorNoSelection]);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh confirmation heading and options", () => {
      const data = { ...cy, subscriptionId: SUBSCRIPTION_ID, csrfToken: "csrf-token" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h2").text()).toContain(cy.header);
      const body = $("body").text();
      expect(body).toContain(cy.radio1);
      expect(body).toContain(cy.radio2);
      expect($("button").text()).toContain(cy.continueButton);
    });
  });
});
