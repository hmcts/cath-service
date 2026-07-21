import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/reference-data-upload-confirmation/index.njk";

describe("reference-data-upload-confirmation template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the success panel with title and message", () => {
      const data = { ...en, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      const panel = $(".govuk-panel");
      expect(panel.find(".govuk-panel__title").text()).toContain(en.successBannerTitle);
      expect(panel.find(".govuk-panel__body").text()).toContain(en.successBannerMessage);
    });

    it("should render the next steps heading", () => {
      const data = { ...en, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("p.govuk-body").text()).toContain(en.nextStepsTitle);
    });

    it("should render the upload another file link", () => {
      const data = { ...en, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      const link = $('a[href="/reference-data-upload"]');
      expect(link.text()).toContain(en.uploadAnotherFileText);
    });

    it("should render the home link to the system admin dashboard", () => {
      const data = { ...en, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      const link = $('a[href="/system-admin-dashboard"]');
      expect(link.text()).toContain(en.homeText);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh panel content", () => {
      const data = { ...cy, locale: "cy" };

      const { $ } = render(env, TEMPLATE, data);

      const panel = $(".govuk-panel");
      expect(panel.find(".govuk-panel__title").text()).toContain(cy.successBannerTitle);
      expect(panel.find(".govuk-panel__body").text()).toContain(cy.successBannerMessage);
    });

    it("should render Welsh link text", () => {
      const data = { ...cy, locale: "cy" };

      const { $ } = render(env, TEMPLATE, data);

      expect($('a[href="/reference-data-upload"]').text()).toContain(cy.uploadAnotherFileText);
      expect($('a[href="/system-admin-dashboard"]').text()).toContain(cy.homeText);
    });
  });
});
