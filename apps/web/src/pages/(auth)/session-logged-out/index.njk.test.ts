import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(auth)/session-logged-out/index.njk";

describe("session-logged-out template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the sign out confirmation panel", () => {
      const data = { en, cy, title: en.title };

      const { $ } = render(env, TEMPLATE, data);

      const panel = $(".govuk-panel--confirmation");
      expect(panel).toHaveLength(1);
      expect(panel.find(".govuk-panel__title").text()).toContain(en.title);
    });

    it("should not render a back link", () => {
      const data = { en, cy, title: en.title };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-back-link")).toHaveLength(0);
    });

    it("should not render an error summary", () => {
      const data = { en, cy, title: en.title };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render the sign out confirmation panel in Welsh", () => {
      const data = { en, cy, title: cy.title };

      const { $ } = render(env, TEMPLATE, data);

      const panel = $(".govuk-panel--confirmation");
      expect(panel).toHaveLength(1);
      expect(panel.find(".govuk-panel__title").text()).toContain(cy.title);
    });
  });
});
