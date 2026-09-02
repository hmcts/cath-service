import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/third-party-user-created/index.njk";

describe("third-party-user-created template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the confirmation panel with title and user name", () => {
      const data = { ...en, userName: "Acme Ltd" };

      const { $ } = render(env, TEMPLATE, data);

      const panel = $(".govuk-panel");
      expect(panel.find(".govuk-panel__title").text()).toContain(en.pageTitle);
      expect(panel.find(".govuk-panel__body").text()).toContain("Acme Ltd");
    });

    it("should render the what next heading and navigation links", () => {
      const data = { ...en, userName: "Acme Ltd" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h2").text()).toContain(en.whatNextHeading);
      expect($('a[href="/manage-third-party-users"]').text()).toContain(en.manageAnotherUserLink);
      expect($('a[href="/system-admin-dashboard"]').text()).toContain(en.homeLink);
    });

    it("should not render an error summary", () => {
      const data = { ...en, userName: "Acme Ltd" };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render the confirmation panel, heading and links in Welsh with Welsh link hrefs", () => {
      const data = { ...cy, userName: "Acme Ltd", locale: "cy" };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-panel__title").text()).toContain(cy.pageTitle);
      expect($(".govuk-panel__body").text()).toContain("Acme Ltd");
      expect($("h2").text()).toContain(cy.whatNextHeading);
      expect($('a[href="/manage-third-party-users?lng=cy"]').text()).toContain(cy.manageAnotherUserLink);
      expect($('a[href="/system-admin-dashboard?lng=cy"]').text()).toContain(cy.homeLink);
    });
  });
});
