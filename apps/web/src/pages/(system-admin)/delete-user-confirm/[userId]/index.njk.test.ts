import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/delete-user-confirm/[userId]/index.njk";
const USER = { id: "user-123", email: "person@example.com" };

describe("delete-user-confirm/[userId] template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the page heading with the user email", () => {
      const data = { ...en, user: USER, lng: "" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-xl").text().trim()).toBe(en.pageTitle(USER.email));
    });

    it("should render both radio options within a post form", () => {
      const data = { ...en, user: USER, lng: "" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("form").attr("method")).toBe("post");
      const radios = $("input[type='radio'][name='confirmation']");
      expect(radios).toHaveLength(2);
      const radioValues = radios.map((_, el) => $(el).attr("value")).get();
      expect(radioValues).toEqual(["yes", "no"]);
    });

    it("should render the yes and no option labels", () => {
      const data = { ...en, user: USER, lng: "" };

      const { $ } = render(env, TEMPLATE, data);

      const labels = $("label.govuk-radios__label")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(labels).toContain(en.yesOption);
      expect(labels).toContain(en.noOption);
    });

    it("should render the continue button", () => {
      const data = { ...en, user: USER, lng: "" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("button.govuk-button").text().trim()).toBe(en.continueButton);
    });

    it("should not render an error summary when there are no errors", () => {
      const data = { ...en, user: USER, lng: "" };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render an error summary when a validation error exists", () => {
      const errorText = "Select yes if you want to delete this user";
      const data = {
        ...en,
        user: USER,
        lng: "",
        errors: [{ text: errorText, href: "#confirmation" }]
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [errorText]);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and controls", () => {
      const data = { ...cy, user: USER, lng: "cy" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-xl").text().trim()).toBe(cy.pageTitle(USER.email));
      expect($("button.govuk-button").text().trim()).toBe(cy.continueButton);
      const labels = $("label.govuk-radios__label")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(labels).toContain(cy.yesOption);
      expect(labels).toContain(cy.noOption);
    });

    it("should render the Welsh error summary", () => {
      const errorText = "Dewiswch ydw os ydych am ddileu'r defnyddiwr hwn";
      const data = {
        ...cy,
        user: USER,
        lng: "cy",
        errors: [{ text: errorText, href: "#confirmation" }]
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [errorText]);
    });
  });
});
