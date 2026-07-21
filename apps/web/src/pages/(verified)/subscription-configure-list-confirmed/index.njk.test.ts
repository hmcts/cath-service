import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/subscription-configure-list-confirmed/index.njk";

describe("subscription-configure-list-confirmed template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the confirmation panel title", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-panel--confirmation .govuk-panel__title").text()).toContain(en.panelTitle);
    });

    it("should render the continue text with the your-account link", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($("p.govuk-body").text()).toContain(en.continueText);
      expect($('a[href="/account-home"]').text()).toContain(en.yourAccountLink);
    });

    it("should render the four next-step links with correct hrefs", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($('a[href="/add-email-subscription"]').text()).toContain(en.addNewSubscriptionLink);
      expect($('a[href="/subscription-management"]').text()).toContain(en.manageSubscriptionsLink);
      expect($('a[href="/search"]').text()).toContain(en.findCourtLink);
      expect($('a[href="/subscription-configure-list"]').text()).toContain(en.selectListTypeLink);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh panel title and next-step links", () => {
      const data = { ...cy };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-panel--confirmation .govuk-panel__title").text()).toContain(cy.panelTitle);
      expect($('a[href="/account-home"]').text()).toContain(cy.yourAccountLink);
      expect($('a[href="/add-email-subscription"]').text()).toContain(cy.addNewSubscriptionLink);
      expect($('a[href="/subscription-management"]').text()).toContain(cy.manageSubscriptionsLink);
      expect($('a[href="/search"]').text()).toContain(cy.findCourtLink);
      expect($('a[href="/subscription-configure-list"]').text()).toContain(cy.selectListTypeLink);
    });
  });
});
