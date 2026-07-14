import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("session-expired template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the heading in the confirmation panel", () => {
      const data = {
        pageTitle: en.pageTitle,
        heading: en.heading,
        bodyText: en.bodyText,
        signInAgainLink: en.signInAgainLink
      };

      const { $ } = render(env, "(auth)/session-expired/index.njk", data);

      const panel = $(".govuk-panel--confirmation");
      expect(panel.length).toBe(1);
      expect(panel.find("h1").text()).toContain(en.heading);
    });

    it("should render the body text", () => {
      const data = {
        pageTitle: en.pageTitle,
        heading: en.heading,
        bodyText: en.bodyText,
        signInAgainLink: en.signInAgainLink
      };

      const { $ } = render(env, "(auth)/session-expired/index.njk", data);

      expect($("body").text()).toContain(en.bodyText);
    });

    it("should render the sign in again link pointing to /sign-in", () => {
      const data = {
        pageTitle: en.pageTitle,
        heading: en.heading,
        bodyText: en.bodyText,
        signInAgainLink: en.signInAgainLink
      };

      const { $ } = render(env, "(auth)/session-expired/index.njk", data);

      const link = $('.govuk-grid-row a[href="/sign-in"]');
      expect(link.length).toBe(1);
      expect(link.text()).toContain(en.signInAgainLink);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading, body text and link", () => {
      const data = {
        pageTitle: cy.pageTitle,
        heading: cy.heading,
        bodyText: cy.bodyText,
        signInAgainLink: cy.signInAgainLink
      };

      const { $ } = render(env, "(auth)/session-expired/index.njk", data);

      expect($(".govuk-panel--confirmation h1").text()).toContain(cy.heading);
      expect($("body").text()).toContain(cy.bodyText);
      expect($('.govuk-grid-row a[href="/sign-in"]').text()).toContain(cy.signInAgainLink);
    });
  });
});
