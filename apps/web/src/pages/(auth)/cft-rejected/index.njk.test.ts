import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("cft-rejected template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the heading, message and sign in link", () => {
      const data = { ...en };

      const { $ } = render(env, "(auth)/cft-rejected/index.njk", data);

      expect($("h1").text()).toContain(en.title);
      expect($("h2").text()).toContain(en.whatYouCanDo);
      expect($.root().text()).toContain(en.message);
      expect($.root().text()).toContain(en.contactSupport);

      const signInLink = $('a[href="/sign-in"]');
      expect(signInLink.text()).toContain(en.returnToSignIn);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading, message and sign in link", () => {
      const data = { ...cy };

      const { $ } = render(env, "(auth)/cft-rejected/index.njk", data);

      expect($("h1").text()).toContain(cy.title);
      expect($("h2").text()).toContain(cy.whatYouCanDo);
      expect($.root().text()).toContain(cy.message);
      expect($.root().text()).toContain(cy.contactSupport);

      const signInLink = $('a[href="/sign-in"]');
      expect(signInLink.text()).toContain(cy.returnToSignIn);
    });
  });
});
