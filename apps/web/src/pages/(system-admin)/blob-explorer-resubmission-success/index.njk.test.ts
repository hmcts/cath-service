import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/blob-explorer-resubmission-success/index.njk";

describe("blob-explorer-resubmission-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the success panel with title and banner", () => {
      const data = { ...en, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      const panel = $(".govuk-panel--confirmation");
      expect(panel).toHaveLength(1);
      expect(panel.find(".govuk-panel__title").text()).toContain(en.successTitle);
      expect(panel.find(".govuk-panel__body").text()).toContain(en.successBanner);
    });

    it("should render the next steps text and link to locations", () => {
      const data = { ...en, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("body").text()).toContain(en.successNextSteps);
      const link = $('a[href="/blob-explorer-locations"]');
      expect(link).toHaveLength(1);
      expect(link.text()).toContain(en.successLinkToLocations);
    });

    it("should not render an error summary", () => {
      const data = { ...en, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render the success panel with Welsh title and banner", () => {
      const data = { ...cy, locale: "cy" };

      const { $ } = render(env, TEMPLATE, data);

      const panel = $(".govuk-panel--confirmation");
      expect(panel).toHaveLength(1);
      expect(panel.find(".govuk-panel__title").text()).toContain(cy.successTitle);
      expect(panel.find(".govuk-panel__body").text()).toContain(cy.successBanner);
    });

    it("should render the Welsh next steps text and link to locations", () => {
      const data = { ...cy, locale: "cy" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("body").text()).toContain(cy.successNextSteps);
      const link = $('a[href="/blob-explorer-locations"]');
      expect(link).toHaveLength(1);
      expect(link.text()).toContain(cy.successLinkToLocations);
    });
  });
});
