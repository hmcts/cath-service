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

type Locale = typeof en | typeof cy;
type Action = keyof typeof en.actions;

function buildData(locale: Locale, action: Action) {
  const { actions, ...content } = locale;
  return { ...content, ...actions[action], locale: locale === cy ? "cy" : "en" };
}

describe("blob-explorer-resubmission-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it.each([
      ["resubmit", "Submission re-submitted"],
      ["courtel", "Publication sent to Courtel"],
      ["third-party", "Publication sent to third party subscribers"],
      ["email", "Subscription email sent"]
    ] as const)("should render the %s panel heading with no body text", (action, heading) => {
      const { $ } = render(env, TEMPLATE, buildData(en, action));

      const panel = $(".govuk-panel--confirmation");
      expect(panel).toHaveLength(1);
      expect(panel.find(".govuk-panel__title").text().trim()).toBe(heading);
      expect(panel.find(".govuk-panel__body")).toHaveLength(0);
      expect($("title").text()).toContain(heading);
    });

    it("should render the next steps text and link to locations", () => {
      const { $ } = render(env, TEMPLATE, buildData(en, "courtel"));

      expect($("body").text()).toContain(en.successNextSteps);
      const link = $('a[href="/blob-explorer-locations"]');
      expect(link).toHaveLength(1);
      expect(link.text()).toContain(en.successLinkToLocations);
    });

    it("should not render an error summary", () => {
      const { $ } = render(env, TEMPLATE, buildData(en, "email"));

      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh panel heading", () => {
      const { $ } = render(env, TEMPLATE, buildData(cy, "third-party"));

      expect($(".govuk-panel__title").text().trim()).toBe(cy.actions["third-party"].header);
    });

    it("should render the Welsh next steps text and link to locations", () => {
      const { $ } = render(env, TEMPLATE, buildData(cy, "resubmit"));

      expect($("body").text()).toContain(cy.successNextSteps);
      expect($('a[href="/blob-explorer-locations"]').text()).toContain(cy.successLinkToLocations);
    });
  });

  describe("locale files", () => {
    it("should have the same keys in en and cy", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
      expect(Object.keys(en.actions).sort()).toEqual(Object.keys(cy.actions).sort());
    });
  });
});
