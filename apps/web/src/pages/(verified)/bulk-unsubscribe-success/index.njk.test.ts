import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/bulk-unsubscribe-success/index.njk";

describe("bulk-unsubscribe-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the confirmation panel heading", () => {
      // Arrange
      const data = { ...en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel--confirmation .govuk-panel__title").text()).toContain(en.successHeading);
    });

    it("should render the intro text", () => {
      // Arrange
      const data = { ...en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("p.govuk-body").text()).toContain(en.successIntro);
    });

    it("should render the three next-step links with correct hrefs", () => {
      // Arrange
      const data = { ...en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(`a[href="${en.linkAddSubscription}"]`).text()).toContain(en.successLinkAddSubscription);
      expect($(`a[href="${en.linkManageSubscriptions}"]`).text()).toContain(en.successLinkManageSubscriptions);
      expect($(`a[href="${en.linkFindCourt}"]`).text()).toContain(en.successLinkFindCourt);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh confirmation heading and links", () => {
      // Arrange
      const data = { ...cy };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel--confirmation .govuk-panel__title").text()).toContain(cy.successHeading);
      expect($("p.govuk-body").text()).toContain(cy.successIntro);
      expect($(`a[href="${cy.linkAddSubscription}"]`).text()).toContain(cy.successLinkAddSubscription);
      expect($(`a[href="${cy.linkManageSubscriptions}"]`).text()).toContain(cy.successLinkManageSubscriptions);
      expect($(`a[href="${cy.linkFindCourt}"]`).text()).toContain(cy.successLinkFindCourt);
    });
  });
});
