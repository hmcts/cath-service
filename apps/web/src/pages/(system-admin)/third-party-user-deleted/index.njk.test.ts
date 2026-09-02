import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/third-party-user-deleted/index.njk";

describe("third-party-user-deleted template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the success panel with title and message", () => {
      const data = { ...en, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-panel__title").text()).toContain(en.pageTitle);
      expect($(".govuk-panel__body").text()).toContain(en.successMessage);
    });

    it("should render the what-next heading and English next-step links", () => {
      const data = { ...en, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h2").text()).toContain(en.whatNextHeading);
      expect($('a[href="/manage-third-party-users"]').text()).toContain(en.manageAnotherUserLink);
      expect($('a[href="/system-admin-dashboard"]').text()).toContain(en.homeLink);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh panel title, message and language-suffixed links", () => {
      const data = { ...cy, locale: "cy" };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-panel__title").text()).toContain(cy.pageTitle);
      expect($(".govuk-panel__body").text()).toContain(cy.successMessage);
      expect($('a[href="/manage-third-party-users?lng=cy"]').text()).toContain(cy.manageAnotherUserLink);
      expect($('a[href="/system-admin-dashboard?lng=cy"]').text()).toContain(cy.homeLink);
    });
  });
});
