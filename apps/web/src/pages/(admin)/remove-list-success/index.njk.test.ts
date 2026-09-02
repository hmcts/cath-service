import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildData = (t: typeof en, locale: "en" | "cy") => ({
  pageTitle: t.pageTitle,
  heading: t.heading,
  message: t.message,
  nextSteps: t.nextSteps,
  removeAnotherLink: t.removeAnotherLink,
  uploadFileLink: t.uploadFileLink,
  homeLink: t.homeLink,
  locale
});

describe("remove-list-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // pages directory
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts
    ]);
  });

  describe("English content", () => {
    it("should render the confirmation panel heading and message", () => {
      const data = buildData(en, "en");

      const { $ } = render(env, "(admin)/remove-list-success/index.njk", data);

      const panel = $(".govuk-panel--confirmation");
      expect(panel).toHaveLength(1);
      expect($(".govuk-panel__title").text().trim()).toBe(en.heading);
      expect($(".govuk-panel__body").text().trim()).toBe(en.message);
    });

    it("should render the next steps prompt", () => {
      const data = buildData(en, "en");

      const { $ } = render(env, "(admin)/remove-list-success/index.njk", data);

      expect($("p.govuk-body").first().text().trim()).toBe(en.nextSteps);
    });

    it("should render all three navigation links with default hrefs", () => {
      const data = buildData(en, "en");

      const { $ } = render(env, "(admin)/remove-list-success/index.njk", data);

      const removeLink = $('a[href="/remove-list-search"]');
      expect(removeLink).toHaveLength(1);
      expect(removeLink.text().trim()).toBe(en.removeAnotherLink);

      const uploadLink = $('a[href="/manual-upload"]');
      expect(uploadLink).toHaveLength(1);
      expect(uploadLink.text().trim()).toBe(en.uploadFileLink);

      const homeLink = $('a[href="/admin-dashboard"]');
      expect(homeLink).toHaveLength(1);
      expect(homeLink.text().trim()).toBe(en.homeLink);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh panel and prompt", () => {
      const data = buildData(cy, "cy");

      const { $ } = render(env, "(admin)/remove-list-success/index.njk", data);

      expect($(".govuk-panel__title").text().trim()).toBe(cy.heading);
      expect($(".govuk-panel__body").text().trim()).toBe(cy.message);
      expect($("p.govuk-body").first().text().trim()).toBe(cy.nextSteps);
    });

    it("should append lng=cy to all navigation links when locale is Welsh", () => {
      const data = buildData(cy, "cy");

      const { $ } = render(env, "(admin)/remove-list-success/index.njk", data);

      const removeLink = $('a[href="/remove-list-search?lng=cy"]');
      expect(removeLink).toHaveLength(1);
      expect(removeLink.text().trim()).toBe(cy.removeAnotherLink);

      const uploadLink = $('a[href="/manual-upload?lng=cy"]');
      expect(uploadLink).toHaveLength(1);
      expect(uploadLink.text().trim()).toBe(cy.uploadFileLink);

      const homeLink = $('a[href="/admin-dashboard?lng=cy"]');
      expect(homeLink).toHaveLength(1);
      expect(homeLink.text().trim()).toBe(cy.homeLink);
    });
  });
});
