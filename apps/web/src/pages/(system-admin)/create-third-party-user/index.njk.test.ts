import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/create-third-party-user/index.njk";

const buildData = (content: typeof en, overrides: Record<string, unknown> = {}) => ({
  ...content,
  errors: undefined,
  name: "",
  ...overrides
});

describe("create-third-party-user template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.pageTitle);
    });

    it("should render the name input with its label", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("input#name")).toHaveLength(1);
      expect($('label[for="name"]').text().trim()).toContain(en.nameLabel);
    });

    it("should render the continue button", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("button.govuk-button").text()).toContain(en.continueButtonText);
    });

    it("should preserve the submitted name value in the input", () => {
      const data = buildData(en, { name: "Test User" });

      const { $ } = render(env, TEMPLATE, data);

      expect($("input#name").attr("value")).toBe("Test User");
    });

    it("should not render an error summary when there are no errors", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading, label and button", () => {
      const data = buildData(cy);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.pageTitle);
      expect($('label[for="name"]').text().trim()).toContain(cy.nameLabel);
      expect($("button.govuk-button").text()).toContain(cy.continueButtonText);
    });
  });

  describe("Error states", () => {
    it("should render the error summary and inline field message", () => {
      const errors = [{ text: en.nameRequired, href: "#name" }];
      const data = buildData(en, { errors });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.nameRequired]);
      expect($("#name-error").text()).toContain(en.nameRequired);
    });
  });
});
