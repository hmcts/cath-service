import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(auth)/sso-rejected/index.njk";

const SERVICE_NOW_HREF = "https://mojprod.service-now.com/serviceportal";

describe("sso-rejected template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading and paragraph", () => {
      const data = { en, cy, ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.header);
      expect($.root().text()).toContain(en.paragraph1);
    });

    it("should render the ServiceNow link", () => {
      const data = { en, cy, ...en };

      const { $ } = render(env, TEMPLATE, data);

      const link = $(`a[href="${SERVICE_NOW_HREF}"]`);
      expect(link.length).toBe(1);
      expect(link.text()).toContain(en.linkText);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading and paragraph", () => {
      const data = { en, cy, ...cy };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.header);
      expect($.root().text()).toContain(cy.paragraph1);
    });

    it("should render the ServiceNow link in Welsh", () => {
      const data = { en, cy, ...cy };

      const { $ } = render(env, TEMPLATE, data);

      const link = $(`a[href="${SERVICE_NOW_HREF}"]`);
      expect(link.length).toBe(1);
      expect(link.text()).toContain(cy.linkText);
    });
  });
});
