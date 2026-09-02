import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/create-third-party-user-summary/index.njk";

describe("create-third-party-user-summary template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the heading, summary row and confirm button", () => {
      const data = { ...en, name: "Test User", locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.pageTitle);
      expect($(".govuk-summary-list__key").text()).toContain(en.nameLabel);
      expect($(".govuk-summary-list__value").text()).toContain("Test User");
      expect($('a[href="/create-third-party-user"]').text()).toContain(en.changeLink);
      expect($("form[method='post'] button").text()).toContain(en.confirmButtonText);
      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh text and append the language query to the change link", () => {
      const data = { ...cy, name: "Test User", lng: "cy", locale: "cy" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.pageTitle);
      expect($(".govuk-summary-list__key").text()).toContain(cy.nameLabel);
      expect($('a[href="/create-third-party-user?lng=cy"]').text()).toContain(cy.changeLink);
      expect($("form[method='post'] button").text()).toContain(cy.confirmButtonText);
    });
  });
});
