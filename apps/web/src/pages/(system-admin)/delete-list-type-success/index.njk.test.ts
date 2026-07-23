import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import * as cy from "./cy.js";
import * as en from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/delete-list-type-success/index.njk";

describe("delete-list-type-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the success panel title and banner", () => {
      const data = { t: en };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-panel__title").text()).toContain(en.deleteListType.success.title);
      expect($(".govuk-panel__body").text()).toContain(en.deleteListType.success.banner);
    });

    it("should render the description heading and next-step links", () => {
      const data = { t: en };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h2").text()).toContain(en.deleteListType.success.description);
      expect($('a[href="/manage-list-types"]').text()).toContain(en.deleteListType.success.viewListTypesLink);
      expect($('a[href="/system-admin-dashboard"]').text()).toContain(en.deleteListType.success.returnLink);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh panel title and links", () => {
      const data = { t: cy };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-panel__title").text()).toContain(cy.deleteListType.success.title);
      expect($('a[href="/manage-list-types"]').text()).toContain(cy.deleteListType.success.viewListTypesLink);
      expect($('a[href="/system-admin-dashboard"]').text()).toContain(cy.deleteListType.success.returnLink);
    });
  });
});
