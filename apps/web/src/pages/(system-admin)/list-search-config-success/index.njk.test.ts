import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/list-search-config-success/index.njk";

describe("list-search-config-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the confirmation panel heading", () => {
      const data = {
        pageTitle: en.pageTitle,
        heading: en.heading,
        body: en.body,
        returnLink: en.returnLink
      };

      const { $ } = render(env, TEMPLATE, data);

      const panelHeading = $(".govuk-panel--confirmation .govuk-panel__title");
      expect(panelHeading.text().trim()).toBe(en.heading);
    });

    it("should render the body text", () => {
      const data = { heading: en.heading, body: en.body, returnLink: en.returnLink };

      const { $ } = render(env, TEMPLATE, data);

      expect($("body").text()).toContain(en.body);
    });

    it("should render the return link pointing to manage-list-types", () => {
      const data = { heading: en.heading, body: en.body, returnLink: en.returnLink };

      const { $ } = render(env, TEMPLATE, data);

      const link = $('a[href="/manage-list-types"]');
      expect(link.length).toBe(1);
      expect(link.text().trim()).toBe(en.returnLink);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading, body and return link", () => {
      const data = {
        pageTitle: cy.pageTitle,
        heading: cy.heading,
        body: cy.body,
        returnLink: cy.returnLink
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-panel__title").text().trim()).toBe(cy.heading);
      expect($("body").text()).toContain(cy.body);
      expect($('a[href="/manage-list-types"]').text().trim()).toBe(cy.returnLink);
    });
  });
});
