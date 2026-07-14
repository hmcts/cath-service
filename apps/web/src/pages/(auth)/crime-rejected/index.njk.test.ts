import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(auth)/crime-rejected/index.njk";

describe("crime-rejected template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading and body content", () => {
      const data = { en, cy, t: en };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.title);
      expect($("h2").text()).toContain(en.whatYouCanDo);
      expect($.root().text()).toContain(en.message);
      expect($.root().text()).toContain(en.contactSupport);
    });

    it("should render the return to sign in link", () => {
      const data = { en, cy, t: en };

      const { $ } = render(env, TEMPLATE, data);

      const link = $(`a[href="/sign-in"]:contains("${en.returnToSignIn}")`);
      expect(link.length).toBe(1);
      expect(link.text()).toContain(en.returnToSignIn);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading and body content", () => {
      const data = { en, cy, t: cy };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.title);
      expect($("h2").text()).toContain(cy.whatYouCanDo);
      expect($.root().text()).toContain(cy.message);
      expect($(`a[href="/sign-in"]:contains("${cy.returnToSignIn}")`).text()).toContain(cy.returnToSignIn);
    });
  });
});
