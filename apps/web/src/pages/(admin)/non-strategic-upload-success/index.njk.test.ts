import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(admin)/non-strategic-upload-success/index.njk";

describe("non-strategic-upload-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the success panel with title and uploaded message", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      const panel = $(".govuk-panel");
      expect(panel.find(".govuk-panel__title").text()).toContain(en.title);
      expect(panel.find(".govuk-panel__body").text()).toContain(en.uploadedMessage);
    });

    it("should render the next steps heading and navigation links", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h2").text()).toContain(en.nextStepsHeading);
      expect($('a[href="/non-strategic-upload"]').text()).toContain(en.uploadAnotherLink);
      expect($('a[href="/remove-list-search"]').text()).toContain(en.removeFileLink);
      expect($('a[href="/admin-dashboard"]').text()).toContain(en.homeLink);
    });

    it("should not render an error summary", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render the success panel and links in Welsh", () => {
      const data = { ...cy };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-panel__title").text()).toContain(cy.title);
      expect($(".govuk-panel__body").text()).toContain(cy.uploadedMessage);
      expect($("h2").text()).toContain(cy.nextStepsHeading);
      expect($('a[href="/non-strategic-upload"]').text()).toContain(cy.uploadAnotherLink);
      expect($('a[href="/remove-list-search"]').text()).toContain(cy.removeFileLink);
      expect($('a[href="/admin-dashboard"]').text()).toContain(cy.homeLink);
    });
  });
});
